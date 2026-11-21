/**
 * @file usePaymentLink.ts
 * @description Hook for generating shareable Stellar payment requests (SEP-0007 URIs and wallet web links).
 * @package stellar-hooks
 * @license MIT
 */

import { useMemo, useCallback } from "react";
import { StrKey, Networks } from "@stellar/stellar-sdk";
import { useOptionalStellarContext } from "../context";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Describes the payment asset.
 */
export type PaymentLinkAsset =
  | { type: "native" }
  | { type: "credit"; code: string; issuer?: string }
  | string;

export type PaymentLinkMemoType =
  | "text"
  | "id"
  | "hash"
  | "return"
  | "MEMO_TEXT"
  | "MEMO_ID"
  | "MEMO_HASH"
  | "MEMO_RETURN";

export interface UsePaymentLinkOptions {
  /** Recipient Stellar public key (G...), muxed address (M...), or federated address (name*domain.com) */
  recipient?: string;
  /** Alias for recipient */
  destination?: string;
  /** Amount to request (e.g. "10.5" or 10.5) */
  amount?: string | number;
  /** Asset to send. Can be native or credit asset, or code string */
  asset?: PaymentLinkAsset;
  /** Optional asset code if not specified via asset object */
  assetCode?: string;
  /** Optional asset issuer if not specified via asset object */
  assetIssuer?: string;
  /** Optional payment memo */
  memo?: string;
  /** Memo type: "text" | "id" | "hash" | "return" */
  memoType?: PaymentLinkMemoType;
  /** Optional message displayed to the user by compatible wallets (SEP-0007 msg param) */
  message?: string;
  /** Optional callback URL to receive signed transaction info (SEP-0007 callback param) */
  callbackUrl?: string;
  /** Network passphrase (defaults to provider's network passphrase, e.g. Testnet or Public) */
  networkPassphrase?: string;
  /** Custom handler for opening URIs */
  openUri?: (uri: string) => void;
}

export interface UsePaymentLinkReturn {
  /** Standard SEP-0007 URI: web+stellar:pay?... */
  uri: string;
  /** Standard SEP-0007 URI: web+stellar:pay?... */
  sep7Uri: string;
  /** Web URL for Albedo web signer: https://albedo.link/#pay?... */
  albedoUrl: string;
  /** Web link URL for Lobstr: https://lobstr.co/pay?... */
  lobstrUrl: string;
  /** Value suitable for encoding in a QR code (standard SEP-0007 URI) */
  qrValue: string;
  /** Whether the current parameters form a valid payment request */
  isValid: boolean;
  /** List of validation error messages */
  errors: string[];
  /** Open payment link in wallet or browser */
  openInWallet: (target?: "sep7" | "albedo" | "lobstr" | "browser") => void;
  /** Copy payment URI or specified URL to clipboard */
  copyToClipboard: (target?: "uri" | "albedo" | "lobstr") => Promise<boolean>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeMemoType(memoType?: PaymentLinkMemoType): "text" | "id" | "hash" | "return" {
  if (!memoType) return "text";
  const lower = memoType.toLowerCase();
  if (lower.includes("id")) return "id";
  if (lower.includes("hash")) return "hash";
  if (lower.includes("return")) return "return";
  return "text";
}

function parseAsset(
  asset?: PaymentLinkAsset,
  codeProp?: string,
  issuerProp?: string
): { isNative: boolean; code?: string; issuer?: string } {
  if (codeProp) {
    if (codeProp.toUpperCase() === "XLM" || codeProp.toLowerCase() === "native") {
      return { isNative: true };
    }
    return { isNative: false, code: codeProp, issuer: issuerProp };
  }

  if (!asset) {
    return { isNative: true };
  }

  if (typeof asset === "string") {
    const trimmed = asset.trim();
    if (trimmed.toUpperCase() === "XLM" || trimmed.toLowerCase() === "native") {
      return { isNative: true };
    }
    if (trimmed.includes(":")) {
      const [c, i] = trimmed.split(":");
      return { isNative: false, code: c, issuer: i };
    }
    return { isNative: false, code: trimmed, issuer: issuerProp };
  }

  if (asset.type === "native") {
    return { isNative: true };
  }

  return {
    isNative: false,
    code: asset.code,
    issuer: asset.issuer ?? issuerProp,
  };
}

function validatePaymentParams(
  recipient: string,
  amount: string | number | undefined,
  assetInfo: { isNative: boolean; code?: string; issuer?: string },
  memo: string | undefined,
  memoType: "text" | "id" | "hash" | "return"
): string[] {
  const errors: string[] = [];

  if (!recipient) {
    errors.push("Recipient destination address is required.");
  } else {
    const isGAddress = StrKey.isValidEd25519PublicKey(recipient);
    const isMAddress = StrKey.isValidMed25519PublicKey(recipient);
    const isFederated = recipient.includes("*");
    if (!isGAddress && !isMAddress && !isFederated) {
      errors.push("Invalid Stellar recipient address (must be a G... or M... address or federated address).");
    }
  }

  if (amount !== undefined && amount !== "") {
    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      errors.push("Amount must be a positive number.");
    }
  }

  if (!assetInfo.isNative) {
    if (!assetInfo.code || assetInfo.code.length < 1 || assetInfo.code.length > 12) {
      errors.push("Asset code must be between 1 and 12 characters.");
    }
    if (assetInfo.issuer && !StrKey.isValidEd25519PublicKey(assetInfo.issuer)) {
      errors.push("Invalid asset issuer public key.");
    }
  }

  if (memo) {
    if (memoType === "text") {
      const byteLength = new TextEncoder().encode(memo).length;
      if (byteLength > 28) {
        errors.push("Text memo cannot exceed 28 bytes.");
      }
    } else if (memoType === "id") {
      if (!/^\d+$/.test(memo)) {
        errors.push("ID memo must be an unsigned 64-bit integer.");
      }
    } else if (memoType === "hash" || memoType === "return") {
      if (!/^[0-9a-fA-F]{64}$/.test(memo)) {
        errors.push(`${memoType.toUpperCase()} memo must be a 32-byte hex-encoded string (64 characters).`);
      }
    }
  }

  return errors;
}

// ─── Hook Implementation ─────────────────────────────────────────────────────

/**
 * Hook for building shareable Stellar payment requests with recipient, asset,
 * amount, memo, and optional callbacks. Generates SEP-0007 URIs (`web+stellar:pay`),
 * Albedo links, and Lobstr deep links that open in compatible Stellar wallets.
 *
 * @example
 * ```tsx
 * const { uri, albedoUrl, isValid, openInWallet, copyToClipboard } = usePaymentLink({
 *   recipient: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
 *   amount: "25",
 *   asset: "native",
 *   memo: "Invoice #1024",
 * });
 *
 * return (
 *   <div>
 *     <button onClick={() => openInWallet()}>Pay in Wallet</button>
 *     <button onClick={() => copyToClipboard()}>Copy Payment Link</button>
 *   </div>
 * );
 * ```
 */
export function usePaymentLink(options: UsePaymentLinkOptions = {}): UsePaymentLinkReturn {
  const context = useOptionalStellarContext();

  const recipient = (options.recipient ?? options.destination ?? "").trim();
  const amountStr = options.amount !== undefined ? String(options.amount).trim() : "";
  const memo = options.memo?.trim();
  const memoType = normalizeMemoType(options.memoType);
  const message = options.message?.trim();
  const callbackUrl = options.callbackUrl?.trim();
  const networkPassphrase =
    options.networkPassphrase ??
    context?.config?.networkPassphrase;

  const assetInfo = useMemo(
    () => parseAsset(options.asset, options.assetCode, options.assetIssuer),
    [options.asset, options.assetCode, options.assetIssuer]
  );

  const errors = useMemo(
    () => validatePaymentParams(recipient, amountStr, assetInfo, memo, memoType),
    [recipient, amountStr, assetInfo, memo, memoType]
  );

  const isValid = errors.length === 0 && Boolean(recipient);

  // ─── SEP-0007 URI ──────────────────────────────────────────────────────────
  const sep7Uri = useMemo(() => {
    if (!recipient) return "";
    const params = new URLSearchParams();
    params.set("destination", recipient);

    if (amountStr && !isNaN(Number(amountStr)) && Number(amountStr) > 0) {
      params.set("amount", amountStr);
    }

    if (!assetInfo.isNative && assetInfo.code) {
      params.set("asset_code", assetInfo.code);
      if (assetInfo.issuer) {
        params.set("asset_issuer", assetInfo.issuer);
      }
    }

    if (memo) {
      params.set("memo", memo);
      if (memoType !== "text") {
        params.set("memo_type", `MEMO_${memoType.toUpperCase()}`);
      } else {
        params.set("memo_type", "MEMO_TEXT");
      }
    }

    if (message) {
      params.set("msg", message);
    }

    if (networkPassphrase && networkPassphrase !== Networks.PUBLIC) {
      params.set("network_passphrase", networkPassphrase);
    }

    if (callbackUrl) {
      params.set("callback", callbackUrl.startsWith("url:") ? callbackUrl : `url:${callbackUrl}`);
    }

    return `web+stellar:pay?${params.toString()}`;
  }, [recipient, amountStr, assetInfo, memo, memoType, message, networkPassphrase, callbackUrl]);

  // ─── Albedo Link ───────────────────────────────────────────────────────────
  const albedoUrl = useMemo(() => {
    if (!recipient) return "";
    const params = new URLSearchParams();
    params.set("destination", recipient);

    if (amountStr && !isNaN(Number(amountStr)) && Number(amountStr) > 0) {
      params.set("amount", amountStr);
    }

    if (!assetInfo.isNative && assetInfo.code) {
      params.set("asset_code", assetInfo.code);
      if (assetInfo.issuer) {
        params.set("asset_issuer", assetInfo.issuer);
      }
    }

    if (memo) {
      params.set("memo", memo);
      params.set("memo_type", memoType);
    }

    if (networkPassphrase) {
      if (networkPassphrase === Networks.TESTNET) {
        params.set("network", "testnet");
      } else if (networkPassphrase === Networks.PUBLIC) {
        params.set("network", "public");
      }
    }

    return `https://albedo.link/#pay?${params.toString()}`;
  }, [recipient, amountStr, assetInfo, memo, memoType, networkPassphrase]);

  // ─── Lobstr Link ───────────────────────────────────────────────────────────
  const lobstrUrl = useMemo(() => {
    if (!recipient) return "";
    const params = new URLSearchParams();
    params.set("destination", recipient);
    if (amountStr && !isNaN(Number(amountStr)) && Number(amountStr) > 0) {
      params.set("amount", amountStr);
    }
    if (!assetInfo.isNative && assetInfo.code) {
      params.set("asset_code", assetInfo.code);
      if (assetInfo.issuer) {
        params.set("asset_issuer", assetInfo.issuer);
      }
    }
    if (memo) {
      params.set("memo", memo);
    }
    return `https://lobstr.co/pay?${params.toString()}`;
  }, [recipient, amountStr, assetInfo, memo]);

  // Primary uri and qrValue
  const uri = sep7Uri;
  const qrValue = sep7Uri;

  // ─── Actions ───────────────────────────────────────────────────────────────
  const openInWallet = useCallback(
    (target: "sep7" | "albedo" | "lobstr" | "browser" = "sep7") => {
      if (options.openUri) {
        options.openUri(target === "albedo" ? albedoUrl : target === "lobstr" ? lobstrUrl : uri);
        return;
      }

      if (typeof window === "undefined") return;

      if (target === "albedo") {
        if (albedoUrl) window.open(albedoUrl, "_blank", "noopener,noreferrer");
      } else if (target === "lobstr") {
        if (lobstrUrl) window.open(lobstrUrl, "_blank", "noopener,noreferrer");
      } else {
        if (uri) {
          window.location.href = uri;
        }
      }
    },
    [options.openUri, uri, albedoUrl, lobstrUrl]
  );

  const copyToClipboard = useCallback(
    async (target: "uri" | "albedo" | "lobstr" = "uri"): Promise<boolean> => {
      const textToCopy =
        target === "albedo" ? albedoUrl : target === "lobstr" ? lobstrUrl : uri;
      if (!textToCopy) return false;

      try {
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(textToCopy);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [uri, albedoUrl, lobstrUrl]
  );

  return {
    uri,
    sep7Uri,
    albedoUrl,
    lobstrUrl,
    qrValue,
    isValid,
    errors,
    openInWallet,
    copyToClipboard,
  };
}
