import { useCallback, useEffect, useReducer, useRef } from "react";

export interface UseStellarQueryOptions<T> {
  enabled?: boolean;
  refetchInterval?: number;
  deduplicate?: boolean;
  initialData?: T | null;
}

export interface UseStellarQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  lastFetchedAt: Date | null;
  refetch: () => Promise<void>;
}

interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  lastFetchedAt: Date | null;
}

type QueryAction<T> =
  | { type: "FETCH_START"; hasData: boolean }
  | { type: "FETCH_SUCCESS"; payload: T | null }
  | { type: "FETCH_ERROR"; payload: Error }
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
  fetcher: () => Promise<T | null>,
  options: UseStellarQueryOptions<T> = {}
): UseStellarQueryResult<T> {
  const {
    enabled = true,
    refetchInterval = 0,
    deduplicate = true,
    initialData = null,
  } = options;

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

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    initialDataRef.current = initialData;
  });

  const refetch = useCallback(async () => {
    if (!enabled) return;
    if (deduplicate && isFetchingRef.current) return;

    // Abort any in-flight request before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    isFetchingRef.current = true;
    dispatch({ type: "FETCH_START", hasData: stateRef.current.data !== null });

    try {
      const result = await fetcherRef.current();
      dispatch({ type: "FETCH_SUCCESS", payload: result });
    } catch (err) {
      // Ignore AbortError from cancelled requests
      if (err instanceof Error && err.name === "AbortError") return;
      dispatch({
        type: "FETCH_ERROR",
        payload: err instanceof Error ? err : new Error(String(err)),
      });
    } finally {
      isFetchingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [enabled, deduplicate]);

  useEffect(() => {
    if (!enabled) {
      dispatch({ type: "RESET", payload: initialDataRef.current });
      return;
    }

    void refetch();

    if (refetchInterval > 0) {
      timerRef.current = setInterval(() => {
        void refetch();
      }, refetchInterval);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
    // initialData intentionally omitted: read via initialDataRef instead.
    // Depending on it directly would re-run this effect on every render
    // whenever a caller passes an inline literal (e.g. `initialData: []`),
    // since a fresh array/object reference never equals the previous one -
    // causing an infinite fetch -> render -> fetch loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, refetch, refetchInterval, fetcher]);

  return {
    data: state.data,
    isLoading: state.isLoading,
    isRefetching: state.isRefetching,
    error: state.error,
    lastFetchedAt: state.lastFetchedAt,
    refetch,
  };
}
