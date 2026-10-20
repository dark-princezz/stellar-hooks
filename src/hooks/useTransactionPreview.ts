/**
 * @file useTransactionPreview.ts
 * @description Decode a transaction envelope XDR into a readable summary.
 * @package stellar-hooks
 * @license MIT
 */

import { useMemo } from "react";
import { useOptionalStellarContext } from "../context";
import { previewTransaction } from "../utils/transactionPreview";
import type { TransactionPreview } from "../utils/transactionPreview";

export interface UseTransactionPreviewOptions {
  /** Network passphrase used to decode the envelope. Defaults to the provider's network. */
  networkPassphrase?: string;
}

export interface UseTransactionPreviewReturn {
  /** Decoded summary, or `null` while there is no XDR or it failed to decode. */
  preview: TransactionPreview | null;
  /** Decoding error, or `null`. */
  error: Error | null;
}

/**
 * Decodes a transaction envelope XDR into source, operations (with risk levels), memo, time bounds and a
 * fee breakdown. Recomputes only when the XDR or passphrase changes.
 *
 * @example
 * ```tsx
 * const { preview, error } = useTransactionPreview(xdr);
 * if (preview?.highestRisk === "high") askForExtraConfirmation();
 * ```
 */
export function useTransactionPreview(
  xdr: string | null | undefined,
  options: UseTransactionPreviewOptions = {},
): UseTransactionPreviewReturn {
  const context = useOptionalStellarContext();
  const networkPassphrase = options.networkPassphrase ?? context?.config.networkPassphrase;

  return useMemo<UseTransactionPreviewReturn>(() => {
    if (!xdr) return { preview: null, error: null };
    if (!networkPassphrase) {
      return { preview: null, error: new Error("useTransactionPreview needs a networkPassphrase or a <StellarProvider>") };
    }
    try {
      return { preview: previewTransaction(xdr, networkPassphrase), error: null };
    } catch (err) {
      return { preview: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }, [xdr, networkPassphrase]);
}
