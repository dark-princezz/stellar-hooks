/**
 * @file useLedgerEntry.ts
 * @description Hook for fetching ledger entries from Soroban RPC.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { xdr } from "@stellar/stellar-sdk";
import * as rpc from "@stellar/stellar-sdk/rpc";
import { useStellarContext } from "../context";
import type { LedgerEntryState } from "../types";
import { getCache, setCache } from "../utils";
import { useStellarQuery } from "./useStellarQuery";

// ─── Options ──────────────────────────────────────────────────────────────────

export interface UseLedgerEntryOptions {
  /** Set false to skip automatic fetching. Default: true */
  enabled?: boolean;
  /** Poll every N ms. Set to 0 to disable. Default: 0 */
  refetchInterval?: number;
  /** Time-to-live for cache in milliseconds (default: 60000 = 1 minute) */
  cacheTTL?: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Read a raw Soroban ledger entry by its XDR key.
 * Useful for reading persistent contract data without constructing a full
 * contract call.
 *
 * This hook provides direct access to Soroban ledger entries via the RPC API.
 * It's ideal for reading contract storage, persistent data, or any ledger entry
 * without the overhead of contract invocation.
 *
 * @param ledgerKey - XDR LedgerKey to fetch (use xdr.LedgerKey helpers to construct)
 * @param options - Configuration options for the fetch
 * @param options.enabled - Set false to skip automatic fetching (default: true)
 * @param options.refetchInterval - Poll every N ms, 0 = disabled (default: 0)
 * @param options.cacheTTL - Time-to-live for cache in milliseconds (default: 60000 = 1 minute)
 *
 * @returns Object containing ledger entry data and query state
 * @returns {object|null} returns.data - SorobanRpc.Api.LedgerEntryResult or null if not found
 * @returns {boolean} returns.isLoading - True during initial fetch
 * @returns {boolean} returns.isRefetching - True during polling/refresh
 * @returns {Error|null} returns.error - Any error from the fetch
 * @returns {Date|null} returns.lastFetchedAt - Timestamp of last successful fetch
 * @returns {function} returns.refetch - Manually trigger a refetch
 *
 * @example
 * ```tsx
 * // Build the ledger key for a persistent "Counter" entry
 * const key = xdr.LedgerKey.contractData(
 *   new xdr.LedgerKeyContractData({
 *     contract: new Address(CONTRACT_ID).toScAddress(),
 *     key: xdr.ScVal.scvSymbol("Counter"),
 *     durability: xdr.ContractDataDurability.persistent(),
 *   })
 * );
 *
 * const {
 *   data,          // SorobanRpc.Api.LedgerEntryResult | null
 *   isLoading,     // boolean
 *   error,         // Error | null
 *   lastFetchedAt, // Date | null
 *   refetch,       // () => Promise<void>
 * } = useLedgerEntry(key, { refetchInterval: 3000 });
 *
 * const value = data
 *   ? scValToNative(data.val.contractData().val())
 *   : null;
 * ```
 *
 * @example
 * ```tsx
 * // Poll for ledger entry changes
 * const { data, isLoading } = useLedgerEntry(ledgerKey, { refetchInterval: 5000 });
 *
 * if (isLoading) return <Spinner />;
 * if (!data) return <div>Entry not found</div>;
 *
 * return <div>Value: {scValToNative(data.val.contractData().val())}</div>;
 * ```
 */
export function useLedgerEntry(
  ledgerKey: xdr.LedgerKey | null | undefined,
  options: UseLedgerEntryOptions = {},
): LedgerEntryState {
  const { enabled = true, refetchInterval = 0, cacheTTL = 60000 } = options;
  const { config } = useStellarContext();
  const bypassCacheRef = useRef(false);

  const fetch = useCallback(async (_signal?: AbortSignal) => {
    if (!ledgerKey) return null;

    const cacheKey = `ledger-entry-${ledgerKey.toXDR("base64")}-${config.network}`;

    if (bypassCacheRef.current) {
      bypassCacheRef.current = false;
    } else {
      const cached = getCache<rpc.Api.LedgerEntryResult>(cacheKey);
      if (cached) return cached;
    }

    const server = new rpc.Server(config.sorobanRpcUrl);
    const result = await server.getLedgerEntries(ledgerKey);

    if (result.entries.length === 0) return null;

    const entry = result.entries[0];
    if (entry) {
      setCache(cacheKey, entry, cacheTTL);
      return entry;
    }

    return null;
  }, [ledgerKey, config.sorobanRpcUrl, config.network, cacheTTL]);

  const state = useStellarQuery<rpc.Api.LedgerEntryResult | null>(fetch, {
    enabled: enabled && Boolean(ledgerKey),
    refetchInterval,
    initialData: null,
    debugLabel: "useLedgerEntry",
  });

  const refetch = useCallback(async () => {
    bypassCacheRef.current = true;
    await state.refetch();
    // `state` itself is intentionally omitted: `state.refetch` is the only
    // stable field this callback needs, and depending on the whole object
    // would re-create `refetch` on every data/loading update from useStellarQuery.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.refetch]);

  return useMemo(
    () => ({
      data: state.data,
      isLoading: state.isLoading,
      isRefetching: state.isRefetching,
      error: state.error,
      lastFetchedAt: state.lastFetchedAt,
      refetch,
    }),
    [state.data, state.isLoading, state.isRefetching, state.error, state.lastFetchedAt, refetch]
  ) as LedgerEntryState;
}

/**
 * React Suspense-compatible variant of {@link useLedgerEntry}.
 * Throws a Promise during data fetching for `<Suspense>` boundaries
 * and throws Errors for `<ErrorBoundary>` boundaries.
 */
export function useSuspenseLedgerEntry(
  ledgerKey: xdr.LedgerKey | null | undefined,
  options: UseLedgerEntryOptions = {},
): LedgerEntryState {
  const state = useLedgerEntry(ledgerKey, options);
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

  if ((options.enabled ?? true) && Boolean(ledgerKey)) {
    if (state.error) {
      throw state.error;
    }
    if (state.isLoading && state.data === null && promiseRef.current) {
      throw promiseRef.current.promise;
    }
  }

  return state;
}
