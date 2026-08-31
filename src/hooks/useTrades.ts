/**
 * @file useTrades.ts
 * @description Hook for fetching DEX trade history for an account from Horizon.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Asset, Horizon } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";

export interface TradeRecord {
  id: string;
  paging_token: string;
  ledger_close_time: string;
  trade_type: string;
  base_account?: string;
  base_amount: string;
  base_asset_type: string;
  base_asset_code?: string;
  base_asset_issuer?: string;
  counter_account?: string;
  counter_amount: string;
  counter_asset_type: string;
  counter_asset_code?: string;
  counter_asset_issuer?: string;
  base_is_seller: boolean;
  price?: { n: number; d: number };
}

export interface UseTradesOptions {
  /** Cursor for pagination */
  cursor?: string;
  /** Maximum number of records per page. Default: 10 */
  limit?: number;
  /** Sort order. Default: "desc" */
  order?: "asc" | "desc";
  /** Optional base asset filter */
  baseAsset?: Asset;
  /** Optional counter asset filter */
  counterAsset?: Asset;
  /** Whether the hook should fetch. Default: true */
  enabled?: boolean;
  /** Polling interval in ms. Default: 0 (disabled) */
  refetchInterval?: number;
}

/**
 * @example
 * ```tsx
 * // Fetch trade history for an account
 * const { trades, isLoading, error, refetch } = useTrades("G...", {
 *   limit: 20,
 *   order: "desc",
 * });
 *
 * // With asset pair filtering
 * import { Asset } from "@stellar/stellar-sdk";
 * const { trades } = useTrades("G...", {
 *   baseAsset: Asset.native(),
 *   counterAsset: new Asset("USDC", "GA5ZSE..."),
 * });
 * ```
 */
export interface UseTradesReturn {
  trades: TradeRecord[];
  isLoading: boolean;
  error: Error | null;
  lastFetchedAt: Date | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches DEX trade history for a given Stellar account from Horizon.
 * Supports optional baseAsset / counterAsset filtering and cursor-based pagination.
 *
 * @param publicKey - Stellar account public key (G...) to fetch trade history for
 * @param options - Configuration options for the query
 * @param options.cursor - Cursor for pagination (default: latest)
 * @param options.limit - Maximum number of records per page (default: 10)
 * @param options.order - Sort order: "asc" or "desc" (default: "desc")
 * @param options.baseAsset - Optional base asset filter for specific asset pair
 * @param options.counterAsset - Optional counter asset filter (required when baseAsset is set)
 * @param options.enabled - Whether the hook should fetch (default: true)
 * @param options.refetchInterval - Polling interval in milliseconds, 0 = disabled (default: 0)
 *
 * @returns Object containing trade data and query state
 * @returns {TradeRecord[]} returns.trades - Array of trade records
 * @returns {boolean} returns.isLoading - True during initial fetch
 * @returns {Error|null} returns.error - Any error from the fetch
 * @returns {Date|null} returns.lastFetchedAt - Timestamp of last successful fetch
 * @returns {function} returns.refetch - Manually trigger a refetch
 *
 * @example
 * ```tsx
 * // Fetch trade history for an account
 * const { trades, isLoading, error, refetch } = useTrades("G...", {
 *   limit: 20,
 *   order: "desc",
 * });
 *
 * // With asset pair filtering
 * import { Asset } from "@stellar/stellar-sdk";
 * const { trades } = useTrades("G...", {
 *   baseAsset: Asset.native(),
 *   counterAsset: new Asset("USDC", "GA5ZSE..."),
 * });
 * ```
 */
export function useTrades(
  publicKey: string | null | undefined,
  options: UseTradesOptions = {}
): UseTradesReturn {
  const {
    cursor,
    limit = 10,
    order = "desc",
    baseAsset,
    counterAsset,
    enabled = true,
    refetchInterval = 0,
  } = options;

  const { config } = useStellarContext();

  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchIdRef = useRef(0);

  const refetch = useCallback(async () => {
    if (!publicKey) return;

    const id = ++fetchIdRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const server = new Horizon.Server(config.horizonUrl);
      let query = server
        .trades()
        .forAccount(publicKey)
        .order(order)
        .limit(limit);

      if (cursor) {
        query = query.cursor(cursor);
      }

      if (baseAsset) {
        query = query.forAssetPair(baseAsset, counterAsset ?? baseAsset);
      }

      const response = await query.call();
      if (id !== fetchIdRef.current) return;
      setTrades(response.records as unknown as TradeRecord[]);
      setLastFetchedAt(new Date());
    } catch (err) {
      if (id === fetchIdRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (id === fetchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [publicKey, cursor, limit, order, baseAsset, counterAsset, config.horizonUrl]);

  useEffect(() => {
    if (!enabled || !publicKey) return;

    void refetch();

    if (refetchInterval > 0) {
      intervalRef.current = setInterval(() => void refetch(), refetchInterval);
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      fetchIdRef.current += 1;
    };
  }, [enabled, publicKey, refetch, refetchInterval]);

  return {
    trades,
    isLoading,
    error,
    lastFetchedAt,
    refetch,
  };
}
