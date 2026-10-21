/**
 * @file useEntryTtl.ts
 * @description Hook for reading the remaining TTL of a Soroban ledger entry
 *   (contract instance, code, or data) via Soroban RPC.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useMemo } from "react";
import type { xdr } from "@stellar/stellar-sdk";
import * as rpc from "@stellar/stellar-sdk/rpc";
import { useStellarContext } from "../context";
import { getCache, setCache } from "../utils";
import { useStellarQuery } from "./useStellarQuery";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Options for {@link useEntryTtl}. */
export interface UseEntryTtlOptions {
  /** Set false to skip automatic fetching. Default: true */
  enabled?: boolean;
  /** Poll every N ms. Set to 0 to disable. Default: 0 */
  refetchInterval?: number;
  /** Time-to-live for cache in milliseconds (default: 60000 = 1 minute) */
  cacheTTL?: number;
  /**
   * Assumed average ledger close time in seconds, used to estimate the
   * wall-clock time remaining. Default: 5 (Soroban's target close time).
   */
  ledgerCloseTimeSeconds?: number;
}

/** TTL snapshot for a single ledger entry. */
export interface EntryTtlData {
  /** Ledger sequence after which the entry is archived. */
  liveUntilLedgerSeq: number;
  /** Ledgers until the entry is archived (`liveUntilLedgerSeq - latestLedger`). */
  remainingLedgers: number;
  /**
   * Estimated wall-clock seconds until the entry is archived, derived from
   * `remainingLedgers` and `options.ledgerCloseTimeSeconds`. `null` when the
   * RPC response did not include `latestLedger`.
   */
  estimatedSecondsRemaining: number | null;
  /** True when the entry is already past its live-until ledger. */
  isArchived: boolean;
}

/** Return shape of {@link useEntryTtl}. */
export interface UseEntryTtlReturn {
  /** TTL snapshot, or `null` while loading / when the entry is missing. */
  data: EntryTtlData | null;
  /** `true` while the initial fetch is in flight. */
  isLoading: boolean;
  /** `true` while a refetch is in flight. */
  isRefetching: boolean;
  /** `true` when `error` is non-null. */
  isError: boolean;
  /** Most recent fetch error, or `null`. */
  error: Error | null;
  /** Manually trigger a re-fetch. */
  refetch: () => Promise<void>;
  /** Timestamp of the most recent successful fetch, or `null`. */
  lastFetchedAt: Date | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Read the remaining TTL of a Soroban ledger entry — a contract instance,
 * contract code, or contract data entry — identified by its `xdr.LedgerKey`.
 *
 * Returns the entry's `liveUntilLedgerSeq`, how many ledgers remain before it
 * is archived, and an estimated wall-clock time remaining. Poll with
 * `refetchInterval` to drive expiration countdowns, or call `refetch()` before
 * a write to detect entries that need restoring.
 *
 * @param ledgerKey - XDR LedgerKey of the entry (contractData, contractCode, or contractInstance)
 * @param options - Configuration options for the fetch
 * @param options.enabled - Set false to skip automatic fetching (default: true)
 * @param options.refetchInterval - Poll every N ms, 0 = disabled (default: 0)
 * @param options.cacheTTL - Cache time-to-live in milliseconds (default: 60000)
 * @param options.ledgerCloseTimeSeconds - Assumed ledger close time in seconds for the estimate (default: 5)
 *
 * @returns Object containing TTL data and query state
 * @returns {object|null} returns.data - EntryTtlData or null if not found
 * @returns {boolean} returns.isLoading - True during initial fetch
 * @returns {boolean} returns.isRefetching - True during polling/refresh
 * @returns {boolean} returns.isError - True when a fetch error occurred
 * @returns {Error|null} returns.error - Any error from the fetch
 * @returns {function} returns.refetch - Manually trigger a refetch
 * @returns {Date|null} returns.lastFetchedAt - Timestamp of last successful fetch
 *
 * @example
 * ```tsx
 * // Monitor a contract's storage entry TTL
 * const key = xdr.LedgerKey.contractData(
 *   new xdr.LedgerKeyContractData({
 *     contract: new Address(contractId).toScAddress(),
 *     key: xdr.ScVal.scvSymbol("Config"),
 *     durability: xdr.ContractDataDurability.persistent(),
 *   }),
 * );
 *
 * const { data, isLoading } = useEntryTtl(key, { refetchInterval: 30_000 });
 *
 * if (isLoading) return <Spinner />;
 * if (!data) return <div>Entry not found</div>;
 * if (data.isArchived) return <div>Entry is archived — restore it first.</div>;
 *
 * return (
 *   <div>
 *     Live until ledger {data.liveUntilLedgerSeq} (~
 *     {Math.round(data.estimatedSecondsRemaining!)}s remaining)
 *   </div>
 * );
 * ```
 */
export function useEntryTtl(
  ledgerKey: xdr.LedgerKey | null | undefined,
  options: UseEntryTtlOptions = {},
): UseEntryTtlReturn {
  const {
    enabled = true,
    refetchInterval = 0,
    cacheTTL = 60000,
    ledgerCloseTimeSeconds = 5,
  } = options;
  const { config } = useStellarContext();

  const fetch = useCallback(
    async (_signal?: AbortSignal): Promise<EntryTtlData | null> => {
      if (!ledgerKey) return null;

      const cacheKey = `entry-ttl-${ledgerKey.toXDR("base64")}-${config.network}`;
      const cached = getCache<EntryTtlData>(cacheKey);
      if (cached) return cached;

      const server = new rpc.Server(config.sorobanRpcUrl);
      const result = await server.getLedgerEntries(ledgerKey);

      const entry = result.entries[0];
      if (!entry || entry.liveUntilLedgerSeq === undefined) return null;

      const latestLedger = result.latestLedger;
      const remainingLedgers =
        latestLedger !== undefined ? entry.liveUntilLedgerSeq - latestLedger : 0;

      const data: EntryTtlData = {
        liveUntilLedgerSeq: entry.liveUntilLedgerSeq,
        remainingLedgers,
        estimatedSecondsRemaining:
          latestLedger !== undefined
            ? remainingLedgers * ledgerCloseTimeSeconds
            : null,
        isArchived: latestLedger !== undefined && remainingLedgers <= 0,
      };

      setCache(cacheKey, data, cacheTTL);
      return data;
    },
    [ledgerKey, config.sorobanRpcUrl, config.network, cacheTTL, ledgerCloseTimeSeconds],
  );

  const state = useStellarQuery<EntryTtlData>(fetch, {
    enabled: enabled && Boolean(ledgerKey),
    refetchInterval,
    initialData: null,
    debugLabel: "useEntryTtl",
  });

  return useMemo(
    () => ({
      data: state.data,
      isLoading: state.isLoading,
      isRefetching: state.isRefetching,
      isError: state.error !== null,
      error: state.error,
      refetch: state.refetch,
      lastFetchedAt: state.lastFetchedAt,
    }),
    [
      state.data,
      state.isLoading,
      state.isRefetching,
      state.error,
      state.refetch,
      state.lastFetchedAt,
    ],
  );
}
