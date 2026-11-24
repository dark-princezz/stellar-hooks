/**
 * @file useSwapQuote.ts
 * @description Fetch swap quotes (with route and price impact) from a Soroban DEX router.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { nativeToScVal, scValToNative, type xdr } from "@stellar/stellar-sdk/minimal";
import { useSorobanRead } from "./useSorobanRead";

export interface SwapQuote {
  /** Expected output, in base units. */
  amountOut: bigint;
  /** Contract addresses of the pools / tokens traversed, in order. */
  route: string[];
  /** Estimated price impact in basis points (100 = 1%), or null if unknown. */
  priceImpactBps: number | null;
  /** Epoch ms when this quote was received (used for staleness). */
  fetchedAt: number;
}

export interface UseSwapQuoteOptions {
  /** Router contract address (C...). */
  routerId: string;
  /** Input token contract address. */
  tokenIn: string | null | undefined;
  /** Output token contract address. */
  tokenOut: string | null | undefined;
  /** Input amount in base units; must be > 0. */
  amountIn: bigint | null | undefined;
  /** Router method to call (default `"get_quote"`). */
  method?: string;
  /** Auto-refresh interval in ms before the quote goes stale (default 15000, 0 disables). */
  refreshInterval?: number;
  /** Warn threshold used for `isHighImpact` (bps, default 300 = 3%). */
  highImpactBps?: number;
  /** Custom mapper from the router's native return value. */
  parseQuote?: (native: unknown) => Omit<SwapQuote, "fetchedAt">;
}

export interface UseSwapQuoteReturn {
  quote: SwapQuote | null;
  isLoading: boolean;
  /** True once the quote is older than `refreshInterval` (refresh is in flight). */
  isStale: boolean;
  /** True when `priceImpactBps` exceeds `highImpactBps`. */
  isHighImpact: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const toBig = (v: unknown): bigint =>
  typeof v === "bigint" ? v : typeof v === "number" || typeof v === "string" ? BigInt(v) : 0n;

/**
 * Default mapper. Accepts `{ amount_out, route?, price_impact_bps? }` or, when the
 * router only reports `reference_out` (output at spot price), derives impact from it.
 */
export function parseRouterQuote(native: unknown): Omit<SwapQuote, "fetchedAt"> {
  const n = (native ?? {}) as Record<string, unknown>;
  const amountOut = toBig(n.amount_out ?? n.amountOut ?? (typeof native === "bigint" ? native : 0));
  const route = Array.isArray(n.route) ? n.route.map(String) : [];
  let priceImpactBps: number | null = null;
  if (n.price_impact_bps !== undefined) {
    priceImpactBps = Number(n.price_impact_bps);
  } else if (n.reference_out !== undefined) {
    priceImpactBps = computePriceImpactBps(amountOut, toBig(n.reference_out));
  }
  return { amountOut, route, priceImpactBps };
}

/** Price impact in bps: how much worse the executed output is than the spot-price output. */
export function computePriceImpactBps(amountOut: bigint, referenceOut: bigint): number | null {
  if (referenceOut <= 0n) return null;
  const diff = referenceOut - amountOut;
  return diff <= 0n ? 0 : Number((diff * 10_000n) / referenceOut);
}

/**
 * Request a swap quote for `amountIn` of `tokenIn` → `tokenOut` from a router
 * contract, refreshing automatically before it goes stale.
 *
 * @example
 * ```tsx
 * const { quote, isHighImpact } = useSwapQuote({ routerId, tokenIn, tokenOut, amountIn: 10_000_000n });
 * ```
 */
export function useSwapQuote({
  routerId,
  tokenIn,
  tokenOut,
  amountIn,
  method = "get_quote",
  refreshInterval = 15_000,
  highImpactBps = 300,
  parseQuote = parseRouterQuote,
}: UseSwapQuoteOptions): UseSwapQuoteReturn {
  const enabled = Boolean(tokenIn && tokenOut && amountIn && amountIn > 0n);
  const args = useMemo(
    () =>
      enabled
        ? [
            nativeToScVal(tokenIn!, { type: "address" }),
            nativeToScVal(tokenOut!, { type: "address" }),
            nativeToScVal(amountIn!, { type: "i128" }),
          ]
        : [],
    [enabled, tokenIn, tokenOut, amountIn],
  );

  const read = useSorobanRead<Omit<SwapQuote, "fetchedAt">>(routerId, method, args, {
    enabled,
    refetchInterval: refreshInterval,
    cacheTTL: 0,
    parseResult: (scVal: xdr.ScVal) => parseQuote(scValToNative(scVal)),
  });

  const [fetchedAt, setFetchedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (read.data) setFetchedAt(Date.now());
  }, [read.data]);
  useEffect(() => {
    if (!refreshInterval) return;
    const t = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(t);
  }, [refreshInterval]);

  const quote = useMemo(
    () => (enabled && read.data ? { ...read.data, fetchedAt } : null),
    [enabled, read.data, fetchedAt],
  );
  const isStale = Boolean(quote && refreshInterval && now - quote.fetchedAt > refreshInterval);
  const isHighImpact = Boolean(quote?.priceImpactBps != null && quote.priceImpactBps > highImpactBps);

  const refetch = useCallback(() => read.refetch(), [read]);

  return { quote, isLoading: read.isLoading, isStale, isHighImpact, error: read.error, refetch };
}
