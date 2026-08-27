/**
 * @file useStellarQuery.ts
 * @description Central polling engine for read-only Stellar/Horizon queries.
 *   Supports optional in-memory TTL caching via `cacheKey` / `cacheTtl` to
 *   avoid redundant network calls across hook instances.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useHookActivityDebug } from "../devtools/useHookActivityDebug";
import { useStellarContext } from "../context";
import { StellarHookError } from "../utils/errors";
import { getCache, setCache } from "../utils";

export interface UseStellarQueryOptions<T> {
  enabled?: boolean;
  refetchInterval?: number;
  deduplicate?: boolean;
  initialData?: T | null;
  debugLabel?: string;
  /**
   * Delay in milliseconds before the initial fetch fires when deps change.
   * When > 0 the fetch triggered by mount / dep changes is debounced: if deps
   * change again within the window the timer resets (coalesces rapid changes).
   * Polling-interval ticks are NOT debounced — only the trigger effect.
   * Default: 0 (no debounce — backward compatible).
   */
  debounceDelay?: number;
   * When provided, the query result is stored in (and retrieved from) the
   * shared module-level in-memory cache under this key.  If absent, caching
   * is disabled for this instance (backward-compatible default).
   */
  cacheKey?: string;
  /**
   * Time-to-live for the cached entry in milliseconds.
   * Defaults to `5000` (5 seconds) when `cacheKey` is set.
   */
  cacheTtl?: number;
}

export interface UseStellarQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: StellarHookError | null;
  lastFetchedAt: Date | null;
  refetch: () => Promise<void>;
}

interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: StellarHookError | null;
  lastFetchedAt: Date | null;
}

type QueryAction<T> =
  | { type: "FETCH_START"; hasData: boolean }
  | { type: "FETCH_SUCCESS"; payload: T | null }
  | { type: "FETCH_ERROR"; payload: StellarHookError }
  | { type: "RESET"; payload: T | null };

function reducer<T>(state: QueryState<T>, action: QueryAction<T>): QueryState<T> {
  switch (action.type) {
    case "FETCH_START":
      return {
        ...state,
        isLoading: !action.hasData && !state.isRefetching,
        isRefetching: action.hasData,
        error: null,
      };
    case "FETCH_SUCCESS":
      return {
        data: action.payload,
        isLoading: false,
        isRefetching: false,
        error: null,
        lastFetchedAt: new Date(),
      };
    case "FETCH_ERROR":
      return {
        ...state,
        isLoading: false,
        isRefetching: false,
        error: action.payload,
      };
    case "RESET":
      return {
        data: action.payload,
        isLoading: false,
        isRefetching: false,
        error: null,
        lastFetchedAt: null,
      };
    default:
      return state;
  }
}

/** Default TTL used when `cacheKey` is provided but `cacheTtl` is not. */
const DEFAULT_CACHE_TTL = 5000;

export function useStellarQuery<T>(
  fetcher: (signal?: AbortSignal) => Promise<T | null>,
  options: UseStellarQueryOptions<T> = {}
): UseStellarQueryResult<T> {
  const {
    enabled = true,
    refetchInterval = 0,
    deduplicate = true,
    initialData = null,
    debugLabel = "useStellarQuery",
    debounceDelay = 0,
    cacheKey,
    cacheTtl = DEFAULT_CACHE_TTL,
  } = options;

  const { networkEpoch } = useStellarContext();

  const [state, dispatch] = useReducer(reducer<T>, {
    data: initialData,
    isLoading: false,
    isRefetching: false,
    error: null,
    lastFetchedAt: null,
  });

  const stateRef = useRef(state);
  const fetcherRef = useRef(fetcher);
  const initialDataRef = useRef(initialData);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const networkEpochRef = useRef(networkEpoch);
  const debounceDelayRef = useRef(debounceDelay);

  // Keep option refs up-to-date so the callback always sees the latest values
  // without needing to be re-created.
  const cacheKeyRef = useRef(cacheKey);
  const cacheTtlRef = useRef(cacheTtl);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    initialDataRef.current = initialData;
  });

  useEffect(() => {
    networkEpochRef.current = networkEpoch;
  }, [networkEpoch]);

  useEffect(() => {
    debounceDelayRef.current = debounceDelay;
  }, [debounceDelay]);
    cacheKeyRef.current = cacheKey;
  }, [cacheKey]);

  useEffect(() => {
    cacheTtlRef.current = cacheTtl;
  }, [cacheTtl]);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    if (deduplicate && isFetchingRef.current) return;

    const key = cacheKeyRef.current;
    const ttl = cacheTtlRef.current;

    // ── Cache hit: dispatch immediately, skip network call ──────────────────
    if (key) {
      const cached = getCache<T>(key);
      if (cached !== null) {
        dispatch({ type: "FETCH_SUCCESS", payload: cached });
        return;
      }
    }

    // ── Cache miss (or caching disabled): perform the network fetch ─────────
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const signal = abortControllerRef.current.signal;
    const epoch = networkEpochRef.current;

    isFetchingRef.current = true;
    dispatch({ type: "FETCH_START", hasData: stateRef.current.data !== null });

    try {
      const result = await fetcherRef.current(signal);
      if (epoch !== networkEpochRef.current) return;

      // Populate the cache on success when a key is configured.
      if (key && result !== null) {
        setCache<T>(key, result, ttl);
      }

      dispatch({ type: "FETCH_SUCCESS", payload: result });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      if (epoch !== networkEpochRef.current) return;
      dispatch({
        type: "FETCH_ERROR",
        payload: StellarHookError.from(err),
      });
    } finally {
      if (epoch === networkEpochRef.current) {
        isFetchingRef.current = false;
        abortControllerRef.current = null;
      }
    }
  }, [enabled, deduplicate]);

  useEffect(() => {
    // 1. Always clear any existing interval before setting up a new one
    // to prevent memory/network leaks when dependencies change.
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Cancel any pending debounce timer from a previous dep change.
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (!enabled) {
      dispatch({ type: "RESET", payload: initialDataRef.current });
      return;
    }

    const delay = debounceDelayRef.current;

    if (delay > 0) {
      // Debounced path: wait `delay` ms before executing the initial fetch.
      // If deps change again within the window this effect re-runs, cancels
      // the previous timer (above), and starts a fresh one — coalescing rapid
      // changes into a single fetch.
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        void refetch();
      }, delay);
    } else {
      // No debounce: fire immediately (backward-compatible default).
      void refetch();
    }

    // 2. Set new interval if required.
    // Polling ticks are NOT debounced — they fire on schedule regardless of
    // whether the initial trigger was debounced.
    if (refetchInterval > 0) {
      timerRef.current = setInterval(() => {
        void refetch();
      }, refetchInterval);
    }

    // 3. Cleanup on unmount or dependency change.
    return () => {
      // Cancel pending debounce timer so no fetch fires after unmount.
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      isFetchingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, refetch, refetchInterval, fetcher]);

  const debugStatus = !enabled
    ? "disabled"
    : state.isLoading
      ? "loading"
      : state.isRefetching
        ? "refetching"
        : state.error
          ? "error"
          : state.lastFetchedAt
            ? "success"
            : "idle";

  useHookActivityDebug({
    name: debugLabel,
    status: debugStatus,
    error: state.error,
  });

  return {
    data: state.data,
    isLoading: state.isLoading,
    isRefetching: state.isRefetching,
    error: state.error,
    lastFetchedAt: state.lastFetchedAt,
    refetch,
  };
}
