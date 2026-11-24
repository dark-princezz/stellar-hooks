/**
 * @file useWalletDeepLink.ts
 * @description Build deep links that open a mobile wallet pre-filled with a payment or auth request.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useMemo } from "react";
import { buildSep7PayUri, type Sep7PayParams } from "../utils/sep7";

export type DeepLinkWallet = "sep7" | "lobstr" | "albedo" | "custom";

export type WalletDeepLinkRequest =
  | ({ type: "pay" } & Sep7PayParams)
  | { type: "tx"; xdr: string; networkPassphrase?: string; callback?: string };

export interface UseWalletDeepLinkOptions {
  /** Target wallet (default `"sep7"`, handled by any SEP-7 wallet). */
  wallet?: DeepLinkWallet;
  /** Required for `wallet: "custom"`: a scheme/base such as `"mywallet://sep7"`. */
  customBase?: string;
}

export interface UseWalletDeepLinkReturn {
  /** Build a link for a request; throws if the request is invalid. */
  buildLink: (request: WalletDeepLinkRequest) => string;
  /** Build and open the link (`window.location`), returning it. */
  open: (request: WalletDeepLinkRequest) => string;
}

function sep7Tx(xdr: string, passphrase?: string, callback?: string): string {
  if (!xdr) throw new Error("xdr is required for a transaction request.");
  const q = new URLSearchParams({ xdr });
  if (passphrase) q.set("network_passphrase", passphrase);
  if (callback) q.set("callback", callback.startsWith("url:") ? callback : `url:${callback}`);
  return `web+stellar:tx?${q.toString()}`;
}

/**
 * Generate deep links for opening a specific mobile wallet with a pending
 * payment (`pay`) or signing (`tx`) request pre-filled.
 *
 * @example
 * ```tsx
 * const { buildLink, open } = useWalletDeepLink({ wallet: "lobstr" });
 * open({ type: "pay", destination: "GA5Z...", amount: "10" });
 * ```
 */
export function useWalletDeepLink({
  wallet = "sep7",
  customBase,
}: UseWalletDeepLinkOptions = {}): UseWalletDeepLinkReturn {
  const buildLink = useMemo(
    () =>
      (request: WalletDeepLinkRequest): string => {
        const sep7 =
          request.type === "pay"
            ? buildSep7PayUri(request)
            : sep7Tx(request.xdr, request.networkPassphrase, request.callback);
        const query = sep7.slice(sep7.indexOf("?"));
        const op = request.type;
        switch (wallet) {
          case "lobstr":
            return `https://lobstr.co/uri/${op}${query}`;
          case "albedo":
            return `https://albedo.link/${op === "pay" ? "pay" : "tx"}${query.replace("?", "?")}`;
          case "custom":
            if (!customBase) throw new Error('customBase is required when wallet is "custom".');
            return `${customBase.replace(/\/+$/, "")}/${op}${query}`;
          default:
            return sep7;
        }
      },
    [wallet, customBase],
  );

  const open = useCallback(
    (request: WalletDeepLinkRequest) => {
      const link = buildLink(request);
      if (typeof window !== "undefined") window.location.href = link;
      return link;
    },
    [buildLink],
  );

  return { buildLink, open };
}
