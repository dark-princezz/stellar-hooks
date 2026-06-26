import { useCallback, useEffect, useReducer, useRef } from "react";
import { rpc, xdr } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import type { LedgerEntryState } from "../types";

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: rpc.Api.LedgerEntryResult }
  | { type: "FETCH_NOT_FOUND" }
  | { type: "FETCH_ERROR"; payload: Error };

function reducer(state: LedgerEntryState, action: Action): LedgerEntryState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, isLoading: true, error: null };
    case "FETCH_SUCCESS":
      return { data: action.payload, isLoading: false, error: null, lastFetchedAt: new Date(), refetch: state.refetch };
    case "FETCH_NOT_FOUND":
      return { data: null, isLoading: false, error: null, lastFetchedAt: new Date(), refetch: state.refetch };
    case "FETCH_ERROR":
      return { ...state, isLoading: false, error: action.payload };
    default:
      return state;
  }
}

// ─── Options ──────────────────────────────────────────────────────────────────

export interface UseLedgerEntryOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLedgerEntry(
  ledgerKey: xdr.LedgerKey | null | undefined,
  options: UseLedgerEntryOptions = {}
): LedgerEntryState {
  const { enabled = true, refetchInterval = 0 } = options;
  const { config } = useStellarContext();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refetchRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const [state, dispatch] = useReducer(reducer, {
    data: null,
    isLoading: false,
    error: null,
    lastFetchedAt: null,
    refetch: () => refetchRef.current(),
  });

  const fetch = useCallback(async () => {
    if (!ledgerKey) return;
    dispatch({ type: "FETCH_START" });

    try {
      const server = new rpc.Server(config.sorobanRpcUrl);
      const result = await server.getLedgerEntries(ledgerKey);

      if (result.entries.length === 0) {
        dispatch({ type: "FETCH_NOT_FOUND" });
        return;
      }

      const entry = result.entries[0];
      if (entry) {
        dispatch({ type: "FETCH_SUCCESS", payload: entry });
      } else {
        dispatch({ type: "FETCH_NOT_FOUND" });
      }
    } catch (err) {
      dispatch({
        type: "FETCH_ERROR",
        payload: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }, [ledgerKey, config.sorobanRpcUrl]);

  useEffect(() => { refetchRef.current = fetch; }, [fetch]);

  useEffect(() => {
    if (!enabled || !ledgerKey) return;
    void fetch();
  }, [enabled, ledgerKey, fetch]);

  useEffect(() => {
    if (!enabled || !ledgerKey || refetchInterval <= 0) return;
    intervalRef.current = setInterval(() => void fetch(), refetchInterval);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [enabled, ledgerKey, refetchInterval, fetch]);

  return state;
}
