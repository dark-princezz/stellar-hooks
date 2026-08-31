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
 * This hook provides access to an account's trustlines and methods to add, modify,
 * or remove trustlines. It handles the transaction building, signing, and submission
 * process for trustline changes.
 *
 * @param options - Configuration options for trustline management
 * @param options.publicKey - Account public key to query trustlines for (defaults to connected wallet)
 * @param options.account - Alias for publicKey
 * @param options.code - Asset code for trustline operations (e.g., "USDC")
 * @param options.issuer - Asset issuer public key (G...)
 * @param options.limit - Trustline limit (defaults to max, "0" to remove trustline)
 * @param options.fee - Fee in stroops (default: 100)
 * @param options.timeoutSeconds - Polling timeout in seconds (default: 60)
 * @param options.onSuccess - Callback fired when transaction is successfully confirmed
 * @param options.onError - Callback fired when transaction fails or error occurs
 *
 * @returns Object containing trustline data and management methods
 * @returns {function} returns.submit - Build, sign, and submit the configured trustline change
 * @returns {function} returns.changeTrust - Submit changeTrust operations with custom parameters
 * @returns {StellarBalance[]} returns.trustlines - Array of current non-native trustlines for the account
 * @returns {StellarBalance|null} returns.trustline - Trustline matching code & issuer if specified
 * @returns {string} returns.status - Transaction status: "idle" | "submitting" | "polling" | "success" | "error"
 * @returns {string|null} returns.hash - Transaction hash on success
 * @returns {Error|null} returns.error - Transaction error if failed
 * @returns {boolean} returns.isLoading - True during transaction operations
 * @returns {boolean} returns.isSuccess - True when trustline change completed successfully
 * @returns {boolean} returns.isError - True when trustline change failed
 * @returns {function} returns.reset - Reset state back to idle
 * @returns {function} returns.refetch - Manually trigger a refetch of trustlines
 *
 * @example
 * ```tsx
 * // Query trustlines & submit changeTrust
 * const { trustlines, changeTrust, isLoading } = useTrustline({
 *   publicKey: "G...",
 * });
 *
 * // Add trustline for USDC
 * await changeTrust({
 *   code: "USDC",
 *   issuer: "GA5Z...",
 *   limit: "1000",
 * });
 * ```
 *
 * @example
 * ```tsx
 * // Remove trustline
 * const { changeTrust } = useTrustline({
 *   code: "USDC",
 *   issuer: "GA5Z...",
 * });
 *
 * await changeTrust({ limit: "0" });
 * ```
 */
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
