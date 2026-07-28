/**
 * @file useLedgerEntry.ts
 * @description Hook for fetching ledger entries from Soroban RPC.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useMemo, useRef } from "react";
import { xdr } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { getRpcServer } from "../utils/memoizedServers";
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
 * @returns {LedgerEntryState}
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
 */
export function useLedgerEntry(
  ledgerKey: xdr.LedgerKey | null | undefined,
  options: UseLedgerEntryOptions = {},
): LedgerEntryState {
  const { enabled = true, refetchInterval = 0, cacheTTL = 60000 } = options;
  const { config } = useStellarContext();
  const bypassCacheRef = useRef(false);

  const fetch = useCallback(async () => {
    if (!ledgerKey) return null;

    const cacheKey = `ledger-entry-${ledgerKey.toXDR("base64")}-${config.network}`;

    if (bypassCacheRef.current) {
      bypassCacheRef.current = false;
    } else {
      const cached = getCache<rpc.Api.LedgerEntryResult>(cacheKey);
      if (cached) return cached;
    }

    const server = getRpcServer(config.sorobanRpcUrl);
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
