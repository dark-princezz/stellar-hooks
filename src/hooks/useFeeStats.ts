import { useCallback, useMemo } from "react";
import { useStellarContext } from "../context";
import { useStellarQuery } from "./useStellarQuery";

export type FeePercentile = 50 | 75 | 95 | 99;

export interface FeeStats {
  lastLedger: string;
  lastLedgerBaseFee: string;
  ledgerCapacityUsage: string;
  feeCharged: {
    max: string;
    min: string;
    mode: string;
    p10: string;
    p20: string;
    p30: string;
    p40: string;
    p50: string;
    p60: string;
    p70: string;
    p80: string;
    p90: string;
    p95: string;
    p99: string;
  };
  maxFee: {
    max: string;
    min: string;
    mode: string;
    p10: string;
    p20: string;
    p30: string;
    p40: string;
    p50: string;
    p60: string;
    p70: string;
    p80: string;
    p90: string;
    p95: string;
    p99: string;
  };
}

export interface UseFeeStatsOptions {
  percentile?: FeePercentile;
  refetchInterval?: number;
  enabled?: boolean;
}

export interface UseFeeStatsReturn {
  feeStats: FeeStats | null;
  recommendedFee: string | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const PERCENTILE_KEY: Record<FeePercentile, keyof FeeStats["maxFee"]> = {
  50: "p50",
  75: "p80",
  95: "p95",
  99: "p99",
};

export function useFeeStats(
  options: UseFeeStatsOptions = {}
): UseFeeStatsReturn {
  const { percentile = 75, refetchInterval = 0, enabled = true } = options;
  const { config } = useStellarContext();

  const fetcher = useCallback(async (): Promise<FeeStats | null> => {
    const url = `${config.horizonUrl.replace(/\/$/, "")}/fee_stats`;
    const controller = new AbortController();
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch fee stats: ${response.status}`);
    }
    return response.json() as Promise<FeeStats>;
  }, [config.horizonUrl]);

  const state = useStellarQuery<FeeStats | null>(fetcher, {
    enabled,
    refetchInterval,
    initialData: null,
  });

  const recommendedFee = useMemo(() => {
    if (!state.data) return null;
    const key = PERCENTILE_KEY[percentile];
    return state.data.maxFee[key];
  }, [state.data, percentile]);

  return {
    feeStats: state.data,
    recommendedFee,
    isLoading: state.isLoading,
    error: state.error,
    refetch: state.refetch,
  };
}
