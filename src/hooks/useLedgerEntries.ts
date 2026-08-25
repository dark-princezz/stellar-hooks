/**
 * @file useLedgerEntries.ts
 * @description Hook for fetching multiple Soroban ledger entries from Soroban RPC.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { xdr } from "@stellar/stellar-sdk";
import * as rpc from "@stellar/stellar-sdk/rpc";
import { useStellarContext } from "../context";
import { getCache, setCache } from "../utils";
import { useStellarQuery } from "./useStellarQuery";

// ─── Options & Types ──────────────────────────────────────────────────────────

export interface UseLedgerEntriesOptions {
  /** Set false to skip automatic fetching. Default: true */
  enabled?: boolean;
  /** Poll every N ms. Set to 0 to disable. Default: 0 */
  refetchInterval?: number;
  /** Time-to-live for cache in milliseconds (default: 60000 = 1 minute) */
  cacheTTL?: number;
}

export interface LedgerEntriesState {
  /** Raw ledger entry results from Soroban RPC, or `null` if not yet fetched. */
  data: rpc.Api.LedgerEntryResult[] | null;
  /** Alias for data. */
  entries: rpc.Api.LedgerEntryResult[] | null;
  /** `true` while the initial ledger entry fetch is in flight. */
  isLoading: boolean;
  /** `true` while a manual refetch (or polling tick) is in flight after the first load. */
  isRefetching: boolean;
  /** Most recent fetch error, or `null`. */
  error: Error | null;
  /** Manually trigger a re-fetch of the ledger entries. */
  refetch: () => Promise<void>;
  /** Timestamp of the most recent successful fetch, or `null` if never fetched. */
  lastFetchedAt: Date | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetch and decode multiple raw Soroban ledger entries by their XDR keys.
 * Useful for reading contract storage, persistent entries, or multiple contract states directly.
 *
 * @param ledgerKeys Array of xdr.LedgerKey instances to query. Pass `null`/`undefined` or empty array to suspend fetch.
 * @param options Query options (enabled, refetchInterval, cacheTTL).
 *
 * @example
 * ```tsx
 * const keys = [
 *   xdr.LedgerKey.contractData(...),
 *   xdr.LedgerKey.contractData(...),
 * ];
 *
 * const { entries, isLoading, error, refetch } = useLedgerEntries(keys, {
 *   refetchInterval: 5000,
 * });
 * ```
 */
export function useLedgerEntries(
  ledgerKeys: xdr.LedgerKey[] | null | undefined,
  options: UseLedgerEntriesOptions = {},
): LedgerEntriesState {
  const { enabled = true, refetchInterval = 0, cacheTTL = 60000 } = options;
  const { config } = useStellarContext();
  const bypassCacheRef = useRef(false);

  const keysToFetch = useMemo(() => {
    if (!ledgerKeys || ledgerKeys.length === 0) return null;
    return ledgerKeys;
  }, [ledgerKeys]);

  const fetch = useCallback(async (_signal?: AbortSignal): Promise<rpc.Api.LedgerEntryResult[] | null> => {
    if (!keysToFetch || keysToFetch.length === 0) return null;

    const keyXdrs = keysToFetch.map((k) => k.toXDR("base64")).sort().join(":");
    const cacheKey = `ledger-entries-${keyXdrs}-${config.network}`;

    if (bypassCacheRef.current) {
      bypassCacheRef.current = false;
    } else {
      const cached = getCache<rpc.Api.LedgerEntryResult[]>(cacheKey);
      if (cached) return cached;
    }

    const server = new rpc.Server(config.sorobanRpcUrl);
    const result = await server.getLedgerEntries(...keysToFetch);

    const entries = result.entries ?? [];
    setCache(cacheKey, entries, cacheTTL);
    return entries;
  }, [keysToFetch, config.sorobanRpcUrl, config.network, cacheTTL]);

  const state = useStellarQuery<rpc.Api.LedgerEntryResult[] | null>(fetch, {
    enabled: enabled && Boolean(keysToFetch && keysToFetch.length > 0),
    refetchInterval,
    initialData: null,
    debugLabel: "useLedgerEntries",
  });

  const refetch = useCallback(async () => {
    bypassCacheRef.current = true;
    await state.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.refetch]);

  return useMemo(
    () => ({
      data: state.data,
      entries: state.data,
      isLoading: state.isLoading,
      isRefetching: state.isRefetching,
      error: state.error,
      lastFetchedAt: state.lastFetchedAt,
      refetch,
    }),
    [state.data, state.isLoading, state.isRefetching, state.error, state.lastFetchedAt, refetch]
  );
}

/**
 * React Suspense-compatible variant of {@link useLedgerEntries}.
 * Throws a Promise during data fetching for `<Suspense>` boundaries
 * and throws Errors for `<ErrorBoundary>` boundaries.
 */
export function useSuspenseLedgerEntries(
  ledgerKeys: xdr.LedgerKey[] | null | undefined,
  options: UseLedgerEntriesOptions = {},
): LedgerEntriesState {
  const state = useLedgerEntries(ledgerKeys, options);
  const promiseRef = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null);

  if (!promiseRef.current) {
    let resolveFn!: () => void;
    const promise = new Promise<void>((resolve) => {
      resolveFn = resolve;
    });
    promiseRef.current = { promise, resolve: resolveFn };
  }

  useEffect(() => {
    if (!state.isLoading && promiseRef.current) {
      promiseRef.current.resolve();
      promiseRef.current = null;
    }
  }, [state.isLoading]);

  if ((options.enabled ?? true) && Boolean(ledgerKeys && ledgerKeys.length > 0)) {
    if (state.error) {
      throw state.error;
    }
    if (state.isLoading && state.data === null && promiseRef.current) {
      throw promiseRef.current.promise;
    }
  }

  return state;
}
