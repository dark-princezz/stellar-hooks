/**
 * @file useOrderBook.ts
 * @description Hook for querying the Stellar DEX order book for an asset pair.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Asset, Horizon } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";

export interface OrderBookLevel {
  /** Price as a ratio {n}/{d} */
  price_r: { n: number; d: number };
  /** Price as a decimal string */
  price: string;
  /** Amount available at this price level */
  amount: string;
}

export interface OrderBookRecord {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  base: { asset_type: string; asset_code?: string; asset_issuer?: string };
  counter: { asset_type: string; asset_code?: string; asset_issuer?: string };
}

export interface UseOrderBookOptions {
  /** Max price levels per side. Default: 20 */
  limit?: number;
  /** Polling interval in ms. Default: 0 (disabled) */
  refetchInterval?: number;
  /** Whether the hook should fetch. Default: true */
  enabled?: boolean;
}

/**
 * @example
 * ```tsx
 * import { useOrderBook } from "stellar-hooks";
 * import { Asset } from "@stellar/stellar-sdk";
 *
 * // Swap price display — show XLM/USDC order book, live-updating every 5 s
 * function SwapPriceDisplay() {
 *   const { bids, asks, isLoading, error } = useOrderBook(
 *     Asset.native(),
 *     new Asset("USDC", "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"),
 *     { limit: 10, refetchInterval: 5000 }
 *   );
 *
 *   if (isLoading) return <p>Loading…</p>;
 *   if (error) return <p>Error: {error.message}</p>;
 *
 *   const bestBid = bids[0]?.price ?? "—";
 *   const bestAsk = asks[0]?.price ?? "—";
 *
 *   return (
 *     <div>
 *       <p>Best Bid: {bestBid} USDC</p>
 *       <p>Best Ask: {bestAsk} USDC</p>
 *     </div>
 *   );
 * }
 * ```
 */
export interface UseOrderBookReturn {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  raw: OrderBookRecord | null;
  isLoading: boolean;
  error: Error | null;
  lastFetchedAt: Date | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches the Stellar DEX order book for a selling/buying asset pair from Horizon.
 * Supports both native XLM and any issued asset.
 * Optionally polls at `refetchInterval` for live price feeds.
 *
 * @param selling - Asset being sold (e.g., Asset.native() for XLM)
 * @param buying - Asset being bought (e.g., new Asset("USDC", "GA5..."))
 * @param options - Configuration options for the order book query
 * @param options.limit - Max price levels per side (default: 20)
 * @param options.refetchInterval - Polling interval in milliseconds, 0 = disabled (default: 0)
 * @param options.enabled - Whether the hook should fetch (default: true)
 *
 * @returns Object containing order book data and query state
 * @returns {OrderBookLevel[]} returns.bids - Buy-side price levels (highest first)
 * @returns {OrderBookLevel[]} returns.asks - Sell-side price levels (lowest first)
 * @returns {OrderBookRecord|null} returns.raw - Full raw Horizon response
 * @returns {boolean} returns.isLoading - True during initial fetch
 * @returns {Error|null} returns.error - Any error from the fetch
 * @returns {Date|null} returns.lastFetchedAt - Timestamp of last successful fetch
 * @returns {function} returns.refetch - Manually trigger a refetch
 *
 * @example
 * ```tsx
 * import { useOrderBook } from "stellar-hooks";
 * import { Asset } from "@stellar/stellar-sdk";
 *
 * // Swap price display — show XLM/USDC order book, live-updating every 5 s
 * function SwapPriceDisplay() {
 *   const { bids, asks, isLoading, error } = useOrderBook(
 *     Asset.native(),
 *     new Asset("USDC", "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"),
 *     { limit: 10, refetchInterval: 5000 }
 *   );
 *
 *   if (isLoading) return <p>Loading…</p>;
 *   if (error) return <p>Error: {error.message}</p>;
 *
 *   const bestBid = bids[0]?.price ?? "—";
 *   const bestAsk = asks[0]?.price ?? "—";
 *
 *   return (
 *     <div>
 *       <p>Best Bid: {bestBid} USDC</p>
 *       <p>Best Ask: {bestAsk} USDC</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useOrderBook(
  selling: Asset,
  buying: Asset,
  options: UseOrderBookOptions = {}
): UseOrderBookReturn {
  const { limit = 20, refetchInterval = 0, enabled = true } = options;

  const { config } = useStellarContext();

  const [raw, setRaw] = useState<OrderBookRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchIdRef = useRef(0);

  // Compare assets by their canonical string form rather than object
  // reference, and keep the useCallback deps array free of inline
  // .toString() calls (flagged as a "complex expression" by the lint rule).
  const sellingKey = selling.toString();
  const buyingKey = buying.toString();

  const refetch = useCallback(async () => {
    const id = ++fetchIdRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const server = new Horizon.Server(config.horizonUrl);
      const ob = await server.orderbook(selling, buying).limit(limit).call();
      if (id !== fetchIdRef.current) return;
      setRaw(ob as unknown as OrderBookRecord);
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
  }, [sellingKey, buyingKey, limit, config.horizonUrl]);

  useEffect(() => {
    if (!enabled) return;

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
  }, [enabled, refetch, refetchInterval]);

  return {
    bids: raw?.bids ?? [],
    asks: raw?.asks ?? [],
    raw,
    isLoading,
    error,
    lastFetchedAt,
    refetch,
  };
}
