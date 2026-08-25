/**
 * @file useSorobanRead.ts
 * @description Hook for simulate-only Soroban contract calls without transaction signing,
 * with automatic re-fetch on argument change.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  Account,
  Contract,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import * as rpc from "@stellar/stellar-sdk/rpc";
import { useStellarContext } from "../context";
import { getCache, setCache, validateContractId } from "../utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseSorobanReadOptions<T = unknown> {
  /** Enable automatic fetching. Default: true */
  enabled?: boolean;
  /** Account address (G...) to simulate from. Optional. */
  accountAddress?: string;
  /** Poll interval in ms. Set to 0 to disable. Default: 0 */
  refetchInterval?: number;
  /** Cache TTL in milliseconds. Default: 30000 */
  cacheTTL?: number;
  /** Custom result parser from ScVal */
  parseResult?: (scVal: xdr.ScVal) => T;
  /** Callback fired on successful simulation */
  onSuccess?: (data: T) => void;
  /** Callback fired on error */
  onError?: (error: Error) => void;
}

export interface UseSorobanReadReturn<T = unknown> {
  /** Parsed simulation result */
  data: T | null;
  /** Raw ScVal returned by contract simulation */
  result: xdr.ScVal | null;
  /** Full Soroban RPC simulation response */
  simulation: rpc.Api.SimulateTransactionResponse | null;
  /** True during initial fetch */
  isLoading: boolean;
  /** True during background re-fetch */
  isRefetching: boolean;
  /** Simulation error, if any */
  error: Error | null;
  /** Trigger manual refetch */
  refetch: () => Promise<void>;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

interface State<T> {
  data: T | null;
  result: xdr.ScVal | null;
  simulation: rpc.Api.SimulateTransactionResponse | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
}

type Action<T> =
  | { type: "FETCH_START"; isRefetch: boolean }
  | {
      type: "FETCH_SUCCESS";
      data: T;
      result: xdr.ScVal;
      simulation: rpc.Api.SimulateTransactionResponse;
    }
  | { type: "FETCH_ERROR"; error: Error };

function reducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case "FETCH_START":
      return {
        ...state,
        isLoading: !action.isRefetch && state.data === null,
        isRefetching: action.isRefetch || state.data !== null,
        error: null,
      };
    case "FETCH_SUCCESS":
      return {
        data: action.data,
        result: action.result,
        simulation: action.simulation,
        isLoading: false,
        isRefetching: false,
        error: null,
      };
    case "FETCH_ERROR":
      return {
        ...state,
        isLoading: false,
        isRefetching: false,
        error: action.error,
      };
    default:
      return state;
  }
}

// Helper to stringify args for dependency comparison
function serializeArgs(args: unknown[]): string {
  try {
    return JSON.stringify(args, (_key, val) => {
      if (typeof val === "bigint") return val.toString();
      if (val instanceof xdr.ScVal) return val.toXDR("base64");
      return val;
    });
  } catch {
    return String(args);
  }
}

const DUMMY_ACCOUNT = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

/**
 * Execute simulate-only contract calls that don't require signing,
 * with automatic re-fetch whenever contractId, method, or arguments change.
 *
 * @param contractId - The contract address (C...)
 * @param method - Method name to invoke
 * @param args - Arguments to pass to the method
 * @param options - Configuration options
 */
export function useSorobanRead<T = unknown>(
  contractId: string | null | undefined,
  method: string,
  args: unknown[] = [],
  options: UseSorobanReadOptions<T> = {},
): UseSorobanReadReturn<T> {
  const {
    enabled = true,
    accountAddress,
    refetchInterval = 0,
    cacheTTL = 30_000,
    parseResult,
    onSuccess,
    onError,
  } = options;

  const { config } = useStellarContext();
  const serializedArgs = serializeArgs(args);

  const [state, dispatch] = useReducer(reducer<T>, {
    data: null,
    result: null,
    simulation: null,
    isLoading: false,
    isRefetching: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchGenRef = useRef(0);
  const isInitialMount = useRef(true);

  const fetch = useCallback(
    async (isRefetch = false) => {
      if (!contractId || !method) return;

      const gen = ++fetchGenRef.current;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const cacheKey = `soroban-read-${contractId}-${method}-${serializedArgs}-${config.network}`;

      if (!isRefetch) {
        const cached = getCache<{ data: T; result: xdr.ScVal; simulation: rpc.Api.SimulateTransactionResponse }>(cacheKey);
        if (cached) {
          if (gen !== fetchGenRef.current) return;
          dispatch({
            type: "FETCH_SUCCESS",
            data: cached.data,
            result: cached.result,
            simulation: cached.simulation,
          });
          onSuccess?.(cached.data);
          return;
        }
      }

      dispatch({ type: "FETCH_START", isRefetch });

      try {
        validateContractId(contractId, "contractId");

        const server = new rpc.Server(config.sorobanRpcUrl);
        const contract = new Contract(contractId);

        const scArgs = args.map((a) =>
          a instanceof xdr.ScVal ? a : nativeToScVal(a),
        );

        const targetAccount = accountAddress || DUMMY_ACCOUNT;
        let accountObj: Account;

        try {
          const remoteAccount = await server.getAccount(targetAccount);
          accountObj = remoteAccount;
        } catch {
          accountObj = new Account(targetAccount, "0");
        }

        if (gen !== fetchGenRef.current) return;

        const tx = new TransactionBuilder(accountObj, {
          fee: "100",
          networkPassphrase: config.networkPassphrase,
        })
          .addOperation(contract.call(method, ...scArgs))
          .setTimeout(30)
          .build();

        const simResult = await server.simulateTransaction(tx);
        if (gen !== fetchGenRef.current) return;

        if (rpc.Api.isSimulationError(simResult)) {
          throw new Error(`Simulation failed: ${simResult.error}`);
        }

        if (!simResult.result) {
          throw new Error("Simulation did not return a result");
        }

        const rawScVal = simResult.result.retval;
        const parsedData: T = parseResult
          ? parseResult(rawScVal)
          : (scValToNative(rawScVal) as T);

        setCache(cacheKey, { data: parsedData, result: rawScVal, simulation: simResult }, cacheTTL);

        if (gen !== fetchGenRef.current) return;

        dispatch({
          type: "FETCH_SUCCESS",
          data: parsedData,
          result: rawScVal,
          simulation: simResult,
        });

        onSuccess?.(parsedData);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        if (gen !== fetchGenRef.current) return;
        const wrappedErr = err instanceof Error ? err : new Error(String(err));
        dispatch({ type: "FETCH_ERROR", error: wrappedErr });
        onError?.(wrappedErr);
      }
    },
    [
      contractId,
      method,
      serializedArgs,
      args,
      accountAddress,
      config.sorobanRpcUrl,
      config.networkPassphrase,
      config.network,
      cacheTTL,
      parseResult,
      onSuccess,
      onError,
    ],
  );

  // Auto-fetch on mount or when arguments/contractId/method change
  useEffect(() => {
    if (!enabled || !contractId || !method) return;

    const isRefetch = !isInitialMount.current;
    isInitialMount.current = false;

    void fetch(isRefetch);

    return () => {
      ++fetchGenRef.current;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [enabled, contractId, method, serializedArgs, fetch]);

  // Handle refetch interval (polling)
  useEffect(() => {
    if (!enabled || !contractId || !method || refetchInterval <= 0) return;
    const interval = setInterval(() => void fetch(true), refetchInterval);
    return () => clearInterval(interval);
  }, [enabled, contractId, method, refetchInterval, fetch]);

  const refetch = useCallback(() => fetch(true), [fetch]);

  return {
    ...state,
    refetch,
  };
}
