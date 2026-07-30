/**
 * @file usePathPayment.ts
 * @description Hook for finding and executing path payments on Stellar.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback } from "react";
import {
  Asset,
  Horizon,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { useTransactionCore } from "./useTransactionCore";
import { useFreighter } from "./useFreighter";
import type { TransactionStatus, StellarTransactionError } from "../types";
import { unsafeAsXdrString } from "../types";
import { validatePublicKey } from "../utils";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Describes an asset for path payment.
 * Use `{ type: "native" }` for XLM.
 * Use `{ type: "credit", code: "USDC", issuer: "G..." }` for any other asset.
 */
export type PathPaymentAsset =
  | { type: "native" }
  | { type: "credit"; code: string; issuer: string };

export interface UsePathPaymentOptions {
  /** "strict-send" fixes the send amount; "strict-receive" fixes the receive amount */
  mode: "strict-send" | "strict-receive";
  /** Asset being sent */
  sendAsset: PathPaymentAsset;
  /**
   * strict-send: exact amount to send.
   * strict-receive: maximum amount willing to send.
   */
  sendAmount: string;
  /** Recipient Stellar address (G...) */
  destination: string;
  /** Asset to be received */
  destAsset: PathPaymentAsset;
  /**
   * strict-send: minimum amount the destination must receive.
   * strict-receive: exact amount the destination will receive.
   */
  destMin: string;
  /** Intermediate assets for the payment path. Default: [] (Horizon auto-selects) */
  path?: PathPaymentAsset[];
  /** Fee in stroops. Default: 100 */
  fee?: number;
  /** Polling timeout in seconds. Default: 60 */
  timeoutSeconds?: number;
  /** Callback fired when the transaction is successfully confirmed. */
  onSuccess?: (hash: string) => void;
  /** Callback fired when the transaction fails or an error occurs. */
  onError?: (error: StellarTransactionError) => void;
}

/**
 * @example
 * ```tsx
 * // Strict send — send exactly 10 XLM, receive at least 9 USDC
 * const {
 *   submit,    // () => Promise<void>
 *   status,    // "idle" | "submitting" | "polling" | "success" | "error"
 *   hash,      // string | null
 *   isLoading, // boolean
 *   isSuccess, // boolean
 *   isError,   // boolean
 *   error,     // Error | null
 *   reset,     // () => void
 * } = usePathPayment({
 *   mode: "strict-send",
 *   sendAsset: { type: "native" },
 *   sendAmount: "10",
 *   destination: "GBXXX...",
 *   destAsset: { type: "credit", code: "USDC", issuer: "GISSUER..." },
 *   destMin: "9",
 * });
 * ```
 */
export interface UsePathPaymentReturn {
  submit: () => Promise<void>;
  status: TransactionStatus;
  hash: string | null;
  error: StellarTransactionError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function resolveAsset(asset: PathPaymentAsset): Asset {
  return asset.type === "native"
    ? Asset.native()
    : new Asset(asset.code, asset.issuer);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Builds a Stellar path payment operation (strict send or strict receive),
 * signs it via Freighter, and submits it through Horizon.
 *
 * Wraps `useTransaction({ mode: "classic" })` for submission and polling.
 *
 * @example
 * ```tsx
 * // Strict send — send exactly 10 XLM, receive at least 9 USDC
 * const { submit, status, hash } = usePathPayment({
 *   mode: "strict-send",
 *   sendAsset: { type: "native" },
 *   sendAmount: "10",
 *   destination: "GBXXX...",
 *   destAsset: { type: "credit", code: "USDC", issuer: "GISSUER..." },
 *   destMin: "9",
 * });
 *
 * // Strict receive — receive exactly 10 USDC, send at most 11 XLM
 * const { submit, status, hash } = usePathPayment({
 *   mode: "strict-receive",
 *   sendAsset: { type: "native" },
 *   sendAmount: "11",
 *   destination: "GBXXX...",
 *   destAsset: { type: "credit", code: "USDC", issuer: "GISSUER..." },
 *   destMin: "10",
 * });
 * ```
 */
export function usePathPayment(
  options: UsePathPaymentOptions
): UsePathPaymentReturn {
  const {
    mode,
    sendAsset,
    sendAmount,
    destination,
    destAsset,
    destMin,
    path = [],
    fee = 100,
    timeoutSeconds = 60,
    onSuccess,
    onError,
  } = options;

  const { submit: submitXdr, reset, ...txState } = useTransactionCore({
    mode: "classic",
    timeoutSeconds,
    debugLabel: "usePathPayment",
    ...(onSuccess && { onSuccess }),
    ...(onError && { onError }),
  });

  const { config } = useStellarContext();
  const { signTransaction, publicKey } = useFreighter();

  const submit = useCallback(async () => {
    if (!publicKey) {
      throw new Error("Freighter is not connected. Call connect() first.");
    }

    validatePublicKey(destination, "destination");
    if (sendAsset.type === "credit") {
      validatePublicKey(sendAsset.issuer, "sendAsset.issuer");
    }
    if (destAsset.type === "credit") {
      validatePublicKey(destAsset.issuer, "destAsset.issuer");
    }

    // 1. Load source account
    const server = new Horizon.Server(config.horizonUrl);
    const sourceAccount = await server.loadAccount(publicKey);

    // 2. Resolve assets
    const stellarSendAsset = resolveAsset(sendAsset);
    const stellarDestAsset = resolveAsset(destAsset);
    const stellarPath = path.map(resolveAsset);

    const operation =
      mode === "strict-send"
        ? Operation.pathPaymentStrictSend({
            sendAsset: stellarSendAsset,
            sendAmount,
            destination,
            destAsset: stellarDestAsset,
            destMin,
            path: stellarPath,
          })
        : Operation.pathPaymentStrictReceive({
            sendAsset: stellarSendAsset,
            sendMax: sendAmount,
            destination,
            destAsset: stellarDestAsset,
            destAmount: destMin, // destMin is used as destAmount in strict-receive
            path: stellarPath,
          });

    // 4. Build the transaction
    const tx = new TransactionBuilder(sourceAccount, {
      fee: String(fee),
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(timeoutSeconds)
      .build();

    const builtXdr = tx.toXDR();

    // 5. Sign via Freighter
    const signedXdr = await signTransaction(unsafeAsXdrString(builtXdr), {
      networkPassphrase: config.networkPassphrase,
    });

    // 6. Submit and poll
    await submitXdr(signedXdr);
  }, [
    mode,
    sendAsset,
    sendAmount,
    destination,
    destAsset,
    destMin,
    path,
    fee,
    timeoutSeconds,
    config,
    publicKey,
    signTransaction,
    submitXdr,
  ]);

  return {
    ...txState,
    submit,
    reset,
    status: txState.status,
    hash: txState.hash,
    error: txState.error,
    isLoading: txState.isLoading,
    isSuccess: txState.isSuccess,
    isError: txState.isError,
  };
}
