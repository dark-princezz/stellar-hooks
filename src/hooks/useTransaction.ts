/**
 * @file useTransaction.ts
 * @description Hook for building, signing, and submitting Stellar transactions.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback } from "react";
import {
  Memo,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { getHorizonServer } from "../utils/memoizedServers";
import { useFreighter } from "./useFreighter";
import { useTransactionCore } from "./useTransactionCore";
import type { TransactionState, TransactionStatus, StellarTransactionError } from "../types";
import { unsafeAsXdrString } from "../types";
import { validatePublicKey } from "../utils";

// ─── Options ──────────────────────────────────────────────────────────────────

export interface UseTransactionOptions {
  /**
   * "classic" submits through Horizon; "soroban" submits through the RPC server.
   * Default: "classic"
   */
  mode?: "classic" | "soroban";
  /** Base fee in stroops. Default: 100 */
  fee?: number;
  /** Optional text memo attached to every transaction built by this hook. */
  memo?: string;
  /**
   * Wrap the inner transaction in a fee-bump sponsored by a separate account.
   * `fee` is the total fee for the fee-bump envelope (in stroops as a string).
   * `sponsor` defaults to the connected wallet's public key if omitted.
   */
  feeBump?: {
    fee: string;
    sponsor?: string;
  };
  /** Build and polling timeout in seconds. Default: 60 */
  timeoutSeconds?: number;
  /** Callback fired when the transaction is successfully confirmed on-chain. */
  onSuccess?: (hash: string) => void;
  /** Callback fired when an error occurs at any stage. */
  onError?: (error: StellarTransactionError) => void;
}

// ─── Return type ──────────────────────────────────────────────────────────────

export interface UseTransactionReturn {
  /**
   * Build a transaction from the provided operations, sign it via the connected
   * wallet, and submit it. Polls until the transaction is confirmed or times out.
   *
   * @param operations - One or more Stellar operations to include in the transaction.
   */
  submit: (operations: xdr.Operation[]) => Promise<void>;
  /** Current lifecycle status. */
  status: TransactionStatus;
  /** Transaction hash once the transaction is confirmed on-chain. */
  hash: TransactionState["hash"];
  /** Error object if the transaction failed at any stage. */
  error: StellarTransactionError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  /** Reset state back to idle. */
  reset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Build, sign, and submit a Stellar transaction from raw operations.
 *
 * Handles the full lifecycle:
 * 1. Loads the source account sequence number from Horizon.
 * 2. Builds a `TransactionBuilder` with the supplied operations, fee, and memo.
 * 3. Optionally wraps the transaction in a fee-bump envelope.
 * 4. Signs the transaction via the connected Freighter wallet.
 * 5. Submits and polls until the transaction is confirmed (classic) or finalized (Soroban).
 *
 * @example
 * ```tsx
 * const { submit, status, hash, isLoading, error } = useTransaction({
 *   fee: 200,
 *   memo: "invoice #42",
 *   onSuccess: (hash) => console.log("confirmed:", hash),
 * });
 *
 * async function handleSend() {
 *   await submit([
 *     Operation.payment({
 *       destination: "GDEST...",
 *       asset: Asset.native(),
 *       amount: "10",
 *     }),
 *   ]);
 * }
 * ```
 *
 * @example Fee-bump sponsorship
 * ```tsx
 * const { submit } = useTransaction({
 *   feeBump: { fee: "1000", sponsor: "GSPONSOR..." },
 * });
 * ```
 */
export function useTransaction(
  options: UseTransactionOptions = {},
): UseTransactionReturn {
  const {
    mode = "classic",
    fee = 100,
    memo,
    feeBump,
    timeoutSeconds = 60,
    onSuccess,
    onError,
  } = options;

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
    mode,
    timeoutSeconds,
    ...(onSuccess && { onSuccess }),
    ...(onError && { onError }),
  });

  const submit = useCallback(
    async (operations: xdr.Operation[]) => {
      if (!publicKey) {
        throw new Error("Freighter is not connected. Call connect() first.");
      }

      if (operations.length === 0) {
        throw new Error("At least one operation is required.");
      }

      // 1. Load the source account to obtain the current sequence number.
      const server = getHorizonServer(config.horizonUrl);
      const sourceAccount = await server.loadAccount(publicKey);

      // 2. Build the transaction.
      const builder = new TransactionBuilder(sourceAccount, {
        fee: String(fee),
        networkPassphrase: config.networkPassphrase,
      }).setTimeout(timeoutSeconds);

      for (const op of operations) {
        builder.addOperation(op);
      }

      if (memo) {
        builder.addMemo(Memo.text(memo));
      }

      const builtTx = builder.build();

      // 3. Sign the inner transaction.
      const signedInnerXdr = await signTransaction(
        unsafeAsXdrString(builtTx.toXDR()),
        { networkPassphrase: config.networkPassphrase },
      );

      // 4. Optionally wrap in a fee-bump envelope.
      if (feeBump) {
        const sponsorAddress = feeBump.sponsor ?? publicKey;
        validatePublicKey(sponsorAddress, "feeBump.sponsor");

        const innerTx = TransactionBuilder.fromXDR(
          signedInnerXdr,
          config.networkPassphrase,
        );
        const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
          sponsorAddress,
          feeBump.fee,
          innerTx as Transaction,
          config.networkPassphrase,
        );
        const signedFeeBumpXdr = await signTransaction(
          unsafeAsXdrString(feeBumpTx.toXDR()),
          { networkPassphrase: config.networkPassphrase, address: sponsorAddress },
        );
        await submitXdr(signedFeeBumpXdr);
      } else {
        await submitXdr(signedInnerXdr);
      }
    },
    [
      publicKey,
      config,
      fee,
      memo,
      feeBump,
      timeoutSeconds,
      signTransaction,
      submitXdr,
    ],
  );

  return { submit, reset, status, hash, error, isLoading, isSuccess, isError };
}
