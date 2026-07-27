/**
 * @file useContractEvents.ts
 * @description Hook for polling Soroban contract events from RPC.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import * as rpc from "@stellar/stellar-sdk/rpc";
import { useStellarContext } from "../context";
import { validateContractId } from "../utils";

export interface UseContractEventsOptions {
  /** Soroban contract address (C...) */
  contractId: string;
  /** Optional array of topic filters for event matching */
  topics?: string[][];
  /** Event type filter. Default is "contract" */
  type?: "system" | "contract" | "diagnostic";
  /** Max number of events per poll. Default: 100 */
  limit?: number;
  /** Starting ledger to query events from */
  startLedger?: number;
  /** Interval in milliseconds to continuously stream/poll events. Default: 0 (disabled) */
  refetchInterval?: number;
  /** Fetching mode. 'poll' uses repeated RPC calls; 'stream' is reserved for future streaming support. Default: 'poll' */
  mode?: "poll" | "stream";
  /** Poll interval in milliseconds (alias for refetchInterval when mode is 'poll'). Takes precedence over refetchInterval when set. */
  pollInterval?: number;
}

interface EventsState {
  events: rpc.Api.EventResponse[];
  isLoading: boolean;
  error: Error | null;
}

type Action =
  | { type: "LOADING" }
  | { type: "SUCCESS"; payload: rpc.Api.EventResponse[] }
  | { type: "ERROR"; payload: Error };

function reducer(state: EventsState, action: Action): EventsState {
  switch (action.type) {
    case "LOADING":
      return { ...state, isLoading: true, error: null };
    case "SUCCESS":
      return { events: action.payload, isLoading: false, error: null };
    case "ERROR":
      return { ...state, isLoading: false, error: action.payload };
    default:
      return state;
  }
}

/**
 * Poll or stream Soroban contract events from the RPC endpoint.
 *
 * @example
 * ```tsx
 * const { events, isLoading, error, refetch } = useContractEvents({
 *   contractId: "CABC...XYZ",
 *   startLedger: 100000,
 *   refetchInterval: 5000,
 * });
 *
 * return events.map((e) => <p key={e.id}>{JSON.stringify(e.value)}</p>);
 * ```
 */
export function useContractEvents(options: UseContractEventsOptions) {
  const { config } = useStellarContext();
  const [state, dispatch] = useReducer(reducer, {
    events: [],
    isLoading: false,
    error: null,
  });

  const mode = options.mode ?? "poll";
  const interval = options.pollInterval ?? options.refetchInterval ?? 0;

  const cursorRef = useRef<string | undefined>();
  const isMounted = useRef(true);

  const fetchEvents = useCallback(async () => {
    try {
      validateContractId(options.contractId);
      dispatch({ type: "LOADING" });
      const server = new rpc.Server(config.sorobanRpcUrl);

      const filter: rpc.Api.EventFilter = {
        type: options.type || "contract",
        contractIds: [options.contractId],
        ...(options.topics !== undefined && { topics: options.topics }),
      };

      const response = await server.getEvents({
        ...(options.startLedger !== undefined && { startLedger: options.startLedger }),
        ...(cursorRef.current !== undefined && { cursor: cursorRef.current }),
        filters: [filter],
        limit: options.limit ?? 100,
      });

      if (isMounted.current && response.events) {
        if (response.events.length > 0) {
          const lastEvent = response.events[response.events.length - 1];
          if (lastEvent) cursorRef.current = lastEvent.pagingToken;
        }
        dispatch({ type: "SUCCESS", payload: response.events });
      }
    } catch (err) {
      if (isMounted.current) {
        dispatch({ type: "ERROR", payload: err instanceof Error ? err : new Error(String(err)) });
      }
    }
  }, [config.sorobanRpcUrl, options.contractId, options.type, options.topics, options.startLedger, options.limit]);

  useEffect(() => {
    if (mode === "stream") {
      dispatch({
        type: "ERROR",
        payload: new Error(
          "Stream mode is not yet supported. Use mode: 'poll' (default) instead."
        ),
      });
      return;
    }

    isMounted.current = true;
    fetchEvents();

    let intervalId: ReturnType<typeof setInterval>;
    if (interval > 0) {
      intervalId = setInterval(fetchEvents, interval);
    }

    return () => {
      isMounted.current = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchEvents, interval, mode]);

  return {
    ...state,
    mode,
    refetch: fetchEvents,
    stop: () => { isMounted.current = false; },
    start: () => { isMounted.current = true; fetchEvents(); }
  };
}
