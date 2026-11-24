/**
 * @file useBridgeQuote.ts
 * @description Cross-chain transfer quotes (fees, output amount, arrival time) from a bridge API.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface BridgeQuoteParams {
  /** Source chain id, e.g. `"stellar"`. */
  fromChain: string;
  /** Destination chain id, e.g. `"ethereum"`. */
  toChain: string;
  /** Asset symbol or identifier being moved. */
  asset: string;
  /** Amount to send, as a decimal string. */
  amount: string;
}

export interface BridgeQuote {
  /** Total fee, decimal string in the transferred asset. */
  fee: string;
  /** Estimated amount received on the destination chain. */
  outputAmount: string;
  /** Estimated arrival time in seconds. */
  estimatedSeconds: number;
  /** Opaque provider quote id, forwarded to `useBridgeTransfer`. */
  quoteId?: string;
}

export interface UseBridgeQuoteOptions {
  /** Bridge API base URL. Quotes are requested from `GET {baseUrl}/quote`. */
  baseUrl: string;
  /** Quote parameters; fetching is disabled while null/undefined. */
  params: BridgeQuoteParams | null | undefined;
  /** Optional provider-specific response mapper. */
  parseResponse?: (json: unknown) => BridgeQuote;
  /** Request timeout in ms (default 10000). */
  timeout?: number;
}

export interface UseBridgeQuoteReturn {
  quote: BridgeQuote | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/** Default mapper for `{ fee, outputAmount, estimatedSeconds, quoteId? }` responses. */
export function parseBridgeQuote(json: unknown): BridgeQuote {
  const q = json as Partial<BridgeQuote> | null;
  if (
    !q ||
    q.fee === undefined ||
    q.outputAmount === undefined ||
    typeof q.estimatedSeconds !== "number"
  ) {
    throw new Error("Unexpected bridge quote response shape.");
  }
  return {
    fee: String(q.fee),
    outputAmount: String(q.outputAmount),
    estimatedSeconds: q.estimatedSeconds,
    quoteId: q.quoteId,
  };
}

/**
 * Fetch an estimated fee, output amount and arrival time for moving an asset
 * between Stellar and another chain.
 *
 * @example
 * ```tsx
 * const { quote } = useBridgeQuote({
 *   baseUrl: "https://bridge.example.com",
 *   params: { fromChain: "stellar", toChain: "ethereum", asset: "USDC", amount: "100" },
 * });
 * ```
 */
export function useBridgeQuote({
  baseUrl,
  params,
  parseResponse = parseBridgeQuote,
  timeout = 10_000,
}: UseBridgeQuoteOptions): UseBridgeQuoteReturn {
  const [quote, setQuote] = useState<BridgeQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const key = params ? JSON.stringify(params) : null;

  const load = useCallback(async () => {
    if (!params) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), timeout);
    setIsLoading(true);
    setError(null);
    try {
      const url = `${baseUrl.replace(/\/+$/, "")}/quote?${new URLSearchParams({ ...params }).toString()}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`Bridge quote failed (${res.status}): ${res.statusText}`);
      const parsed = parseResponse(await res.json());
      if (abortRef.current !== controller) return;
      setQuote(parsed);
    } catch (err) {
      if (abortRef.current !== controller) return;
      setQuote(null);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      clearTimeout(timer);
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, key, parseResponse, timeout]);

  useEffect(() => {
    setQuote(null);
    void load();
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [load]);

  return { quote, isLoading, error, refetch: load };
}
