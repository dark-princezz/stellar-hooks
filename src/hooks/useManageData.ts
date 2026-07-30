/**
 * @file useManageData.ts
 * @description Hook for setting and deleting Stellar account data entries via the ManageData operation.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback } from "react";
import { Horizon, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { useTransactionCore } from "./useTransactionCore";
import { useFreighter } from "./useFreighter";
import { unsafeAsXdrString, type TransactionStatus, type StellarTransactionError } from "../types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UseManageDataOptions {
  /** Fee in stroops. Default: 100 */
  fee?: number;
  /** Transaction and polling timeout in seconds. Default: 60 */
  timeoutSeconds?: number;
  /** Callback fired when the transaction is successfully confirmed. */
  onSuccess?: (hash: string) => void;
  /** Callback fired when the transaction fails or an error occurs. */
  onError?: (error: StellarTransactionError) => void;
}

/**
 * @example
 * ```tsx
 * const {
 *   set,       // (name, value) => Promise<void> — store a data entry
 *   remove,    // (name) => Promise<void>        — delete a data entry
 *   status,    // "idle" | "submitting" | "polling" | "success" | "error"
 *   hash,      // string | null — transaction hash on success
 *   isLoading, // boolean
 *   isSuccess, // boolean
 *   isError,   // boolean
 *   error,     // Error | null
 *   reset,     // () => void
 * } = useManageData();
 *
 * await set("my-key", "my-value");
 * await remove("my-key");
 * ```
 */
export interface UseManageDataReturn {
  /**
   * Store a key-value data entry on the connected account.
   * Both `name` and `value` are limited to 64 bytes each.
   */
  set: (name: string, value: string | Buffer) => Promise<void>;
  /**
   * Delete a data entry from the connected account.
   * Submits a ManageData operation with a null value.
   */
  remove: (name: string) => Promise<void>;
  status: TransactionStatus;
  hash: string | null;
  error: StellarTransactionError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Builds and submits a Stellar ManageData operation to set or delete key-value
 * data entries stored on the connected Freighter account.
 *
 * Uses `useTransaction({ mode: "classic" })` for Horizon submission and polling.
 *
 * @example
 * ```tsx
 * const { set, remove, status, hash, error } = useManageData({
 *   onSuccess: (hash) => console.log("Done!", hash),
 * });
 *
 * // Store a data entry
 * await set("user-verified", "true");
 *
 * // Delete a data entry
 * await remove("user-verified");
 * ```
 */
export function useManageData(
  options: UseManageDataOptions = {}
): UseManageDataReturn {
  const { fee = 100, timeoutSeconds = 60, onSuccess, onError } = options;

  const { config } = useStellarContext();
  const { signTransaction, publicKey } = useFreighter();
  const { submit: submitXdr, reset, ...txState } = useTransactionCore({
    mode: "classic",
    timeoutSeconds,
    debugLabel: "useManageData",
    ...(onSuccess && { onSuccess }),
    ...(onError && { onError }),
  });

  const buildAndSubmit = useCallback(
    async (name: string, value: string | Buffer | null) => {
      if (!publicKey) {
        throw new Error("Freighter is not connected. Call connect() first.");
      }

      // 1. Load source account from Horizon to get the sequence number
      const server = new Horizon.Server(config.horizonUrl);
      const sourceAccount = await server.loadAccount(publicKey);

      // 2. Build the transaction with a ManageData operation
      const tx = new TransactionBuilder(sourceAccount, {
        fee: String(fee),
        networkPassphrase: config.networkPassphrase,
      })
        .addOperation(Operation.manageData({ name, value }))
        .setTimeout(timeoutSeconds)
        .build();

      // 3. Sign via Freighter
      const signedXdr = await signTransaction(unsafeAsXdrString(tx.toXDR()), {
        networkPassphrase: config.networkPassphrase,
      });

      // 4. Submit and poll via useTransaction
      await submitXdr(signedXdr);
    },
    [publicKey, config, fee, timeoutSeconds, signTransaction, submitXdr]
  );

  const set = useCallback(
    (name: string, value: string | Buffer) => buildAndSubmit(name, value),
    [buildAndSubmit]
  );

  const remove = useCallback(
    (name: string) => buildAndSubmit(name, null),
    [buildAndSubmit]
  );

  return {
    set,
    remove,
    reset,
    status: txState.status,
    hash: txState.hash,
    error: txState.error,
    isLoading: txState.isLoading,
    isSuccess: txState.isSuccess,
    isError: txState.isError,
  };
}
