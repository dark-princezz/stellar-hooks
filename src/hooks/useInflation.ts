/**
 * @file useInflation.ts
 * @description Hook for submitting an inflation operation (legacy support).
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback } from "react";
import { Memo, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { getHorizonServer } from "../utils/memoizedServers";
import { useTransactionCore } from "./useTransactionCore";
import { useFreighter } from "./useFreighter";
import type { TransactionStatus, StellarTransactionError } from "../types";
import { unsafeAsXdrString } from "../types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UseInflationOptions {
  /** Fee in stroops. Default: 100 */
  fee?: number;
  /** Polling timeout in seconds. Default: 60 */
  timeoutSeconds?: number;
  /** Optional memo text (max 28 bytes) */
  memo?: string;
  /** Callback fired when the transaction is successfully confirmed. */
  onSuccess?: (hash: string) => void;
  /** Callback fired when the transaction fails or an error occurs. */
  onError?: (error: StellarTransactionError) => void;
}

/**
 * @example
 * ```tsx
 * const {
 *   submit,    // () => Promise<void> — build, sign, and submit the inflation operation
 *   status,    // "idle" | "submitting" | "polling" | "success" | "error"
 *   hash,      // string | null — transaction hash on success
 *   isLoading, // boolean
 *   isSuccess, // boolean
 *   isError,   // boolean
 *   error,     // Error | null
 *   reset,     // () => void
 * } = useInflation({
 *   fee: 100,
 *   timeoutSeconds: 60,
 * });
 *
 * return <button onClick={submit} disabled={isLoading}>Vote Inflation</button>;
 * ```
 */
export interface UseInflationReturn {
  /** Call this to build, sign, and submit the inflation operation */
  submit: () => Promise<void>;
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
 * Builds a classic Stellar inflation operation, signs it via Freighter,
 * and submits it through Horizon with polling for confirmation.
 *
 * The inflation operation is a legacy feature that votes for the inflation
 * destination set on the account. It has no parameters other than the optional
 * source account and memo.
 *
 * Wraps `useTransaction({ mode: "classic" })` for submission and polling.
 *
 * @example
 * ```tsx
 * const { submit, status, hash, error } = useInflation({
 *   onSuccess: (hash) => console.log("Inflation vote submitted!", hash),
 * });
 *
 * return <button onClick={submit} disabled={status !== "idle"}>Vote Inflation</button>;
 * ```
 */
export function useInflation(options: UseInflationOptions = {}): UseInflationReturn {
  const {
    fee = 100,
    timeoutSeconds = 60,
    memo,
    onSuccess,
    onError,
  } = options;

  const { config } = useStellarContext();
  const { signTransaction, publicKey } = useFreighter();
  const { submit: submitXdr, reset, ...txState } = useTransactionCore({
    mode: "classic",
    timeoutSeconds,
    ...(onSuccess && { onSuccess }),
    ...(onError && { onError }),
  });

  const submit = useCallback(async () => {
    if (!publicKey) {
      throw new Error("Freighter is not connected. Call connect() first.");
    }

    // 1. Load the source account from Horizon to get the sequence number
    const server = getHorizonServer(config.horizonUrl);
    const sourceAccount = await server.loadAccount(publicKey);

    // 2. Build the transaction with inflation operation
    const builder = new TransactionBuilder(sourceAccount, {
      fee: String(fee),
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(Operation.inflation({}))
      .setTimeout(timeoutSeconds);

    // 3. Attach memo if provided
    if (memo) {
      builder.addMemo(Memo.text(memo));
    }

    const builtTx = builder.build();
    const builtXdr = builtTx.toXDR();

    // 4. Sign via Freighter
    const signedXdr = await signTransaction(unsafeAsXdrString(builtXdr), {
      networkPassphrase: config.networkPassphrase,
    });

    // 5. Submit and poll via useTransaction internals
    await submitXdr(signedXdr);
  }, [
    fee,
    timeoutSeconds,
    memo,
    config,
    publicKey,
    signTransaction,
    submitXdr,
  ]);

  return {
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