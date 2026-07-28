/**
 * @file usePayment.ts
 * @description Hook for building and submitting Stellar payments.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback } from "react";
import {
  Asset,
  Memo,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { getHorizonServer } from "../utils/memoizedServers";
import { useTransactionCore } from "./useTransactionCore";
import { useFreighter } from "./useFreighter";
import type { TransactionStatus, StellarPublicKey, StellarAssetIssuer, StellarTransactionError } from "../types";
import { unsafeAsXdrString } from "../types";
import { validatePublicKey } from "../utils";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Describes the asset to send.
 * Use `{ type: "native" }` for XLM.
 * Use `{ type: "credit", code: "USDC", issuer: "G..." }` for any other asset.
 */
export type PaymentAsset =
  | { type: "native" }
  | { type: "credit"; code: string; issuer: StellarAssetIssuer };

export interface UsePaymentOptions {
  /** Recipient Stellar address (G...) */
  destination: StellarPublicKey;
  /** Asset to send */
  asset: PaymentAsset;
  /** Amount as a string, e.g. "10.5" */
  amount: string;
  /** Optional memo text (max 28 bytes) */
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

/**
 * @example
 * ```tsx
 * const {
 *   submit,    // () => Promise<void> — build, sign, and submit the payment
 *   status,    // "idle" | "submitting" | "polling" | "success" | "error"
 *   hash,      // string | null — transaction hash on success
 *   isLoading, // boolean
 *   isSuccess, // boolean
 *   isError,   // boolean
 *   error,     // Error | null
 *   reset,     // () => void
 * } = usePayment({
 *   destination: "GBXXX...",
 *   asset: { type: "native" },
 *   amount: "10",
 *   memo: "Thanks!",
 * });
 *
 * return <button onClick={submit} disabled={isLoading}>Send XLM</button>;
 * ```
 */
export interface UsePaymentReturn {
  /** Call this to build, sign, and submit the payment */
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
 * Builds a classic Stellar payment operation, signs it via Freighter,
 * and submits it through Horizon with polling for confirmation.
 *
 * Wraps `useTransaction({ mode: "classic" })` for submission and polling.
 *
 * @example
 * ```tsx
 * const { submit, status, hash, error } = usePayment({
 *   destination: "GBXXX...",
 *   asset: { type: "native" },
 *   amount: "10",
 *   memo: "Thanks!",
 * });
 *
 * return <button onClick={submit}>Send XLM</button>;
 * ```
 */
export function usePayment(options: UsePaymentOptions): UsePaymentReturn {
  const {
    destination,
    asset,
    amount,
    memo,
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

    validatePublicKey(destination, "destination");
    if (asset.type === "credit") {
      validatePublicKey(asset.issuer, "asset.issuer");
    }

    // 1. Load the source account from Horizon to get the sequence number
    const server = getHorizonServer(config.horizonUrl);
    const sourceAccount = await server.loadAccount(publicKey);

    // 2. Resolve the asset
    const stellarAsset =
      asset.type === "native"
        ? Asset.native()
        : new Asset(asset.code, asset.issuer);

    // 3. Build the transaction
    const builder = new TransactionBuilder(sourceAccount, {
      fee: String(fee),
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(
        Operation.payment({
          destination,
          asset: stellarAsset,
          amount,
        })
      )
      .setTimeout(timeoutSeconds);

    // 4. Attach memo if provided
    if (memo) {
      builder.addMemo(Memo.text(memo));
    }

    const builtTx = builder.build();
    const builtXdr = builtTx.toXDR();

    // 5. Sign via Freighter
    const signedXdr = await signTransaction(unsafeAsXdrString(builtXdr), {
      networkPassphrase: config.networkPassphrase,
    });

    await submitXdr(signedXdr);
  }, [destination, asset, amount, memo, fee, timeoutSeconds, config, publicKey, signTransaction, submitXdr]);

  return {
    ...txState,
    status: txState.status,
    hash: txState.hash,
    error: txState.error,
    isLoading: txState.isLoading,
    isSuccess: txState.isSuccess,
    isError: txState.isError,
    submit,
    reset,
  };
}