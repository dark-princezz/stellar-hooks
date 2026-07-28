/**
 * @file useTrustline.ts
 * @description Hook for managing Stellar trustlines (add, remove, modify).
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback } from "react";
import {
  Asset,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { getHorizonServer } from "../utils/memoizedServers";
import { useTransactionCore } from "./useTransactionCore";
import { useFreighter } from "./useFreighter";
import type { TransactionStatus, StellarTransactionError } from "../types";
import { unsafeAsXdrString } from "../types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UseTrustlineOptions {
  /** Asset code (e.g. "USDC") */
  code: string;
  /** Asset issuer (G... address) */
  issuer: string;
  /**
   * Trustline limit. Defaults to max (no limit).
   * Set to "0" to remove the trustline entirely.
   */
  limit?: string;
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
 * const {
 *   submit,    // () => Promise<void> — build, sign, and submit the trustline change
 *   status,    // "idle" | "submitting" | "polling" | "success" | "error"
 *   hash,      // string | null — transaction hash on success
 *   isLoading, // boolean
 *   isSuccess, // boolean
 *   isError,   // boolean
 *   error,     // Error | null
 *   reset,     // () => void
 * } = useTrustline({
 *   code: "USDC",
 *   issuer: "GA5Z...",
 *   limit: "1000",
 * });
 *
 * return <button onClick={submit} disabled={isLoading}>Add USDC Trustline</button>;
 * ```
 */
export interface UseTrustlineReturn {
  /** Call this to build, sign, and submit the trustline change */
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
 * Adds, removes, or modifies a trustline for a Stellar asset.
 *
 * Wraps `useTransaction({ mode: "classic" })` for submission and polling.
 *
 * @example
 * ```tsx
 * // Add a USDC trustline
 * const { submit, isLoading } = useTrustline({
 *   code: "USDC",
 *   issuer: "GA5Z...",
 *   limit: "10000",
 * });
 *
 * // Remove a USDC trustline
 * const { submit } = useTrustline({
 *   code: "USDC",
 *   issuer: "GA5Z...",
 *   limit: "0",
 * });
 * ```
 */
export function useTrustline(options: UseTrustlineOptions): UseTrustlineReturn {
  const {
    code,
    issuer,
    limit,
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

    // 1. Load the source account from Horizon to get the sequence number
    const server = getHorizonServer(config.horizonUrl);
    const sourceAccount = await server.loadAccount(publicKey);

    // 2. Create the asset
    const asset = new Asset(code, issuer);

    // 3. Build the transaction
    const builder = new TransactionBuilder(sourceAccount, {
      fee: String(fee),
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(
        Operation.changeTrust({
          asset,
          ...(limit !== undefined && { limit }),
        })
      )
      .setTimeout(timeoutSeconds);

    const builtTx = builder.build();
    const builtXdr = builtTx.toXDR();

    // 4. Sign via Freighter
    const signedXdr = await signTransaction(unsafeAsXdrString(builtXdr), {
      networkPassphrase: config.networkPassphrase,
    });

    // 5. Submit and poll via useTransaction internals
    await submitXdr(signedXdr);
  }, [
    code,
    issuer,
    limit,
    fee,
    timeoutSeconds,
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
