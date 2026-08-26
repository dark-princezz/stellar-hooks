/**
 * @file useEffects.ts
 * @description Hook for streaming account effects from Horizon with automatic reconnection.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import { Horizon } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { useHookActivityDebug } from "../devtools/useHookActivityDebug";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  /** Maximum number of effects to keep in state. Oldest are evicted. Default: 100 */
  maxEffects?: number;
  /** Filter effects by type prefix (e.g. "account", "trustline", "trade"). Default: undefined (all) */
  type?: string;
  /** Auto-reconnect the stream on error. Default: true */
  autoReconnect?: boolean;
  /** Delay in ms before auto-reconnecting after a stream error. Default: 3000 */
  reconnectDelay?: number;
}

/**
 * @example
 * ```tsx
 * const {
 *   effects,       // Horizon.ServerApi.EffectRecord[]
 *   isLoading,     // boolean
 *   isStreaming,   // boolean — true while SSE is active
 *   error,         // Error | null
 *   lastFetchedAt, // Date | null
 *   refetch,       // () => Promise<void>
 *   stop,          // () => void — close the SSE stream
 *   start,         // () => void — reopen the SSE stream
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

// ─── State ───────────────────────────────────────────────────────────────────

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
  | {
      type: "STREAM_EFFECT";
      payload: Horizon.ServerApi.EffectRecord;
      order: "asc" | "desc";
    }
  | { type: "TRIM"; maxEffects: number }
  | { type: "STREAMING"; payload: boolean }
  | { type: "FETCH_ERROR"; payload: Error };

function mergeEffect(
  effects: Horizon.ServerApi.EffectRecord[],
  effect: Horizon.ServerApi.EffectRecord,
  order: "asc" | "desc",
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
    case "STREAM_EFFECT": {
      const merged = mergeEffect(state.effects, action.payload, action.order);
      return {
        ...state,
        effects: merged,
        lastFetchedAt: new Date(),
      };
    }
    case "TRIM": {
      const { maxEffects } = action;
      if (state.effects.length <= maxEffects) return state;
      // Keep the newest `maxEffects` effects (effects are newest-first for desc)
      return {
        ...state,
        effects: state.effects.slice(0, maxEffects),
      };
    }
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

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Fetches and streams Stellar account effects from Horizon.
 *
 * On mount, loads an initial page via REST. When `stream` is enabled (default),
 * subscribes to Horizon SSE and appends new effects as they arrive.
 * Supports automatic reconnection on stream errors, effect type filtering,
 * and trimming to a maximum number of retained effects.
 *
 * @param publicKey - Stellar public key to fetch effects for
 * @param options - Configuration options
 * @returns Effects data, streaming state, and control functions
 */
export function useEffects(
  publicKey: string | null | undefined,
  options: UseEffectsOptions = {},
): UseEffectsReturn {
  const {
    enabled = true,
    limit = 20,
    order = "desc",
    cursor,
    stream = true,
    maxEffects = 100,
    type: typeFilter,
    autoReconnect = true,
    reconnectDelay = 3000,
  } = options;
  const { config } = useStellarContext();
  const [state, dispatch] = useReducer(reducer, initialState);

  useHookActivityDebug({
    name: "useEffects",
    status: state.isStreaming ? "streaming" : state.isLoading ? "loading" : "idle",
    error: state.error,
  });

  const closeStreamRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);
  const streamEnabledRef = useRef(stream);
  const orderRef = useRef(order);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);

  const closeStream = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptRef.current = 0;
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

    const server = new Horizon.Server(config.horizonUrl);
    let builder = server.effects().forAccount(publicKey).order(orderRef.current);

    if (cursor) {
      builder = builder.cursor(cursor);
    }

    const close = builder.stream({
      onmessage: (effect: Horizon.ServerApi.EffectRecord) => {
        if (!isMountedRef.current) return;
        // Apply type filter in-memory if needed
        if (typeFilter && !effect.type.startsWith(typeFilter)) return;
        reconnectAttemptRef.current = 0;
        dispatch({
          type: "STREAM_EFFECT",
          payload: effect,
          order: orderRef.current,
        });
        dispatch({ type: "TRIM", maxEffects });
      },
      onerror: () => {
        if (!isMountedRef.current) return;
        dispatch({
          type: "FETCH_ERROR",
          payload: new Error("Horizon effects stream error"),
        });
        closeStreamRef.current = null;
        dispatch({ type: "STREAMING", payload: false });

        // Auto-reconnect with exponential backoff
        if (autoReconnect && streamEnabledRef.current && isMountedRef.current) {
          const attempt = reconnectAttemptRef.current++;
          const delay = Math.min(reconnectDelay * Math.pow(1.5, attempt), 30000);
          reconnectTimerRef.current = setTimeout(() => {
            if (isMountedRef.current && streamEnabledRef.current) {
              openStream();
            }
          }, delay);
        }
      },
    });

    closeStreamRef.current = close;
    dispatch({ type: "STREAMING", payload: true });
  }, [
    publicKey,
    config.horizonUrl,
    cursor,
    typeFilter,
    maxEffects,
    autoReconnect,
    reconnectDelay,
    closeStream,
  ]);

  const refetch = useCallback(async () => {
    if (!publicKey) return;

    dispatch({ type: "FETCH_START" });

    try {
      const server = new Horizon.Server(config.horizonUrl);
      let builder = server
        .effects()
        .forAccount(publicKey)
        .limit(limit)
        .order(order);

      if (cursor) {
        builder = builder.cursor(cursor);
      }

      const response = await builder.call();
      const filtered = typeFilter
        ? response.records.filter((r) => r.type.startsWith(typeFilter))
        : response.records;

      if (isMountedRef.current) {
        dispatch({ type: "FETCH_SUCCESS", payload: filtered });
      }
    } catch (err) {
      if (isMountedRef.current) {
        dispatch({
          type: "FETCH_ERROR",
          payload: err instanceof Error ? err : new Error(String(err)),
        });
      }
    }
  }, [publicKey, config.horizonUrl, limit, order, cursor, typeFilter]);

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
