import { useCallback, useMemo } from "react";
import { useStellarContext } from "../context";
import { useStellarQuery } from "./useStellarQuery";

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

export interface UseLiquidityPoolOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export interface UseLiquidityPoolReturn {
  pool: LiquidityPoolRecord | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches liquidity pool data from the Horizon API.
 *
 * @example
 * ```tsx
 * const { pool, isLoading, error, refetch } = useLiquidityPool(poolId);
 * // pool: { id: "abc...", reserves: [{ asset: "USDC:G...", amount: "50000" }], ... }
 * ```
 */
export function useLiquidityPool(
  poolId: string | null | undefined,
  options: UseLiquidityPoolOptions = {}
): UseLiquidityPoolReturn {
  const { enabled = true, refetchInterval = 0 } = options;
  const { config } = useStellarContext();

  const fetcher = useCallback(async (): Promise<LiquidityPoolRecord | null> => {
    if (!poolId) return null;

    const url = `${config.horizonUrl.replace(/\/$/, "")}/liquidity_pools/${poolId}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch liquidity pool: ${response.status}`);
    }
    return response.json() as Promise<LiquidityPoolRecord>;
  }, [poolId, config.horizonUrl]);

  const state = useStellarQuery<LiquidityPoolRecord | null>(fetcher, {
    enabled: enabled && Boolean(poolId),
    refetchInterval,
    initialData: null,
  });

  return useMemo(
    () => ({
      pool: state.data,
      isLoading: state.isLoading,
      error: state.error,
      refetch: state.refetch,
    }),
    [state.data, state.isLoading, state.error, state.refetch]
  );
}
