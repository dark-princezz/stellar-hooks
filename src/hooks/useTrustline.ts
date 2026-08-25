/**
 * @file useTrustline.ts
 * @description Hook for managing Stellar trustlines (add, remove, modify).
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback } from "react";
import {
  Asset,
  Horizon,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { useTransactionCore } from "./useTransactionCore";
import { useFreighter } from "./useFreighter";
import { useStellarAccount } from "./useStellarAccount";
import type { TransactionStatus, StellarTransactionError } from "../types";
import { unsafeAsXdrString } from "../types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UseTrustlineOptions {
  /** Account public key to query trustlines for. Defaults to connected wallet key if not provided. */
  publicKey?: string;
  /** Account public key alias */
  account?: string;
  /** Asset code (e.g. "USDC") */
  code?: string;
  /** Asset issuer (G... address) */
  issuer?: string;
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
 *   trustlines, // StellarBalance[]
 *   trustline,  // StellarBalance | null
 *   submit,     // () => Promise<void> — build, sign, and submit the trustline change
 *   changeTrust,// (params) => Promise<void>
 *   status,     // "idle" | "submitting" | "polling" | "success" | "error"
 *   hash,       // string | null — transaction hash on success
 *   isLoading,  // boolean
 *   isSuccess,  // boolean
 *   isError,    // boolean
 *   error,      // Error | null
 *   reset,      // () => void
 * } = useTrustline({
 *   code: "USDC",
 *   issuer: "GA5Z...",
 *   limit: "1000",
 * });
 * ```
 */
export interface UseTrustlineReturn {
  /** Call this to build, sign, and submit the configured trustline change */
  submit: () => Promise<void>;
  /** Helper to submit changeTrust operations with custom or override parameters */
  changeTrust: (params?: { code?: string; issuer?: string; limit?: string; fee?: number }) => Promise<void>;
  /** Array of current non-native trustlines for the account */
  trustlines: import("../types").StellarBalance[];
  /** Trustline matching code & issuer if specified */
  trustline: import("../types").StellarBalance | null;
  status: TransactionStatus;
  hash: string | null;
  error: StellarTransactionError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
  refetch?: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Exposes current trustlines for an account and helpers to submit changeTrust operations.
 *
 * @example
 * ```tsx
 * // Query trustlines & submit changeTrust
 * const { trustlines, changeTrust, isLoading } = useTrustline({
 *   publicKey: "G...",
 * });
 * ```
 */
export function useTrustline(options: UseTrustlineOptions = {}): UseTrustlineReturn {
  const {
    publicKey: optionPublicKey,
    account: optionAccount,
    code,
    issuer,
    limit,
    fee = 100,
    timeoutSeconds = 60,
    onSuccess,
    onError,
  } = options;

  const { config } = useStellarContext();
  const { signTransaction, publicKey: freighterKey } = useFreighter();
  const targetPublicKey = optionPublicKey || optionAccount || freighterKey;

  const { submit: submitXdr, reset, ...txState } = useTransactionCore({
    mode: "classic",
    timeoutSeconds,
    debugLabel: "useTrustline",
    ...(onSuccess && { onSuccess }),
    ...(onError && { onError }),
  });

  const { data: accountData, refetch } = useStellarAccount(targetPublicKey);

  const trustlines = (accountData?.balances ?? []).filter((b) => !b.isNative);

  const trustline =
    code && issuer
      ? trustlines.find((b) => b.assetCode === code && b.assetIssuer === issuer) ?? null
      : null;

  const changeTrust = useCallback(
    async (params?: { code?: string; issuer?: string; limit?: string; fee?: number }) => {
      const activeCode = params?.code ?? code;
      const activeIssuer = params?.issuer ?? issuer;
      const activeLimit = params?.limit ?? limit;
      const activeFee = params?.fee ?? fee;

      if (!activeCode || !activeIssuer) {
        throw new Error("Asset code and issuer are required to execute changeTrust operation.");
      }

      if (!freighterKey) {
        throw new Error("Freighter is not connected. Call connect() first.");
      }

      // 1. Load the source account from Horizon to get the sequence number
      const server = new Horizon.Server(config.horizonUrl);
      const sourceAccount = await server.loadAccount(freighterKey);

      // 2. Create the asset
      const asset = new Asset(activeCode, activeIssuer);

      // 3. Build the transaction
      const builder = new TransactionBuilder(sourceAccount, {
        fee: String(activeFee),
        networkPassphrase: config.networkPassphrase,
      })
        .addOperation(
          Operation.changeTrust({
            asset,
            ...(activeLimit !== undefined && { limit: activeLimit }),
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
      if (refetch) {
        await refetch();
      }
    },
    [
      code,
      issuer,
      limit,
      fee,
      timeoutSeconds,
      config,
      freighterKey,
      signTransaction,
      submitXdr,
      refetch,
    ]
  );

  const submit = useCallback(async () => {
    return changeTrust();
  }, [changeTrust]);

  return {
    submit,
    changeTrust,
    trustlines,
    trustline,
    reset,
    refetch,
    status: txState.status,
    hash: txState.hash,
    error: txState.error,
    isLoading: txState.isLoading,
    isSuccess: txState.isSuccess,
    isError: txState.isError,
  };
}
