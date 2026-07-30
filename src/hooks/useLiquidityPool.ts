import { useCallback, useMemo } from "react";
import { Horizon, Memo, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { useStellarQuery } from "./useStellarQuery";
import { useFreighter } from "./useFreighter";
import { useTransactionCore } from "./useTransactionCore";
import { unsafeAsXdrString } from "../types";
import type { TransactionStatus, StellarTransactionError } from "../types";

export interface LiquidityPoolReserve {
  asset: string;
  amount: string;
}

export interface LiquidityPoolRecord {
  id: string;
  fee_bp: number;
  type: string;
  total_trustlines: string;
  total_shares: string;
  reserves: LiquidityPoolReserve[];
  last_modified_ledger: number;
  last_modified_time: string;
}

export interface PoolPrice {
  n: number;
  d: number;
}

export interface LiquidityPoolDepositParams {
  maxAmountA: string;
  maxAmountB: string;
  minPrice: PoolPrice;
  maxPrice: PoolPrice;
  source?: string;
  memo?: string;
}

export interface LiquidityPoolWithdrawParams {
  amount: string;
  minAmountA: string;
  minAmountB: string;
  source?: string;
  memo?: string;
}

export interface UseLiquidityPoolOptions {
  enabled?: boolean;
  refetchInterval?: number;
  fee?: number;
  timeoutSeconds?: number;
  onSuccess?: (hash: string) => void;
  onError?: (error: StellarTransactionError) => void;
}

export interface UseLiquidityPoolReturn {
  pool: LiquidityPoolRecord | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  deposit: (params: LiquidityPoolDepositParams) => Promise<void>;
  withdraw: (params: LiquidityPoolWithdrawParams) => Promise<void>;
  depositStatus: TransactionStatus;
  withdrawStatus: TransactionStatus;
  depositHash: string | null;
  withdrawHash: string | null;
  isDepositLoading: boolean;
  isWithdrawLoading: boolean;
  isDepositSuccess: boolean;
  isWithdrawSuccess: boolean;
  isDepositError: boolean;
  isWithdrawError: boolean;
  depositError: StellarTransactionError | null;
  withdrawError: StellarTransactionError | null;
}

/**
 * Fetches liquidity pool data from the Horizon API, and provides
 * deposit / withdraw transaction-building helpers.
 *
 * @example
 * ```tsx
 * const { pool, deposit, withdraw, isDepositLoading } = useLiquidityPool(poolId);
 *
 * // Deposit into the pool
 * await deposit({
 *   maxAmountA: "1000",
 *   maxAmountB: "5000",
 *   minPrice: { n: 1, d: 1 },
 *   maxPrice: { n: 2, d: 1 },
 * });
 *
 * // Withdraw from the pool
 * await withdraw({ amount: "1000", minAmountA: "100", minAmountB: "500" });
 * ```
 */
export function useLiquidityPool(
  poolId: string | null | undefined,
  options: UseLiquidityPoolOptions = {}
): UseLiquidityPoolReturn {
  const { enabled = true, refetchInterval = 0, fee = 100, timeoutSeconds = 60, onSuccess, onError } = options;
  const { config } = useStellarContext();
  const { signTransaction, publicKey } = useFreighter();

  const depositCore = useTransactionCore({
    mode: "classic",
    timeoutSeconds,
    debugLabel: "useLiquidityPool-deposit",
    ...(onSuccess && { onSuccess }),
    ...(onError && { onError }),
  });

  const withdrawCore = useTransactionCore({
    mode: "classic",
    timeoutSeconds,
    debugLabel: "useLiquidityPool-withdraw",
    ...(onSuccess && { onSuccess }),
    ...(onError && { onError }),
  });

  const fetcher = useCallback(async (signal?: AbortSignal): Promise<LiquidityPoolRecord | null> => {
    if (!poolId) return null;

    const url = `${config.horizonUrl.replace(/\/$/, "")}/liquidity_pools/${poolId}`;
    const response = await fetch(url, { signal: signal ?? null });
    if (!response.ok) {
      throw new Error(`Failed to fetch liquidity pool: ${response.status}`);
    }
    return response.json() as Promise<LiquidityPoolRecord>;
  }, [poolId, config.horizonUrl]);

  const state = useStellarQuery<LiquidityPoolRecord | null>(fetcher, {
    enabled: enabled && Boolean(poolId),
    refetchInterval,
    initialData: null,
    debugLabel: "useLiquidityPool",
  });

  const deposit = useCallback(
    async (params: LiquidityPoolDepositParams) => {
      if (!publicKey) {
        throw new Error("Freighter is not connected. Call connect() first.");
      }
      if (!poolId) {
        throw new Error("poolId is required to deposit.");
      }

      const server = new Horizon.Server(config.horizonUrl);
      const sourceAccount = await server.loadAccount(params.source ?? publicKey);

      const builder = new TransactionBuilder(sourceAccount, {
        fee: String(fee),
        networkPassphrase: config.networkPassphrase,
      }).setTimeout(timeoutSeconds);

      builder.addOperation(
        Operation.liquidityPoolDeposit({
          liquidityPoolId: poolId,
          maxAmountA: params.maxAmountA,
          maxAmountB: params.maxAmountB,
          minPrice: params.minPrice,
          maxPrice: params.maxPrice,
          source: params.source,
        })
      );

      if (params.memo) {
        builder.addMemo(Memo.text(params.memo));
      }

      const builtTx = builder.build();
      const signedXdr = await signTransaction(
        unsafeAsXdrString(builtTx.toXDR()),
        { networkPassphrase: config.networkPassphrase }
      );
      await depositCore.submit(signedXdr);
    },
    [publicKey, poolId, config, fee, timeoutSeconds, signTransaction, depositCore]
  );

  const withdraw = useCallback(
    async (params: LiquidityPoolWithdrawParams) => {
      if (!publicKey) {
        throw new Error("Freighter is not connected. Call connect() first.");
      }
      if (!poolId) {
        throw new Error("poolId is required to withdraw.");
      }

      const server = new Horizon.Server(config.horizonUrl);
      const sourceAccount = await server.loadAccount(params.source ?? publicKey);

      const builder = new TransactionBuilder(sourceAccount, {
        fee: String(fee),
        networkPassphrase: config.networkPassphrase,
      }).setTimeout(timeoutSeconds);

      builder.addOperation(
        Operation.liquidityPoolWithdraw({
          liquidityPoolId: poolId,
          amount: params.amount,
          minAmountA: params.minAmountA,
          minAmountB: params.minAmountB,
          source: params.source,
        })
      );

      if (params.memo) {
        builder.addMemo(Memo.text(params.memo));
      }

      const builtTx = builder.build();
      const signedXdr = await signTransaction(
        unsafeAsXdrString(builtTx.toXDR()),
        { networkPassphrase: config.networkPassphrase }
      );
      await withdrawCore.submit(signedXdr);
    },
    [publicKey, poolId, config, fee, timeoutSeconds, signTransaction, withdrawCore]
  );

  return useMemo(
    () => ({
      pool: state.data,
      isLoading: state.isLoading,
      error: state.error,
      refetch: state.refetch,
      deposit,
      withdraw,
      depositStatus: depositCore.status,
      withdrawStatus: withdrawCore.status,
      depositHash: depositCore.hash,
      withdrawHash: withdrawCore.hash,
      isDepositLoading: depositCore.isLoading,
      isWithdrawLoading: withdrawCore.isLoading,
      isDepositSuccess: depositCore.isSuccess,
      isWithdrawSuccess: withdrawCore.isSuccess,
      isDepositError: depositCore.isError,
      isWithdrawError: withdrawCore.isError,
      depositError: depositCore.error,
      withdrawError: withdrawCore.error,
    }),
    [
      state.data, state.isLoading, state.error, state.refetch,
      deposit, withdraw,
      depositCore.status, depositCore.hash, depositCore.isLoading,
      depositCore.isSuccess, depositCore.isError, depositCore.error,
      withdrawCore.status, withdrawCore.hash, withdrawCore.isLoading,
      withdrawCore.isSuccess, withdrawCore.isError, withdrawCore.error,
    ]
  );
}
