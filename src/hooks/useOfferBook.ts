import { useState, useEffect } from "react";
import { Horizon, Asset } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";

export interface UseOfferBookOptions {
  selling: Asset;
  buying: Asset;
  limit?: number;
  refetchInterval?: number;
}

/**
 * Fetch the DEX order book for a given asset pair from Horizon.
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useOfferBook({
 *   selling: Asset.native(),
 *   buying: new Asset("USDC", "GA5ZSE..."),
 *   limit: 10,
 *   refetchInterval: 5000,
 * });
 *
 * // data.bids — buy orders
 * // data.asks — sell orders
 * ```
 */
export function useOfferBook(options: UseOfferBookOptions) {
  const { config } = useStellarContext();
  const [data, setData] = useState<Horizon.ServerApi.OrderbookRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Assets rarely have referentially stable instances across renders, so
  // compare by their canonical string form instead of the object reference.
  // This also keeps the effect's dependency array free of the "complex
  // expression" lint violation from calling .toString() inline.
  const sellingKey = options.selling.toString();
  const buyingKey = options.buying.toString();

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let isMounted = true;

    async function fetchOrderbook() {
      try {
        if (!data) setIsLoading(true);
        
        const server = new Horizon.Server(config.horizonUrl);
        const ob = await server.orderbook(options.selling, options.buying).limit(options.limit || 20).call();
        
        if (isMounted) {
          setData(ob);
          setError(null);
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (isMounted) setIsLoading(false);
        if (options.refetchInterval && isMounted) {
          timeoutId = setTimeout(fetchOrderbook, options.refetchInterval);
        }
      }
    }

    fetchOrderbook();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
    // `data` is intentionally omitted: it's only read to decide whether to
    // show the loading spinner on the very first fetch vs. a silent
    // background refetch. Including it would create an infinite loop, since
    // this effect calls setData on every successful fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.horizonUrl, sellingKey, buyingKey, options.limit, options.refetchInterval]);

  return { data, isLoading, error };
}