/**
 * @file useStake.ts
 * @description Hooks wrapping `stake` / `unstake` calls on a Soroban staking contract.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nativeToScVal } from "@stellar/stellar-sdk/minimal";
import { useFreighter } from "./useFreighter";
import { useSorobanContract } from "./useSorobanContract";
import type { StellarTransactionError, TransactionStatus } from "../types";

export interface StakingLockup {
  /** Unix seconds when staked funds become withdrawable, if the contract reports one. */
  unlocksAt?: number;
  /** Cooldown in seconds between requesting an unstake and receiving funds. */
  cooldownSeconds?: number;
}

export interface UseStakeOptions {
  /** Staking contract address (C...). */
  contractId: string;
  /** Lockup / cooldown info supplied by the caller (e.g. from `useSorobanRead`). */
  lockup?: StakingLockup;
  onSuccess?: (hash: string) => void;
  onError?: (error: StellarTransactionError) => void;
}

export interface UseStakeActionReturn {
  /** Pending state: true from submission until the transaction is confirmed or fails. */
  isPending: boolean;
  status: TransactionStatus;
  hash: string | null;
  error: StellarTransactionError | null;
  /** Lockup / cooldown information passed in, plus whether the lockup is still active. */
  lockup: (StakingLockup & { isLocked: boolean; secondsRemaining: number }) | null;
  reset: () => void;
}

export interface UseStakeReturn extends UseStakeActionReturn {
  /** Stake `amount` (token base units, > 0). */
  stake: (amount: bigint) => Promise<void>;
}

export interface UseUnstakeReturn extends UseStakeActionReturn {
  /** Unstake `amount` (token base units, > 0). Rejected while a lockup is active. */
  unstake: (amount: bigint) => Promise<void>;
}

function useStakingAction(
  method: "stake" | "unstake",
  { contractId, lockup, onSuccess, onError }: UseStakeOptions,
) {
  const { publicKey } = useFreighter();
  const contract = useSorobanContract<unknown>(contractId, { method });
  const [validationError, setValidationError] = useState<StellarTransactionError | null>(null);

  const lockupInfo = useMemo(() => {
    if (!lockup) return null;
    const secondsRemaining = lockup.unlocksAt
      ? Math.max(0, lockup.unlocksAt - Math.floor(Date.now() / 1000))
      : 0;
    return { ...lockup, isLocked: secondsRemaining > 0, secondsRemaining };
  }, [lockup]);

  const run = useCallback(
    async (amount: bigint) => {
      setValidationError(null);
      const fail = (message: string, resultCode: string) => {
        const error: StellarTransactionError = { type: "transaction", resultCode, message };
        setValidationError(error);
        onError?.(error);
      };
      if (!publicKey) return fail("No wallet connected.", "no_wallet");
      if (typeof amount !== "bigint" || amount <= 0n) {
        return fail("Amount must be greater than zero.", "invalid_amount");
      }
      if (method === "unstake" && lockupInfo?.isLocked) {
        return fail(
          `Stake is locked for another ${lockupInfo.secondsRemaining} seconds.`,
          "locked",
        );
      }
      await contract.call({
        method,
        args: [
          nativeToScVal(publicKey, { type: "address" }),
          nativeToScVal(amount, { type: "i128" }),
        ],
        onError,
      });
    },
    [publicKey, method, lockupInfo, contract, onError],
  );

  const notifiedHash = useRef<string | null>(null);
  useEffect(() => {
    if (contract.status === "success" && contract.hash && notifiedHash.current !== contract.hash) {
      notifiedHash.current = contract.hash;
      onSuccess?.(contract.hash);
    }
  }, [contract.status, contract.hash, onSuccess]);

  const status: TransactionStatus = validationError ? "error" : contract.status;
  return {
    run,
    isPending: !validationError && contract.isLoading,
    status,
    hash: contract.hash,
    error: validationError ?? contract.error,
    lockup: lockupInfo,
    reset: () => {
      setValidationError(null);
      contract.reset();
    },
  };
}

/**
 * Stake tokens on a staking contract (`stake(from, amount)`).
 *
 * @example
 * ```tsx
 * const { stake, isPending, error } = useStake({ contractId: "CSTAKE..." });
 * await stake(10_000_000n);
 * ```
 */
export function useStake(options: UseStakeOptions): UseStakeReturn {
  const { run, ...rest } = useStakingAction("stake", options);
  return { stake: run, ...rest };
}

/**
 * Unstake tokens from a staking contract (`unstake(from, amount)`), refusing
 * the call client-side while a known lockup is still active.
 *
 * @example
 * ```tsx
 * const { unstake, lockup } = useUnstake({ contractId, lockup: { unlocksAt } });
 * ```
 */
export function useUnstake(options: UseStakeOptions): UseUnstakeReturn {
  const { run, ...rest } = useStakingAction("unstake", options);
  return { unstake: run, ...rest };
}
