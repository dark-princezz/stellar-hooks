/**
 * @file useBumpSequence.ts
 * @description Hook for bumping a Stellar account's sequence number.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback } from "react";
import { Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { getHorizonServer } from "../utils/memoizedServers";
import { useTransactionCore } from "./useTransactionCore";
import { useFreighter } from "./useFreighter";
import type { TransactionStatus, StellarTransactionError } from "../types";
import { unsafeAsXdrString } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseBumpSequenceOptions {
  /**
   * The new minimum sequence number the account should have after the operation.
   * Must be greater than the account's current sequence number.
   */
  bumpTo: string | bigint;
  /** Fee in stroops. Default: 100 */
  fee?: number;
  /** Polling timeout in seconds. Default: 60 */
  timeoutSeconds?: number;
  /** Callback fired when the transaction is successfully confirmed. */
  onSuccess?: (hash: string) => void;
  /** Callback fired when the transaction fails or an error occurs. */
  onError?: (error: StellarTransactionError) => void;
}

export interface UseBumpSequenceReturn {
  /** Build, sign, and submit the BumpSequence transaction */
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
 * Builds a `BumpSequence` operation, signs it via Freighter,
 * and submits it through Horizon with polling for confirmation.
 *
 * @example
 * ```tsx
 * const { submit, status, hash, error } = useBumpSequence({ bumpTo: "1000000" });
 *
 * return <button onClick={submit} disabled={status !== "idle"}>Bump Sequence</button>;
 * ```
 */
export function useBumpSequence(options: UseBumpSequenceOptions): UseBumpSequenceReturn {
  const {
    bumpTo,
    fee = 100,
    timeoutSeconds = 60,
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

    const server = getHorizonServer(config.horizonUrl);
    const sourceAccount = await server.loadAccount(publicKey);

    const tx = new TransactionBuilder(sourceAccount, {
      fee: String(fee),
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(Operation.bumpSequence({ bumpTo: String(bumpTo) }))
      .setTimeout(timeoutSeconds)
      .build();

    const signedXdr = await signTransaction(unsafeAsXdrString(tx.toXDR()), {
      networkPassphrase: config.networkPassphrase,
    });

    await submitXdr(signedXdr);
  }, [bumpTo, fee, timeoutSeconds, config, publicKey, signTransaction, submitXdr]);

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
