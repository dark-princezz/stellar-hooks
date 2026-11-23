import { useCallback, useState } from "react";
import type { Asset } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { appendAssetParams } from "../utils/horizonAssetParams";
import { useStellarQuery } from "./useStellarQuery";

export interface PriceCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  average: number;
  baseVolume: number;
  counterVolume: number;
  tradeCount: number;
}

export interface UsePriceHistoryOptions {
  baseAsset: Asset;
  counterAsset: Asset;
  resolution?: number;
  startTime?: number;
  endTime?: number;
  offset?: number;
  limit?: number;
  order?: "asc" | "desc";
  enabled?: boolean;
  refetchInterval?: number;
}

export interface UsePriceHistoryReturn {
  candles: PriceCandle[];
  isLoading: boolean;
  error: Error | null;
  lastFetchedAt: Date | null;
  refetch: () => Promise<void>;
}

interface HorizonAggregationRecord {
  timestamp?: number | string;
  trade_count?: number | string;
  base_volume?: string;
  counter_volume?: string;
  avg?: string;
  high?: string;
  low?: string;
  open?: string;
  close?: string;
}

interface HorizonAggregationsPage {
  _embedded?: { records?: HorizonAggregationRecord[] };
  records?: HorizonAggregationRecord[];
}

const SUPPORTED_RESOLUTIONS = new Set([
  60_000,
  300_000,
  900_000,
  3_600_000,
  86_400_000,
  604_800_000,
]);

function toNumber(value: number | string | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizePriceCandle(record: HorizonAggregationRecord): PriceCandle {
  return {
    timestamp: toNumber(record.timestamp),
    open: toNumber(record.open),
    high: toNumber(record.high),
    low: toNumber(record.low),
    close: toNumber(record.close),
    average: toNumber(record.avg),
    baseVolume: toNumber(record.base_volume),
    counterVolume: toNumber(record.counter_volume),
    tradeCount: toNumber(record.trade_count),
  };
}

export function usePriceHistory(options: UsePriceHistoryOptions): UsePriceHistoryReturn {
  const {
    baseAsset,
    counterAsset,
    resolution = 3_600_000,
    startTime,
    endTime,
    offset = 0,
    limit = 100,
    order = "asc",
    enabled = true,
    refetchInterval = 0,
  } = options;

  const { config } = useStellarContext();
  const [range] = useState(() => {
    const end = endTime ?? Date.now();
    return { start: startTime ?? end - 30 * 86_400_000, end };
  });

  const fetcher = useCallback(
    async (signal?: AbortSignal): Promise<PriceCandle[] | null> => {
      if (!SUPPORTED_RESOLUTIONS.has(resolution)) {
        throw new Error(`Unsupported resolution: ${resolution}`);
      }

      const params = new URLSearchParams({
        resolution: String(resolution),
        start_time: String(range.start),
        end_time: String(range.end),
        offset: String(offset),
        limit: String(limit),
        order,
      });
      appendAssetParams(params, "base", baseAsset);
      appendAssetParams(params, "counter", counterAsset);

      const response = await fetch(`${config.horizonUrl.replace(/\/$/, "")}/trade_aggregations?${params}`, { signal });
      if (!response.ok) throw new Error(`Failed to fetch price history: ${response.status}`);

      const page = (await response.json()) as HorizonAggregationsPage;
      const records = page._embedded?.records ?? page.records ?? [];
      return records.map(normalizePriceCandle);
    },
    [baseAsset, config.horizonUrl, counterAsset, limit, offset, order, range.end, range.start, resolution]
  );

  const state = useStellarQuery<PriceCandle[]>(fetcher, {
    enabled,
    initialData: [],
    debugLabel: "usePriceHistory",
    refetchInterval,
  });

  return {
    candles: state.data ?? [],
    isLoading: state.isLoading,
    error: state.error,
    lastFetchedAt: state.lastFetchedAt,
    refetch: state.refetch,
  };
}
