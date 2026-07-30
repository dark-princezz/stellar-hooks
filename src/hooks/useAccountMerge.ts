/**
 * @file useAccountMerge.ts
 * @description Hook for merging a Stellar account into a destination account.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback } from "react";
import {
  Horizon,
  Memo,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { useFreighter } from "./useFreighter";
import { useTransactionCore } from "./useTransactionCore";
import { unsafeAsXdrString, type TransactionStatus, type StellarTransactionError } from "../types";

export interface UseAccountMergeOptions {
  /** Destination Stellar address that will receive the merged account's balance. */
  destination: string;
  /** Optional memo text (max 28 bytes) attached to the merge transaction. */
  memo?: string;
  /** Fee in stroops. Default: 100 */
  fee?: number;
  /** Polling timeout in seconds. Default: 60 */
  timeoutSeconds?: number;
  /** Callback fired when the transaction is successfully confirmed. */
  onSuccess?: (hash: string) => void;
  /** Callback fired when the transaction fails or an error occurs. */
  onError?: (error: StellarTransactionError) => void;
}

export interface UseAccountMergeReturn {
  /** Build, sign, and submit the account merge. */
  submit: () => Promise<void>;
  status: TransactionStatus;
  hash: string | null;
  error: StellarTransactionError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
}

/**
 * Merge the connected account into `destination`, permanently closing the
 * source account and transferring its entire XLM balance. This operation is
 * irreversible — the source account ceases to exist on-ledger once the
 * transaction succeeds.
 *
 * @example
 * ```tsx
 * const { submit, status, hash, error } = useAccountMerge({
 *   destination: "GDEST...",
 * });
 *
 * await submit();
 * ```
 */
export function useAccountMerge(
  options: UseAccountMergeOptions
): UseAccountMergeReturn {
  const { destination, memo, fee = 100, timeoutSeconds = 60, onSuccess, onError } = options;
  const { config } = useStellarContext();
  const { publicKey, signTransaction } = useFreighter();
  const { submit: submitXdr, reset, ...txState } = useTransactionCore({
    mode: "classic",
    ...(onSuccess && { onSuccess }),
    debugLabel: "useAccountMerge",
    ...(onError && { onError }),
  });


  const submit = useCallback(async () => {
    if (!publicKey) {
      throw new Error("Freighter is not connected. Call connect() first.");
    }

    const server = new Horizon.Server(config.horizonUrl);
    const sourceAccount = await server.loadAccount(publicKey);

    const builder = new TransactionBuilder(sourceAccount, {
      fee: String(fee),
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(Operation.accountMerge({ destination }))
      .setTimeout(timeoutSeconds);

    if (memo) {
      builder.addMemo(Memo.text(memo));
    }

    const builtTx = builder.build();
    const builtXdr = builtTx.toXDR();

    const signedXdr = await signTransaction(unsafeAsXdrString(builtXdr), {
      networkPassphrase: config.networkPassphrase,
    });

    await submitXdr(signedXdr);
  }, [destination, memo, fee, timeoutSeconds, config, publicKey, signTransaction, submitXdr]);

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
