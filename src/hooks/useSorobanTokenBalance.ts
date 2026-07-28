/**
 * @file useSorobanTokenBalance.ts
 * @description Hook for reading SAC (Stellar Asset Contract) token balances via Soroban RPC.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import { Address, Contract, scValToNative, TransactionBuilder } from "@stellar/stellar-sdk";
import * as rpc from "@stellar/stellar-sdk/rpc";
import { useStellarContext } from "../context";
import { getCache, setCache, validateContractId, validatePublicKey } from "../utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SorobanTokenBalanceState {
  /** Raw token balance as a BigInt (SAC balances are i128) */
  balance: bigint | null;
  /** Formatted balance as a string with 7 decimal places (Stellar standard) */
  formatted: string | null;
  isLoading: boolean;
  error: Error | null;
  lastFetchedAt: Date | null;
  refetch: () => Promise<void>;
}

export interface UseSorobanTokenBalanceOptions {
  /** Set false to skip automatic fetching. Default: true */
  enabled?: boolean;
  /** Poll every N ms. Set to 0 to disable. Default: 0 */
  refetchInterval?: number;
  /** Number of decimal places for formatting. Default: 7 (Stellar standard) */
  decimals?: number;
  /** Cache TTL in milliseconds. Default: 30000 */
  cacheTTL?: number;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: bigint }
  | { type: "FETCH_ERROR"; payload: Error };

function reducer(
  state: SorobanTokenBalanceState,
  action: Action,
): SorobanTokenBalanceState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, isLoading: true, error: null };
    case "FETCH_SUCCESS": {
      return {
        ...state,
        balance: action.payload,
        formatted: state.formatted, // updated below via selector
        isLoading: false,
        error: null,
        lastFetchedAt: new Date(),
      };
    }
    case "FETCH_ERROR":
      return { ...state, isLoading: false, error: action.payload };
    default:
      return state;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBalance(raw: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const whole = raw / divisor;
  const fraction = raw % divisor;
  const fractionStr = fraction.toString().padStart(decimals, "0");
  return `${whole}.${fractionStr}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Read a SAC (Stellar Asset Contract) or any SEP-41-compatible token balance
 * for a given account by calling the `balance(address)` contract method via
 * Soroban RPC simulation — no transaction signing required.
 *
 * @param contractId - The SAC / token contract address (C...).
 * @param accountAddress - The account whose balance to query (G...).
 * @param options - Optional configuration.
 * @returns {SorobanTokenBalanceState}
 *
 * @example
 * ```tsx
 * const { balance, formatted, isLoading } = useSorobanTokenBalance(
 *   "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC", // USDC SAC on testnet
 *   publicKey,
 * );
 *
 * return <p>Balance: {formatted ?? "…"} USDC</p>;
 * ```
 */
export function useSorobanTokenBalance(
  contractId: string | null | undefined,
  accountAddress: string | null | undefined,
  options: UseSorobanTokenBalanceOptions = {},
): SorobanTokenBalanceState {
  const {
    enabled = true,
    refetchInterval = 0,
    decimals = 7,
    cacheTTL = 30_000,
  } = options;

  const { config } = useStellarContext();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const refetchRef = useRef<(force?: boolean) => Promise<void>>(() => Promise.resolve());

  const [state, dispatch] = useReducer(reducer, {
    balance: null,
    formatted: null,
    isLoading: false,
    error: null,
    lastFetchedAt: null,
    refetch: () => refetchRef.current(true),
  });

  const fetch = useCallback(
    async (force = false) => {
      if (!contractId || !accountAddress) return;

      // Abort any in-flight request before starting a new one
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const cacheKey = `soroban-token-balance-${contractId}-${accountAddress}-${config.network}`;

      if (!force) {
        const cached = getCache<bigint>(cacheKey);
        if (cached !== null) {
          dispatch({ type: "FETCH_SUCCESS", payload: cached });
          return;
        }
      }

      dispatch({ type: "FETCH_START" });

      try {
        validateContractId(contractId, "contractId");
        validatePublicKey(accountAddress, "accountAddress");
        const server = new rpc.Server(config.sorobanRpcUrl);
        const contract = new Contract(contractId);

        // Build the balance(address) call operation
        const operation = contract.call(
          "balance",
          new Address(accountAddress).toScVal(),
        );

        // Use simulateTransaction to read without signing
        const account = await server.getAccount(accountAddress);
        const tx = new TransactionBuilder(account, {
          fee: "100",
          networkPassphrase: config.networkPassphrase,
        })
          .addOperation(operation)
          .setTimeout(30)
          .build();

        const simResult = await server.simulateTransaction(tx);

        if (rpc.Api.isSimulationError(simResult)) {
          throw new Error(simResult.error);
        }

        if (!rpc.Api.isSimulationSuccess(simResult) || !simResult.result) {
          throw new Error("Simulation did not return a result");
        }

        const raw = scValToNative(simResult.result.retval) as bigint;
        setCache(cacheKey, raw, cacheTTL);
        dispatch({ type: "FETCH_SUCCESS", payload: raw });
      } catch (err) {
        // Ignore AbortError from cancelled requests
        if (err instanceof Error && err.name === "AbortError") return;
        dispatch({
          type: "FETCH_ERROR",
          payload: err instanceof Error ? err : new Error(String(err)),
        });
      }
    },
    [contractId, accountAddress, config.sorobanRpcUrl, config.networkPassphrase, config.network, cacheTTL],
  );

  useEffect(() => {
    refetchRef.current = fetch;
  }, [fetch]);

  useEffect(() => {
    if (!enabled || !contractId || !accountAddress) return;
    void fetch();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [enabled, contractId, accountAddress, fetch]);

  useEffect(() => {
    if (!enabled || !contractId || !accountAddress || refetchInterval <= 0) return;
    intervalRef.current = setInterval(() => void fetch(true), refetchInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, contractId, accountAddress, refetchInterval, fetch]);

  // Derive formatted string from current balance
  const formatted =
    state.balance !== null ? formatBalance(state.balance, decimals) : null;

  return { ...state, formatted };
}
