/**
 * @file useStellarAccounts.ts
 * @description Hook for fetching and polling multiple Stellar accounts in
 *              parallel from a list of public keys.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useMemo } from "react";
import { getHorizonServer } from "../utils/memoizedServers";
import { useStellarContext } from "../context";
import type { StellarAccountData, StellarPublicKey } from "../types";
import { parseAccountResponse, validatePublicKey } from "../utils";
import { useStellarQuery } from "./useStellarQuery";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseStellarAccountsOptions {
  /** Whether the query is enabled. Defaults to true. */
  enabled?: boolean;
  /** Polling interval in milliseconds. If 0, polling is disabled. Defaults to 0. */
  refetchInterval?: number;
  /**
   * When true (default), the underlying {@link useStellarQuery} suppresses
   * overlapping poll ticks while a batch is in flight. Set to false to
   * allow overlapping requests (rarely needed; useful for forcing fresh
   * data after a poll-driven UI update is gated on the result).
   */
  deduplicate?: boolean;
}

export interface UseStellarAccountsReturn {
  /**
   * Map of publicKey → parsed account data. Entries are `null` when the
   * key's fetch failed; missing keys mean the key was not in the input.
   */
  accounts: Record<string, StellarAccountData | null>;
  /**
   * Map of publicKey → per-key error (only present when that specific
   * key's fetch failed). Keys with no error map to `null`.
   */
  errors: Record<string, Error | null>;
  /** `true` while the initial batched fetch is in flight. */
  isLoading: boolean;
  /** `true` while a polling/refresh tick is in flight. */
  isRefetching: boolean;
  /** `true` if any key's fetch failed in the most recent batch. */
  isError: boolean;
  /** Aggregate error (first failure across the batch), or `null`. */
  error: Error | null;
  /** Timestamp of the last successful batch. */
  lastFetchedAt: Date | null;
  /** Manually trigger a refetch of all keys. */
  refetch: () => Promise<void>;
}

interface BatchedResult {
  accounts: Record<string, StellarAccountData | null>;
  errors: Record<string, Error | null>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetch and optionally poll multiple Stellar accounts in parallel from a list
 * of public keys. Internally issues one Horizon `loadAccount` call per unique
 * key and aggregates the results into a `Record<publicKey, StellarAccountData>`
 * map. Per-key errors are captured individually so a single missing account
 * doesn't poison the whole batch.
 *
 * @param publicKeys  Stellar public keys to look up. `null`/`undefined` entries are skipped.
 *                    Duplicate entries are de-duplicated before the RPC call.
 * @param options     enabled / refetchInterval / deduplicate directives applied uniformly.
 *
 * @example
 * ```tsx
 * const { accounts, isLoading, isError, refetch } = useStellarAccounts(
 *   [signerA, signerB, signerC],
 *   { refetchInterval: 10_000 },
 * );
 *
 * if (isLoading) return <Spinner />;
 * if (isError) return <ErrorBanner onRetry={refetch} />;
 *
 * return (
 *   <ul>
 *     {Object.entries(accounts).map(([pk, account]) => (
 *       <li key={pk}>{account?.sequence ?? "—"}</li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export function useStellarAccounts(
  publicKeys: (StellarPublicKey | null | undefined)[],
  options: UseStellarAccountsOptions = {},
): UseStellarAccountsReturn {
  const { enabled = true, refetchInterval = 0, deduplicate = true } = options;
  const { config } = useStellarContext();

  // Stable, deterministic fetch key (order-independent, dedup-aware) so
  // StrictMode double-invokes and reordered keys don't restart the fetch
  // unnecessarily.
  const fetchKey = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const k of publicKeys) {
      if (typeof k === "string" && k.length > 0 && !seen.has(k)) {
        seen.add(k);
        ordered.push(k);
      }
    }
    ordered.sort();
    return ordered.join("|");
  }, [publicKeys]);

  const fetchBatch = useCallback(async (): Promise<BatchedResult | null> => {
    const valid = publicKeys.filter(
      (k): k is StellarPublicKey => typeof k === "string" && k.length > 0,
    );
    const unique = Array.from(new Set(valid));
    if (unique.length === 0) {
      return { accounts: {}, errors: {} };
    }

    const server = getHorizonServer(config.horizonUrl);

    const settled = await Promise.all(
      unique.map(async (pk) => {
        try {
          validatePublicKey(pk);
          const raw = await server.loadAccount(pk);
          return [pk, parseAccountResponse(raw)] as const;
        } catch (err) {
          return [pk, err instanceof Error ? err : new Error(String(err))] as const;
        }
      }),
    );

    const accounts: Record<string, StellarAccountData | null> = {};
    const errors: Record<string, Error | null> = {};

    for (const [pk, valueOrError] of settled) {
      if (valueOrError instanceof Error) {
        accounts[pk] = null;
        errors[pk] = valueOrError;
      } else {
        accounts[pk] = valueOrError;
        errors[pk] = null;
      }
    }
    return { accounts, errors };
    // publicKeys is intentionally omitted: fetchKey is its stable,
    // order-independent, deduplicated proxy. Depending on the raw array
    // reference here would re-create fetchBatch (and re-trigger the query
    // effect) on every render whenever the caller passes a fresh array
    // literal, causing a refetch loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey, config.horizonUrl]);

  const state = useStellarQuery<BatchedResult | null>(fetchBatch, {
    enabled: enabled && fetchKey !== "",
    refetchInterval,
    deduplicate,
    initialData: null,
    debugLabel: "useStellarAccounts",
  });

  return useMemo(() => {
    const data = state.data;
    const accounts = data?.accounts ?? {};
    const errors = data?.errors ?? {};

    // Aggregate: first per-key error wins. Top-level `error` is also set by
    // useStellarQuery only if the whole batch threw (shouldn't happen — we
    // catch per-key — but we still surface it for completeness).
    let aggregateError: Error | null = state.error;
    for (const v of Object.values(errors)) {
      if (v instanceof Error) {
        aggregateError = v;
        break;
      }
    }

    return {
      accounts,
      errors,
      isLoading: state.isLoading,
      isRefetching: state.isRefetching,
      isError: aggregateError !== null,
      error: aggregateError,
      lastFetchedAt: state.lastFetchedAt,
      refetch: state.refetch,
    };
  }, [state.data, state.isLoading, state.isRefetching, state.error, state.lastFetchedAt, state.refetch]);
}
