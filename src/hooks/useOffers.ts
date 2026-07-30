import { useCallback, useEffect, useRef, useState } from "react";
import { Horizon } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import type { UseOffersOptions, UseOffersReturn } from "../types";
import { getHorizonServer } from "../utils/memoizedServers";
import { validatePublicKey } from "../utils";

export type { UseOffersOptions, UseOffersReturn } from "../types";

export function useOffers(
  publicKey: string | null | undefined,
  options: UseOffersOptions = {}
): UseOffersReturn {
  const { enabled = true, refetchInterval = 0, limit = 10 } = options;
  const { config } = useStellarContext();

  const [offers, setOffers] = useState<Horizon.ServerApi.OfferRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prevCursor, setPrevCursor] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchIdRef = useRef(0);

  const fetchPage = useCallback(
    async (cursor?: string | null) => {
      if (!publicKey) return;

      const id = ++fetchIdRef.current;

      setIsLoading(true);
      setError(null);

      try {
        validatePublicKey(publicKey);
        const server = getHorizonServer(config.horizonUrl);
        const query = server.offers().forAccount(publicKey).limit(limit);
        const response = cursor ? await query.cursor(cursor).call() : await query.call();
        if (id !== fetchIdRef.current) return;
        const collection = response as Horizon.ServerApi.CollectionPage<Horizon.ServerApi.OfferRecord> & {
          _links?: {
            next?: { href?: string };
            prev?: { href?: string };
          };
        };
        setOffers(collection.records);
        const nextLink = collection._links?.next?.href;
        const prevLink = collection._links?.prev?.href;
        setNextCursor(nextLink ? new URL(nextLink).searchParams.get("cursor") : null);
        setPrevCursor(prevLink ? new URL(prevLink).searchParams.get("cursor") : null);
      } catch (err) {
        if (id === fetchIdRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (id === fetchIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [publicKey, config.horizonUrl, limit]
  );

  const refetch = useCallback(async () => {
    await fetchPage(null);
  }, [fetchPage]);

  const nextPage = useCallback(async () => {
    if (!nextCursor) return;
    await fetchPage(nextCursor);
  }, [fetchPage, nextCursor]);

  const prevPage = useCallback(async () => {
    if (!prevCursor) return;
    await fetchPage(prevCursor);
  }, [fetchPage, prevCursor]);

  useEffect(() => {
    if (!enabled || !publicKey) return;

    void refetch();

    if (refetchInterval > 0) {
      intervalRef.current = setInterval(() => {
        void refetch();
      }, refetchInterval);
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      fetchIdRef.current += 1;
    };
  }, [enabled, publicKey, refetch, refetchInterval]);

  return { offers, isLoading, error, refetch, nextPage, prevPage };
}
