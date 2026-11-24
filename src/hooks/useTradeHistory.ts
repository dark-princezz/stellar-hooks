import { useCallback, useState } from "react";
import type { Asset } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { appendAssetParams } from "../utils/horizonAssetParams";
import { useStellarQuery } from "./useStellarQuery";

export interface TradeHistoryEntry {
  id: string;
  pagingToken: string;
  closedAt: string;
  price: number;
  baseAmount: string;
  counterAmount: string;
  baseAssetCode: string;
  baseAssetIssuer: string | null;
  counterAssetCode: string;
  counterAssetIssuer: string | null;
  tradeType: string;
}

export interface UseTradeHistoryOptions {
  baseAsset: Asset;
  counterAsset: Asset;
  cursor?: string;
  limit?: number;
  order?: "asc" | "desc";
  enabled?: boolean;
  refetchInterval?: number;
}

export interface UseTradeHistoryReturn {
  trades: TradeHistoryEntry[];
  isLoading: boolean;
  error: Error | null;
  lastFetchedAt: Date | null;
  setCursor: (cursor: string | undefined) => void;
  nextCursor: string | null;
  previousCursor: string | null;
  refetch: () => Promise<void>;
}

interface HorizonTradeRecord {
  id?: string;
  paging_token?: string;
  ledger_close_time?: string;
  trade_type?: string;
  base_amount?: string;
  base_asset_type?: string;
  base_asset_code?: string;
  base_asset_issuer?: string;
  counter_amount?: string;
  counter_asset_type?: string;
  counter_asset_code?: string;
  counter_asset_issuer?: string;
  price?: string | { n: number | string; d: number | string };
}

interface HorizonTradesPage {
  _embedded?: { records?: HorizonTradeRecord[] };
  records?: HorizonTradeRecord[];
  _links?: { next?: { href?: string }; prev?: { href?: string } };
}

interface TradeHistoryResult {
  trades: TradeHistoryEntry[];
  nextCursor: string | null;
  previousCursor: string | null;
}

function assetLabel(record: HorizonTradeRecord, side: "base" | "counter"): string {
  const code = side === "base" ? record.base_asset_code : record.counter_asset_code;
  const type = side === "base" ? record.base_asset_type : record.counter_asset_type;
  if (code) return code;
  return type === "native" ? "XLM" : "";
}

function normalizePrice(price: HorizonTradeRecord["price"]): number {
  if (typeof price === "string") {
    const value = Number(price);
    return Number.isFinite(value) ? value : 0;
  }
  if (price && typeof price === "object") {
    const numerator = Number(price.n);
    const denominator = Number(price.d);
    return denominator !== 0 && Number.isFinite(numerator) && Number.isFinite(denominator)
      ? numerator / denominator
      : 0;
  }
  return 0;
}

export function normalizeTradeHistoryRecord(record: HorizonTradeRecord): TradeHistoryEntry {
  return {
    id: record.id ?? "",
    pagingToken: record.paging_token ?? "",
    closedAt: record.ledger_close_time ?? "",
    price: normalizePrice(record.price),
    baseAmount: record.base_amount ?? "0",
    counterAmount: record.counter_amount ?? "0",
    baseAssetCode: assetLabel(record, "base"),
    baseAssetIssuer: record.base_asset_issuer ?? null,
    counterAssetCode: assetLabel(record, "counter"),
    counterAssetIssuer: record.counter_asset_issuer ?? null,
    tradeType: record.trade_type ?? "orderbook",
  };
}

function cursorFromLink(link: { href?: string } | undefined): string | undefined {
  if (!link?.href) return undefined;
  try {
    return new URL(link.href, "https://horizon.stellar.org").searchParams.get("cursor") ?? undefined;
  } catch {
    return undefined;
  }
}

export function useTradeHistory(options: UseTradeHistoryOptions): UseTradeHistoryReturn {
  const {
    baseAsset,
    counterAsset,
    cursor: initialCursor,
    limit = 20,
    order = "desc",
    enabled = true,
    refetchInterval = 0,
  } = options;

  const { config } = useStellarContext();
  const [cursor, setCursor] = useState(initialCursor);

  const fetcher = useCallback(
    async (signal?: AbortSignal): Promise<TradeHistoryResult | null> => {
      const params = new URLSearchParams({ order, limit: String(limit) });
      appendAssetParams(params, "base", baseAsset);
      appendAssetParams(params, "counter", counterAsset);
      if (cursor) params.set("cursor", cursor);

      const response = await fetch(`${config.horizonUrl.replace(/\/$/, "")}/trades?${params}`, { signal });
      if (!response.ok) throw new Error(`Failed to fetch trade history: ${response.status}`);

      const page = (await response.json()) as HorizonTradesPage;
      const records = page._embedded?.records ?? page.records ?? [];
      return {
        trades: records.map(normalizeTradeHistoryRecord),
        nextCursor: cursorFromLink(page._links?.next) ?? null,
        previousCursor: cursorFromLink(page._links?.prev) ?? null,
      };
    },
    [baseAsset, config.horizonUrl, counterAsset, cursor, limit, order]
  );

  const state = useStellarQuery<TradeHistoryResult>(fetcher, {
    enabled,
    initialData: { trades: [] },
    debugLabel: "useTradeHistory",
    refetchInterval,
  });

  return {
    trades: state.data?.trades ?? [],
    isLoading: state.isLoading,
    error: state.error,
    lastFetchedAt: state.lastFetchedAt,
    setCursor,
    nextCursor: state.data?.nextCursor,
    previousCursor: state.data?.previousCursor,
    refetch: state.refetch,
  };
}
