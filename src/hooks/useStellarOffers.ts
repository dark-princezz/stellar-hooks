/**
 * @file useStellarOffers.ts
 * @description Hook for fetching open offers for a Stellar account.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Horizon } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { getHorizonServer } from "../utils/memoizedServers";
import { validatePublicKey } from "../utils";

export interface UseStellarOffersOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * @example
 * ```tsx
 * const {
 *   offers,        // Horizon.ServerApi.OfferRecord[] — open buy/sell offers
 *   isLoading,     // boolean
 *   error,         // Error | null
 *   lastFetchedAt, // Date | null
 *   refetch,       // () => Promise<void>
 * } = useStellarOffers("G...", { refetchInterval: 10_000 });
 *
 * // Each offer: { id, selling, buying, amount, price, seller, ... }
 * ```
 */
export interface UseStellarOffersReturn {
  offers: Horizon.ServerApi.OfferRecord[];
  isLoading: boolean;
  error: Error | null;
  lastFetchedAt: Date | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches open buy/sell offers from Horizon for a given account.
 */
export function useStellarOffers(
  publicKey: string | null | undefined,
  options?: UseStellarOffersOptions
): UseStellarOffersReturn {
  const { enabled = true, refetchInterval = 0 } = options || {};
  const { config } = useStellarContext();

  const [offers, setOffers] = useState<Horizon.ServerApi.OfferRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refetch = useCallback(async () => {
    if (!publicKey) return;

    setIsLoading(true);
    setError(null);

    try {
      validatePublicKey(publicKey);
      const server = getHorizonServer(config.horizonUrl);
      const response = await server.offers().forAccount(publicKey).call();
      setOffers(response.records);
      setLastFetchedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, config.horizonUrl]);

  useEffect(() => {
    if (!enabled || !publicKey) return;

    refetch();

    if (refetchInterval > 0) {
      intervalRef.current = setInterval(refetch, refetchInterval);
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, publicKey, refetch, refetchInterval]);

  return {
    offers,
    isLoading,
    error,
    lastFetchedAt,
    refetch,
  };
}