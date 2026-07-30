import { useCallback, useEffect, useReducer, useRef } from "react";
import { useHookActivityDebug } from "../devtools/useHookActivityDebug";
import { useStellarContext } from "../context";
import { StellarHookError } from "../utils/errors";

export interface UseStellarQueryOptions<T> {
  enabled?: boolean;
  refetchInterval?: number;
  deduplicate?: boolean;
  initialData?: T | null;
  debugLabel?: string;
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
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const networkEpochRef = useRef(networkEpoch);

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

  const refetch = useCallback(async () => {
    if (!enabled) return;
    if (deduplicate && isFetchingRef.current) return;

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

    if (!enabled) {
      dispatch({ type: "RESET", payload: initialDataRef.current });
      return;
    }

    void refetch();

    // 2. Set new interval if required
    if (refetchInterval > 0) {
      timerRef.current = setInterval(() => {
        void refetch();
      }, refetchInterval);
    }

    // 3. Cleanup on unmount or dependency change
    return () => {
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
