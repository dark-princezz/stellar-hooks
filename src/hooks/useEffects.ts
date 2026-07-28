/**
 * @file useEffects.ts
 * @description Hook for streaming account effects from Horizon.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import { Horizon } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { getHorizonServer } from "../utils/memoizedServers";

export interface UseEffectsOptions {
  /** Whether the hook is active. Default: true */
  enabled?: boolean;
  /** Max number of effects to fetch per page. Default: 20 */
  limit?: number;
  /** Sort order for fetched and streamed effects. Default: "desc" */
  order?: "asc" | "desc";
  /** Pagination cursor for the initial fetch and stream */
  cursor?: string;
  /** Subscribe to Horizon SSE for live effect updates. Default: true */
  stream?: boolean;
}

/**
 * @example
 * ```tsx
 * const {
 *   effects,      // Horizon.ServerApi.EffectRecord[]
 *   isLoading,    // boolean
 *   isStreaming,  // boolean — true while SSE is active
 *   error,        // Error | null
 *   lastFetchedAt,// Date | null
 *   refetch,      // () => Promise<void>
 *   stop,         // () => void — close the SSE stream
 *   start,        // () => void — reopen the SSE stream
 * } = useEffects("G...");
 * ```
 */
export interface UseEffectsReturn {
  effects: Horizon.ServerApi.EffectRecord[];
  isLoading: boolean;
  isStreaming: boolean;
  error: Error | null;
  lastFetchedAt: Date | null;
  refetch: () => Promise<void>;
  stop: () => void;
  start: () => void;
}

interface EffectsState {
  effects: Horizon.ServerApi.EffectRecord[];
  isLoading: boolean;
  isStreaming: boolean;
  error: Error | null;
  lastFetchedAt: Date | null;
}

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: Horizon.ServerApi.EffectRecord[] }
  | { type: "STREAM_EFFECT"; payload: Horizon.ServerApi.EffectRecord; order: "asc" | "desc" }
  | { type: "STREAMING"; payload: boolean }
  | { type: "FETCH_ERROR"; payload: Error };

function mergeEffect(
  effects: Horizon.ServerApi.EffectRecord[],
  effect: Horizon.ServerApi.EffectRecord,
  order: "asc" | "desc"
): Horizon.ServerApi.EffectRecord[] {
  if (effects.some((item) => item.id === effect.id)) {
    return effects;
  }

  return order === "desc" ? [effect, ...effects] : [...effects, effect];
}

function reducer(state: EffectsState, action: Action): EffectsState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, isLoading: true, error: null };
    case "FETCH_SUCCESS":
      return {
        ...state,
        effects: action.payload,
        isLoading: false,
        error: null,
        lastFetchedAt: new Date(),
      };
    case "STREAM_EFFECT":
      return {
        ...state,
        effects: mergeEffect(state.effects, action.payload, action.order),
        lastFetchedAt: new Date(),
      };
    case "STREAMING":
      return { ...state, isStreaming: action.payload };
    case "FETCH_ERROR":
      return { ...state, isLoading: false, error: action.payload };
    default:
      return state;
  }
}

const initialState: EffectsState = {
  effects: [],
  isLoading: false,
  isStreaming: false,
  error: null,
  lastFetchedAt: null,
};

/**
 * Fetches and streams Stellar account effects from Horizon.
 *
 * On mount, loads an initial page via REST. When `stream` is enabled (default),
 * subscribes to Horizon SSE and appends new effects as they arrive.
 */
export function useEffects(
  publicKey: string | null | undefined,
  options: UseEffectsOptions = {}
): UseEffectsReturn {
  const {
    enabled = true,
    limit = 20,
    order = "desc",
    cursor,
    stream = true,
  } = options;
  const { config } = useStellarContext();
  const [state, dispatch] = useReducer(reducer, initialState);

  const closeStreamRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);
  const streamEnabledRef = useRef(stream);
  const orderRef = useRef(order);

  const closeStream = useCallback(() => {
    if (closeStreamRef.current) {
      closeStreamRef.current();
      closeStreamRef.current = null;
    }
    if (isMountedRef.current) {
      dispatch({ type: "STREAMING", payload: false });
    }
  }, []);

  const openStream = useCallback(() => {
    if (!publicKey || !streamEnabledRef.current) return;

    closeStream();

    const server = getHorizonServer(config.horizonUrl);
    let builder = server.effects().forAccount(publicKey).order(orderRef.current);

    if (cursor) {
      builder = builder.cursor(cursor);
    }

    const close = builder.stream({
      onmessage: (effect: Horizon.ServerApi.EffectRecord) => {
        if (!isMountedRef.current) return;
        dispatch({
          type: "STREAM_EFFECT",
          payload: effect,
          order: orderRef.current,
        });
      },
      onerror: () => {
        if (!isMountedRef.current) return;
        dispatch({
          type: "FETCH_ERROR",
          payload: new Error("Horizon effects stream error"),
        });
        closeStream();
      },
    });

    closeStreamRef.current = close;
    dispatch({ type: "STREAMING", payload: true });
  }, [publicKey, config.horizonUrl, cursor, closeStream]);

  const refetch = useCallback(async () => {
    if (!publicKey) return;

    dispatch({ type: "FETCH_START" });

    try {
      const server = getHorizonServer(config.horizonUrl);
      let builder = server
        .effects()
        .forAccount(publicKey)
        .limit(limit)
        .order(order);

      if (cursor) {
        builder = builder.cursor(cursor);
      }

      const response = await builder.call();

      if (isMountedRef.current) {
        dispatch({ type: "FETCH_SUCCESS", payload: response.records });
      }
    } catch (err) {
      if (isMountedRef.current) {
        dispatch({
          type: "FETCH_ERROR",
          payload: err instanceof Error ? err : new Error(String(err)),
        });
      }
    }
  }, [publicKey, config.horizonUrl, limit, order, cursor]);

  const stop = useCallback(() => {
    streamEnabledRef.current = false;
    closeStream();
  }, [closeStream]);

  const start = useCallback(() => {
    streamEnabledRef.current = true;
    openStream();
  }, [openStream]);

  useEffect(() => {
    orderRef.current = order;
    streamEnabledRef.current = stream;
  }, [order, stream]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled || !publicKey) {
      return () => {
        isMountedRef.current = false;
        closeStream();
      };
    }

    void refetch();

    if (stream) {
      openStream();
    }

    return () => {
      isMountedRef.current = false;
      closeStream();
    };
  }, [enabled, publicKey, stream, refetch, openStream, closeStream]);

  return {
    ...state,
    refetch,
    stop,
    start,
  };
}
