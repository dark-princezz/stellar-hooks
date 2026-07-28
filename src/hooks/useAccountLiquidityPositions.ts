import { useCallback, useMemo } from "react";
import { useStellarContext } from "../context";
import { useStellarQuery } from "./useStellarQuery";
import { validatePublicKey } from "../utils";
import type { LiquidityPoolRecord } from "./useLiquidityPool";
import type { StellarPublicKey } from "../types";

export interface UseAccountLiquidityPositionsOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export interface UseAccountLiquidityPositionsReturn {
  positions: LiquidityPoolRecord[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAccountLiquidityPositions(
  publicKey: StellarPublicKey | null | undefined,
  options: UseAccountLiquidityPositionsOptions = {}
): UseAccountLiquidityPositionsReturn {
  const { enabled = true, refetchInterval = 0 } = options;
  const { config } = useStellarContext();

  const fetcher = useCallback(async (): Promise<LiquidityPoolRecord[]> => {
    if (!publicKey) return [];

    validatePublicKey(publicKey);
    const url = `${config.horizonUrl.replace(/\/$/, "")}/liquidity_pools?account=${publicKey}&limit=200`;
    const controller = new AbortController();
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch liquidity positions: ${response.status}`);
    }
    const data = await response.json();
    const records = (data as Record<string, unknown>)?._embedded as Record<string, unknown> | undefined;
    const poolRecords = (records?.records as LiquidityPoolRecord[]) ?? [];
    return poolRecords;
  }, [publicKey, config.horizonUrl]);

  const state = useStellarQuery<LiquidityPoolRecord[]>(fetcher, {
    enabled: enabled && Boolean(publicKey),
    refetchInterval,
    initialData: [],
  });

  return useMemo(
    () => ({
      positions: state.data ?? [],
      isLoading: state.isLoading,
      error: state.error,
      refetch: state.refetch,
    }),
    [state.data, state.isLoading, state.error, state.refetch]
  );
}
