/**
 * @file useRewards.ts
 * @description Read claimable staking rewards for an account and claim them.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useMemo } from "react";
import { nativeToScVal, scValToNative } from "@stellar/stellar-sdk/minimal";
import { useFreighter } from "./useFreighter";
import { useSorobanContract } from "./useSorobanContract";
import { useSorobanRead } from "./useSorobanRead";
import type { StellarTransactionError, TransactionStatus } from "../types";

export interface UseRewardsOptions {
  /** Staking contract address (C...). */
  contractId: string;
  /** Account to read rewards for. Defaults to the connected wallet. */
  account?: string;
  /** Reward asset code used for formatting (default `"XLM"`). */
  assetCode?: string;
  /** Decimals of the reward asset (default 7). */
  decimals?: number;
  /** Poll interval in ms (0 disables). */
  refetchInterval?: number;
  onError?: (error: StellarTransactionError) => void;
}

export interface UseRewardsReturn {
  /** Claimable amount in base units, or null while unknown. */
  amount: bigint | null;
  /** Human-readable claimable amount, e.g. `"12.5"`. */
  formatted: string | null;
  assetCode: string;
  isLoading: boolean;
  error: Error | StellarTransactionError | null;
  /** Calls `claim(account)` on the contract and refreshes the balance on success. */
  claim: () => Promise<void>;
  claimStatus: TransactionStatus;
  isClaiming: boolean;
  refetch: () => Promise<void>;
}

/** Format an integer amount in base units as a decimal string (no float math). */
export function formatUnits(value: bigint, decimals: number): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const frac = digits.slice(digits.length - decimals).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`;
}

const toBigInt = (value: unknown): bigint => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" || typeof value === "string") return BigInt(value);
  return 0n;
};

/**
 * Reads claimable rewards via `claimable(account)` and exposes a `claim` action.
 *
 * @example
 * ```tsx
 * const { formatted, assetCode, claim } = useRewards({ contractId: "CSTAKE..." });
 * ```
 */
export function useRewards({
  contractId,
  account,
  assetCode = "XLM",
  decimals = 7,
  refetchInterval = 0,
  onError,
}: UseRewardsOptions): UseRewardsReturn {
  const { publicKey } = useFreighter();
  const address = account ?? publicKey ?? null;

  const read = useSorobanRead<bigint>(
    contractId,
    "claimable",
    address ? [nativeToScVal(address, { type: "address" })] : [],
    {
      enabled: Boolean(address),
      refetchInterval,
      parseResult: (scVal) => toBigInt(scValToNative(scVal)),
    },
  );
  const contract = useSorobanContract<unknown>(contractId, { method: "claim" });

  const claim = useCallback(async () => {
    if (!address) return;
    await contract.call({
      method: "claim",
      args: [nativeToScVal(address, { type: "address" })],
      onError,
    });
    await read.refetch();
  }, [address, contract, read, onError]);

  const formatted = useMemo(
    () =>
      read.data === null ? null : formatUnits(read.data, decimals),
    [read.data, decimals],
  );

  return {
    amount: read.data,
    formatted,
    assetCode,
    isLoading: read.isLoading,
    error: read.error ?? contract.error,
    claim,
    claimStatus: contract.status,
    isClaiming: contract.isLoading,
    refetch: read.refetch,
  };
}
