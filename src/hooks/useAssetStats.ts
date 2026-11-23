import { useCallback } from "react";
import { useStellarContext } from "../context";
import { assetTypeForCode } from "../utils/horizonAssetParams";
import { useStellarQuery } from "./useStellarQuery";

export interface AssetStats {
  assetCode: string;
  assetIssuer: string;
  totalSupply: string;
  holders: number;
  authorizedHolders: number;
  claimableBalanceAmount: string;
  liquidityPoolAmount: string;
  contractAmount: string;
  tradeCount: number | null;
  recentTradePrice: number | null;
}

export interface UseAssetStatsOptions {
  assetCode: string;
  assetIssuer: string;
  enabled?: boolean;
  refetchInterval?: number;
}

export interface UseAssetStatsReturn {
  stats: AssetStats | null;
  isLoading: boolean;
  error: Error | null;
  lastFetchedAt: Date | null;
  refetch: () => Promise<void>;
}

interface HorizonAssetRecord {
  asset_code?: string;
  asset_issuer?: string;
  amount?: string;
  balances?: { authorized?: string };
  num_accounts?: number | string;
  accounts?: { authorized?: number | string };
  claimable_balances_amount?: string;
  liquidity_pools_amount?: string;
  contracts_amount?: string;
  trade_count?: number | string;
}

interface HorizonAssetsPage {
  _embedded?: { records?: HorizonAssetRecord[] };
  records?: HorizonAssetRecord[];
}

interface HorizonTradeRecord {
  price?: string | { n: number | string; d: number | string };
}

interface HorizonTradesPage {
  _embedded?: { records?: HorizonTradeRecord[] };
  records?: HorizonTradeRecord[];
}

function toNumber(value: number | string | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toPrice(value: HorizonTradeRecord["price"]): number | null {
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value && typeof value === "object") {
    const denominator = Number(value.d);
    const numerator = Number(value.n);
    return denominator !== 0 && Number.isFinite(numerator) && Number.isFinite(denominator)
      ? numerator / denominator
      : null;
  }
  return null;
}

export function normalizeAssetStats(record: HorizonAssetRecord, tradeCount: number | null, recentTradePrice: number | null): AssetStats {
  return {
    assetCode: record.asset_code ?? "",
    assetIssuer: record.asset_issuer ?? "",
    totalSupply: record.amount ?? record.balances?.authorized ?? "0",
    holders: toNumber(record.num_accounts ?? record.accounts?.authorized),
    authorizedHolders: toNumber(record.accounts?.authorized ?? record.num_accounts),
    claimableBalanceAmount: record.claimable_balances_amount ?? "0",
    liquidityPoolAmount: record.liquidity_pools_amount ?? "0",
    contractAmount: record.contracts_amount ?? "0",
    tradeCount,
    recentTradePrice,
  };
}

export function useAssetStats(options: UseAssetStatsOptions): UseAssetStatsReturn {
  const { assetCode, assetIssuer, enabled = true, refetchInterval = 0 } = options;
  const { config } = useStellarContext();
  const horizonUrl = config.horizonUrl.replace(/\/$/, "");

  const fetcher = useCallback(
    async (signal?: AbortSignal): Promise<AssetStats | null> => {
      const assetParams = new URLSearchParams({
        asset_code: assetCode,
        asset_issuer: assetIssuer,
        asset_type: assetTypeForCode(assetCode),
        limit: "1",
      });

      const response = await fetch(`${horizonUrl}/assets?${assetParams}`, { signal });
      if (!response.ok) throw new Error(`Failed to fetch asset stats: ${response.status}`);

      const page = (await response.json()) as HorizonAssetsPage;
      const record = page._embedded?.records?.[0] ?? page.records?.[0];
      if (!record) return null;

      const tradesParams = new URLSearchParams({
        base_asset_type: assetTypeForCode(assetCode),
        base_asset_code: assetCode,
        base_asset_issuer: assetIssuer,
        limit: "1",
        order: "desc",
      });
      const tradesResponse = await fetch(`${horizonUrl}/trades?${tradesParams}`, { signal });
      if (!tradesResponse.ok) throw new Error(`Failed to fetch asset trading activity: ${tradesResponse.status}`);

      const tradesPage = (await tradesResponse.json()) as HorizonTradesPage;
      const recentTrade = tradesPage._embedded?.records?.[0] ?? tradesPage.records?.[0];
      const tradeCount = record.trade_count === undefined ? null : toNumber(record.trade_count);

      return normalizeAssetStats(record, tradeCount, recentTrade ? toPrice(recentTrade.price) : null);
    },
    [assetCode, assetIssuer, horizonUrl]
  );

  const state = useStellarQuery<AssetStats | null>(fetcher, {
    enabled,
    initialData: null,
    debugLabel: "useAssetStats",
    refetchInterval,
  });

  return {
    stats: state.data,
    isLoading: state.isLoading,
    error: state.error,
    lastFetchedAt: state.lastFetchedAt,
    refetch: state.refetch,
  };
}
