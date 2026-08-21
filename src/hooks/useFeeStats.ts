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

type FeeDistribution = FeeStats["feeCharged"];

/** Horizon returns snake_case fee_stats; accept either shape for mocks / live network. */
interface HorizonFeeStatsPayload {
  last_ledger?: string;
  lastLedger?: string;
  last_ledger_base_fee?: string;
  lastLedgerBaseFee?: string;
  ledger_capacity_usage?: string;
  ledgerCapacityUsage?: string;
  fee_charged?: FeeDistribution;
  feeCharged?: FeeDistribution;
  max_fee?: FeeDistribution;
  maxFee?: FeeDistribution;
}

/**
 * Normalize Horizon `/fee_stats` JSON (snake_case) into the camelCase FeeStats
 * surface used by consumers. CamelCase payloads (e.g. unit-test mocks) pass through.
 */
export function normalizeFeeStats(raw: HorizonFeeStatsPayload): FeeStats {
  const feeCharged = raw.feeCharged ?? raw.fee_charged;
  const maxFee = raw.maxFee ?? raw.max_fee;
  if (!feeCharged || !maxFee) {
    throw new Error("Invalid fee_stats payload: missing fee distributions");
  }

  return {
    lastLedger: raw.lastLedger ?? raw.last_ledger ?? "",
    lastLedgerBaseFee: raw.lastLedgerBaseFee ?? raw.last_ledger_base_fee ?? "",
    ledgerCapacityUsage:
      raw.ledgerCapacityUsage ?? raw.ledger_capacity_usage ?? "",
    feeCharged,
    maxFee,
  };
}

/**
 * Fetches current Stellar network fee statistics and a recommended fee
 * at a configurable percentile.
 *
 * @example
 * ```tsx
 * const { feeStats, recommendedFee, isLoading } = useFeeStats({
 *   percentile: 95,
 *   refetchInterval: 60_000,
 * });
 * // recommendedFee: "500"  (stroops at the 95th percentile)
 * // feeStats.lastLedgerBaseFee: "100"
 * ```
 */
export function useFeeStats(
  options: UseFeeStatsOptions = {}
): UseFeeStatsReturn {
  const { percentile = 75, refetchInterval = 0, enabled = true } = options;
  const { config } = useStellarContext();

  const fetcher = useCallback(async (signal?: AbortSignal): Promise<FeeStats | null> => {
    const url = `${config.horizonUrl.replace(/\/$/, "")}/fee_stats`;
    const response = await fetch(url, {
      ...(signal && { signal }),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch fee stats: ${response.status}`);
    }
    const payload = (await response.json()) as HorizonFeeStatsPayload;
    return normalizeFeeStats(payload);
  }, [config.horizonUrl]);

  const state = useStellarQuery<FeeStats | null>(fetcher, {
    enabled,
    refetchInterval,
    initialData: null,
    debugLabel: "useFeeStats",
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
