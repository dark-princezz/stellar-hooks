/**
 * @file useStellarBalance.ts
 * @description Hook for fetching Stellar account balances.
 * @package stellar-hooks
 * @license MIT
 */

import { useMemo } from "react";
import { useStellarAccount, type UseStellarAccountOptions } from "./useStellarAccount";
import type { StellarBalance, StellarAccountData, StellarPublicKey } from "../types";

export interface UseStellarBalanceReturn {
  balances: StellarBalance[];
  xlmBalance: StellarBalance | null;
  assetBalance: StellarBalance | null;
  data: StellarAccountData | null;
  isLoading: boolean;
  error: Error | null;
  lastFetchedAt: Date | null;
  refetch: () => Promise<void>;
}

/**
 * Convenience wrapper around useStellarAccount that surfaces the native XLM balance
 * and optionally a specific asset balance.
 *
 * This hook is a simplified interface for fetching account balances, providing
 * easy access to the native XLM balance and optionally filtering for a specific
 * custom asset by code and issuer.
 *
 * @param publicKey - The public key of the account to fetch balances for
 * @param assetOrOptions - Either a specific asset to find (code + issuer) or configuration options
 * @param assetOrOptions.code - Asset code (e.g., "USDC") when filtering for specific asset
 * @param assetOrOptions.issuer - Asset issuer public key when filtering for specific asset
 * @param options - Configuration options (only used when asset is provided as 2nd arg)
 *
 * @returns Object containing balance data and query state
 * @returns {StellarBalance[]} returns.balances - All account balances
 * @returns {StellarBalance|null} returns.xlmBalance - Native XLM balance entry
 * @returns {StellarBalance|null} returns.assetBalance - Specific asset balance if requested
 * @returns {StellarAccountData|null} returns.data - Full account data
 * @returns {boolean} returns.isLoading - True during initial fetch
 * @returns {Error|null} returns.error - Any error from the fetch
 * @returns {Date|null} returns.lastFetchedAt - Timestamp of last successful fetch
 * @returns {function} returns.refetch - Manually trigger a refetch
 *
 * @example
 * ```tsx
 * // Get native XLM balance
 * const { xlmBalance, isLoading } = useStellarBalance(publicKey);
 * return <p>Balance: {xlmBalance?.balance ?? "0"} XLM</p>;
 * ```
 *
 * @example
 * ```tsx
 * // Get specific asset balance
 * const { assetBalance } = useStellarBalance(publicKey, { code: "USDC", issuer: "G..." });
 * return <p>USDC Balance: {assetBalance?.balance ?? "0"}</p>;
 * ```
 *
 * @example
 * ```tsx
 * // Get all balances with polling
 * const { balances, isLoading } = useStellarBalance(publicKey, { refetchInterval: 5000 });
 * return (
 *   <ul>
 *     {balances.map((balance) => (
 *       <li key={balance.assetCode}>{balance.assetCode}: {balance.balance}</li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export function useStellarBalance(
  publicKey: StellarPublicKey | null | undefined,
  assetOrOptions?: { code: string; issuer: string } | UseStellarAccountOptions | null,
  options?: UseStellarAccountOptions
): UseStellarBalanceReturn {
  const isAsset =
    !!assetOrOptions &&
    typeof assetOrOptions === "object" &&
    "code" in assetOrOptions &&
    "issuer" in assetOrOptions;

  const asset = isAsset ? (assetOrOptions as { code: string; issuer: string }) : null;
  const accountOptions = isAsset ? options : (assetOrOptions as UseStellarAccountOptions);

  const { data: account, isLoading, isRefetching, error, lastFetchedAt, refetch } = useStellarAccount(
    publicKey,
    accountOptions
  );

  const balances = useMemo(() => account?.balances ?? [], [account?.balances]);
  const xlmBalance = useMemo(
    () => balances.find((b) => b.isNative) ?? null,
    [balances]
  );

  const assetBalance = useMemo(() => {
    if (!asset) return null;
    return (
      balances.find((b) => b.assetCode === asset.code && b.assetIssuer === asset.issuer) ?? null
    );
  }, [balances, asset]);

  return useMemo(
    () => ({
      balances,
      xlmBalance,
      assetBalance,
      data: account,
      isLoading,
      isRefetching,
      error,
      lastFetchedAt,
      refetch,
    }),
    [balances, xlmBalance, assetBalance, account, isLoading, isRefetching, error, lastFetchedAt, refetch]
  );
}