/**
 * @file useFeeBumpTransaction.ts
 * @description Hook for wrapping and submitting a fee-bump transaction.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback } from "react";
import { Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { useFreighter } from "./useFreighter";
import { useTransactionCore } from "./useTransactionCore";
import { unsafeAsXdrString } from "../types";
import type { TransactionStatus, StellarTransactionError, StellarXdrString } from "../types";
import type { RetryStrategy } from "./useTransactionCore";
import { validatePublicKey } from "../utils";

// ─── Options ──────────────────────────────────────────────────────────────────

export interface UseFeeBumpTransactionOptions {
  /** Polling and submission timeout in seconds. Default: 60 */
  timeoutSeconds?: number;
  /** Configuration for handling network failures during polling */
  retryStrategy?: RetryStrategy;
  /** Callback fired when the fee-bump transaction is confirmed. */
  onSuccess?: (hash: string) => void;
  /** Callback fired on error. */
  onError?: (error: StellarTransactionError) => void;
}

// ─── Return type ──────────────────────────────────────────────────────────────

export interface UseFeeBumpTransactionReturn {
  /**
   * Wrap an inner transaction XDR in a fee-bump envelope and submit it.
   *
   * If the inner XDR is not yet signed, it will be signed first using the
   * connected Freighter wallet. The fee-bump envelope is then constructed and
   * signed by the sponsor account before submission.
   *
   * @param innerXdr - The unsigned or signed inner transaction XDR string.
   * @param feeBumpFee - Total fee for the fee-bump envelope (in stroops, as a string).
   * @param sponsor - Optional sponsor public key. Defaults to the connected wallet's public key.
   */
  submit: (innerXdr: string, feeBumpFee: string, sponsor?: string) => Promise<void>;
  /** Current lifecycle status. */
  status: TransactionStatus;
  /** Transaction hash once confirmed. */
  hash: string | null;
  /** Error object if the fee-bump transaction failed. */
  error: StellarTransactionError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  /** Reset state back to idle. */
  reset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Wrap a pre-built inner transaction in a fee-bump envelope and submit it
 * through Horizon. Handles optional signing of the inner transaction and
 * mandatory signing of the fee-bump envelope via the connected Freighter wallet.
 *
 * Useful for sponsored-fee dApps where a separate account covers the network
 * fee on behalf of the end user.
 *
 * @example
 * ```tsx
 * const { submit, status, hash, isLoading } = useFeeBumpTransaction();
 *
 * // Inner tx already signed by the end user
 * await submit(signedInnerXdr, "500", "GSPONSOR...");
 * ```
 *
 * @example
 * ```tsx
 * // Inner tx is unsigned — the hook signs it first
 * await submit(unsignedInnerXdr, "500");
 * ```
 */
export function useFeeBumpTransaction(
  options: UseFeeBumpTransactionOptions = {},
): UseFeeBumpTransactionReturn {
  const { timeoutSeconds = 60, onSuccess, onError } = options;

  const { config } = useStellarContext();
  const { signTransaction, publicKey } = useFreighter();
  const {
    submit: submitXdr,
    reset,
    status,
    hash,
    error,
    isLoading,
    isSuccess,
    isError,
  } = useTransactionCore({
    mode: "classic",
    timeoutSeconds,
    debugLabel: "useFeeBumpTransaction",
    ...(onSuccess && { onSuccess }),
    ...(onError && { onError }),
  });

  const submit = useCallback(
    async (innerXdr: string, feeBumpFee: string, sponsor?: string) => {
      const sponsorAddress = sponsor ?? publicKey;
      if (!sponsorAddress) {
        throw new Error(
          "Freighter is not connected and no sponsor address was provided.",
        );
      }
      validatePublicKey(sponsorAddress, "sponsor");

      // Determine if the inner XDR is already signed by checking signatures.
      let signedInnerXdr: StellarXdrString;
      try {
        const innerTx = TransactionBuilder.fromXDR(
          innerXdr,
          config.networkPassphrase,
        );
        if (innerTx.signatures.length > 0) {
          // Already signed — use as-is.
          signedInnerXdr = unsafeAsXdrString(innerXdr);
        } else {
          // Not signed — sign it first using the connected wallet's source account.
          if (!publicKey) {
            throw new Error(
              "Freighter is not connected and unsigned XDR requires signing.",
            );
          }
          signedInnerXdr = await signTransaction(
            unsafeAsXdrString(innerXdr),
            { networkPassphrase: config.networkPassphrase },
          );
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes("Freighter")) {
          throw err;
        }
        throw new Error(
          `Failed to decode or sign inner transaction: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // Build the fee-bump envelope from the signed inner transaction.
      const innerTx = TransactionBuilder.fromXDR(
        signedInnerXdr,
        config.networkPassphrase,
      );
      const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
        sponsorAddress,
        feeBumpFee,
        innerTx as Transaction,
        config.networkPassphrase,
      );

      // Sign the fee-bump envelope with the sponsor's wallet.
      const signedFeeBumpXdr = await signTransaction(
        unsafeAsXdrString(feeBumpTx.toXDR()),
        {
          networkPassphrase: config.networkPassphrase,
          address: sponsorAddress,
        },
      );

      await submitXdr(signedFeeBumpXdr);
    },
    [publicKey, config, signTransaction, submitXdr],
  );

  return { submit, reset, status, hash, error, isLoading, isSuccess, isError };
}
