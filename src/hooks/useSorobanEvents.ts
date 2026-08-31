/**
 * @file useSorobanEvents.ts
 * @description Hook for paginating Soroban contract events from RPC with
 *   forward/backward cursor navigation.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import * as rpc from "@stellar/stellar-sdk/rpc";
import { useStellarContext } from "../context";
import { validateContractId } from "../utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseSorobanEventsOptions {
  /** Soroban contract address (`C...`). When omitted, events from all contracts are returned. */
  contractId?: string;
  /** Optional topic filters for event matching. */
  topics?: string[][];
  /** Event type filter. Default: `"contract"`. */
  type?: "system" | "contract" | "diagnostic";
  /** Maximum number of events per page. Default: `100`. */
  limit?: number;
  /** Query events starting at this ledger sequence (inclusive). */
  startLedger?: number;
  /** Query events up to this ledger sequence (exclusive). */
  endLedger?: number;
  /** Initial pagination cursor to start from. */
  cursor?: string;
  /** Poll the current page every N ms while mounted. Default: `0` (disabled). */
  refetchInterval?: number;
}

interface SorobanEventsState {
  events: rpc.Api.EventResponse[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  isLoading: boolean;
  error: Error | null;
}

/** Pagination metadata for the currently loaded page of events. */
export interface SorobanEventsPageInfo {
  /** Cursor to pass to `getEvents` to fetch the next page, or `null` if there is none. */
  nextCursor: string | null;
  /** Cursor that produced the previous page, or `null` if there is none. */
  prevCursor: string | null;
  /** `true` when `pageNext()` can load another page. */
  hasNextPage: boolean;
  /** `true` when `pagePrev()` can go back a page. */
  hasPrevPage: boolean;
}

/** Return shape of {@link useSorobanEvents}. */
export interface UseSorobanEventsReturn {
  /** Events for the current page. */
  events: rpc.Api.EventResponse[];
  /** Pagination metadata for the current page. */
  pageInfo: SorobanEventsPageInfo;
  /** Fetch the next page of events (after the last event of the current page). */
  pageNext: () => Promise<void>;
  /** Fetch the previous page of events (from the pagination-cursor history). */
  pagePrev: () => Promise<void>;
  /** Re-fetch the current page (e.g. after the underlying state changes). */
  refetch: () => Promise<void>;
  /** Reset pagination history and reload from the initial `cursor`/`startLedger`. */
  reset: () => Promise<void>;
  /** `true` while a page fetch is in flight. */
  isLoading: boolean;
  /** Most recent fetch error, or `null`. */
  error: Error | null;
}

type Action =
  | { type: "LOADING" }
  | { type: "SUCCESS"; payload: rpc.Api.EventResponse[]; nextCursor: string | null }
  | { type: "ERROR"; payload: Error }
  | { type: "RESET" };

function reducer(state: SorobanEventsState, action: Action): SorobanEventsState {
  switch (action.type) {
    case "LOADING":
      return { ...state, isLoading: true, error: null };
    case "SUCCESS":
      return {
        ...state,
        events: action.payload,
        nextCursor: action.nextCursor,
        hasNextPage: action.nextCursor !== null,
        isLoading: false,
        error: null,
      };
    case "ERROR":
      return { ...state, isLoading: false, error: action.payload };
    case "RESET":
      return {
        events: [],
        nextCursor: null,
        prevCursor: null,
        hasNextPage: false,
        hasPrevPage: false,
        isLoading: false,
        error: null,
      };
    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Paginate Soroban contract events from the gRPC/RPC endpoint with cursor
 * navigation. Unlike {@link useContractEvents}, this hook operates on fixed
 * pages and exposes `pageNext()` / `pagePrev()` (driven by a pagination-cursor
 * history), making it well suited for infinite-scroll "event log" UIs.
 *
 * @example
 * ```tsx
 * const { events, hasNextPage, hasPrevPage, pageNext, pagePrev, isLoading } =
 *   useSorobanEvents({
 *     contractId: "CABC...XYZ",
 *     startLedger: 100000,
 *     limit: 20,
 *   });
 * ```
 */
export function useSorobanEvents(options: UseSorobanEventsOptions = {}): UseSorobanEventsReturn {
  const { config } = useStellarContext();
  const [state, dispatch] = useReducer(reducer, {
    events: [],
    nextCursor: null,
    prevCursor: null,
    hasNextPage: false,
    hasPrevPage: false,
    isLoading: false,
    error: null,
  });

  const historyRef = useRef<string[]>([]);
  const currentRef = useRef<string | undefined>(options.cursor);
  const isMounted = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPage = useCallback(
    async (cursor: string | undefined) => {
      try {
        if (options.contractId) validateContractId(options.contractId);
        dispatch({ type: "LOADING" });

        const server = new rpc.Server(config.sorobanRpcUrl);
        const filter: rpc.Api.EventFilter = {
          type: options.type || "contract",
          ...(options.contractId !== undefined && { contractIds: [options.contractId] }),
          ...(options.topics !== undefined && { topics: options.topics }),
        };

        const response = await server.getEvents({
          filters: [filter],
          limit: options.limit ?? 100,
          ...(cursor !== undefined && { cursor }),
          ...(options.startLedger !== undefined && { startLedger: options.startLedger }),
          ...(options.endLedger !== undefined && { endLedger: options.endLedger }),
        });

        if (isMounted.current) {
          currentRef.current = cursor;
          const lastEvent = response.events[response.events.length - 1];
          const nextCursor = lastEvent ? lastEvent.pagingToken : null;

          dispatch({
            type: "SUCCESS",
            payload: response.events,
            nextCursor,
          });
        }
      } catch (err) {
        if (isMounted.current) {
          dispatch({
            type: "ERROR",
            payload: err instanceof Error ? err : new Error(String(err)),
          });
        }
      }
    },
    [
      config.sorobanRpcUrl,
      options.contractId,
      options.type,
      options.topics,
      options.limit,
      options.startLedger,
      options.endLedger,
    ],
  );

  // ── Current page pagination ─────────────────────────────────────────────────

  const pageNext = useCallback(async () => {
    if (!state.nextCursor) return;
    if (currentRef.current !== undefined) historyRef.current.push(currentRef.current);
    await fetchPage(state.nextCursor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.nextCursor, fetchPage]);

  const pagePrev = useCallback(async () => {
    const backTo = historyRef.current.pop();
    if (backTo === undefined) return;
    await fetchPage(backTo === "" ? undefined : backTo);
  }, [fetchPage]);

  const refetch = useCallback(() => fetchPage(currentRef.current), [fetchPage]);

  const reset = useCallback(async () => {
    historyRef.current = [];
    currentRef.current = options.cursor;
    dispatch({ type: "RESET" });
    await fetchPage(options.cursor);
  }, [fetchPage, options.cursor]);

  // ── Lifecycle / polling ─────────────────────────────────────────────────────

  useEffect(() => {
    isMounted.current = true;
    fetchPage(currentRef.current);

    const interval = options.refetchInterval ?? 0;
    if (interval > 0) {
      intervalRef.current = setInterval(() => fetchPage(currentRef.current), interval);
    }

    return () => {
      isMounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchPage, options.refetchInterval]);

  const pageInfo = {
    nextCursor: state.nextCursor,
    prevCursor: historyRef.current.length > 0 ? historyRef.current[historyRef.current.length - 1] : null,
    hasNextPage: state.hasNextPage,
    hasPrevPage: historyRef.current.length > 0,
  };

  return {
    events: state.events,
    pageInfo,
    pageNext,
    pagePrev,
    refetch,
    reset,
    isLoading: state.isLoading,
    error: state.error,
  };
}