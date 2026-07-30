/**
 * @file useStellarAccount.ts
 * @description Hook for fetching a single Stellar account from Horizon.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { getHorizonServer } from "../utils/memoizedServers";
import { useStellarContext } from "../context";
import type { StellarAccountData, StellarPublicKey } from "../types";
import { parseAccountResponse, validatePublicKey } from "../utils";
import { useStellarQuery } from "./useStellarQuery";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseStellarAccountOptions {
  /** Whether the query is enabled. Defaults to true. */
  enabled?: boolean;
  /** Polling interval in milliseconds. If 0, polling is disabled. Defaults to 0. */
  refetchInterval?: number;
  /**
   * When true (default), concurrent duplicate requests are suppressed — if a fetch
   * is already in-flight when the next poll fires, that poll tick is skipped.
   * Set to false to allow overlapping requests.
   */
  deduplicate?: boolean;
}

export interface UseStellarAccountReturn {
  /** The parsed account data. Matches 'account' in issue #63. */
  account: StellarAccountData | null;
  /** Alias for account, maintained for backward compatibility. */
  data: StellarAccountData | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  /** Timestamp of the last successful fetch. */
  lastFetchedAt: Date | null;
  /** Manually trigger a refetch of the account data. */
  refetch: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetch and optionally poll a single Stellar account from Horizon.
 *
 * For multi-account lookups (e.g. fetching several signers or a multisig roster
 * in parallel), see {@link useStellarAccounts}.
 *
 * @param publicKey  Stellar public key (G…) to look up. Pass `null`/`undefined` to suspend the fetch.
 * @param options    Configuration (enabled, refetchInterval, deduplicate).
 *
 * @example
 * ```tsx
 * const { account, isLoading, error, refetch, lastFetchedAt } = useStellarAccount(
 *   "GAAZI4...",
 *   { refetchInterval: 10_000 },
 * );
 * ```
 */
export function useStellarAccount(
  publicKey: StellarPublicKey | null | undefined,
  options: UseStellarAccountOptions = {},
): UseStellarAccountReturn {
  const { enabled = true, refetchInterval = 0, deduplicate = true } = options;
  const { config } = useStellarContext();

  const fetchAccount = useCallback(async (signal?: AbortSignal): Promise<StellarAccountData | null> => {
    if (!publicKey) return null;
    validatePublicKey(publicKey);
    const server = getHorizonServer(config.horizonUrl);
    const rawAccount = await server.loadAccount(publicKey);
    return parseAccountResponse(rawAccount);
  }, [publicKey, config.horizonUrl]);

  const state = useStellarQuery<StellarAccountData | null>(fetchAccount, {
    enabled: enabled && Boolean(publicKey),
    refetchInterval,
    deduplicate,
    initialData: null,
    debugLabel: "useStellarAccount",
  });

  return useMemo(
    () => ({
      account: state.data,
      data: state.data,
      isLoading: state.isLoading,
      isRefetching: state.isRefetching,
      error: state.error,
      lastFetchedAt: state.lastFetchedAt,
      refetch: state.refetch,
    }),
    [
      state.data,
      state.isLoading,
      state.isRefetching,
      state.error,
      state.lastFetchedAt,
      state.refetch,
    ],
  );
}

/**
 * React Suspense-compatible variant of {@link useStellarAccount}.
 * Throws a Promise during data fetching for `<Suspense>` boundaries
 * and throws Errors for `<ErrorBoundary>` boundaries.
 */
export function useSuspenseStellarAccount(
  publicKey: StellarPublicKey | null | undefined,
  options: UseStellarAccountOptions = {},
): UseStellarAccountReturn {
  const state = useStellarAccount(publicKey, options);
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

  if ((options.enabled ?? true) && Boolean(publicKey)) {
    if (state.error) {
      throw state.error;
    }
    if (state.isLoading && state.data === null && promiseRef.current) {
      throw promiseRef.current.promise;
    }
  }

  return state;
}
