/**
 * @file useTransactionStatus.ts
 * @description Hook for polling the on-chain status of a submitted transaction.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import { Horizon } from "@stellar/stellar-sdk";
import * as rpc from "@stellar/stellar-sdk/rpc";
import { useStellarContext } from "../context";
import type { StellarTxHash } from "../types";
import { asTxHash } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * On-chain status of a submitted transaction.
 *
 * @example
 * ```ts
 * const { status, ledger, resultXdr } = useTransactionStatus(hash);
 * if (status === "success") console.log(`confirmed in ledger ${ledger}`);
 * ```
 */
export type TransactionStatusSnapshot =
  | "pending"
  | "success"
  | "failed";

export interface UseTransactionStatusOptions {
  /** Which RPC layer to poll. `"soroban"` uses Soroban RPC `getTransaction`; `"classic"` uses Horizon. Default: `"soroban"`. */
  mode?: "soroban" | "classic";
  /** Polling interval in milliseconds. Default: `2000`. */
  refetchInterval?: number;
  /** Stop polling and give up after this many seconds. Default: `60`. */
  timeoutSeconds?: number;
  /** Disable polling entirely when `false` (e.g. before the hash is known). Default: `true`. */
  enabled?: boolean;
  /** Callback fired once the transaction reaches a terminal status (`success` or `failed`). */
  onComplete?: (status: "success" | "failed") => void;
}

export interface UseTransactionStatusReturn {
  /** Current on-chain status of the transaction, or `"idle"` before the first poll. */
  status: TransactionStatusSnapshot | "idle";
  /** Ledger sequence in which the transaction was confirmed, or `null`. */
  ledger: number | null;
  /** Base64 XDR of the transaction result, or `null`. */
  resultXdr: string | null;
  /** The transaction hash being polled. */
  hash: StellarTxHash | null;
  /** `true` while a poll request is in flight. */
  isLoading: boolean;
  /** Most recent polling error, or `null`. */
  error: Error | null;
  /** Whether a terminal status (`success` or `failed`) has been reached. */
  isComplete: boolean;
  /** Manually trigger an immediate poll. */
  refetch: () => Promise<void>;
  /** Reset state back to its initial value. */
  reset: () => void;
}

interface StatusState {
  status: TransactionStatusSnapshot | "idle";
  ledger: number | null;
  resultXdr: string | null;
  isLoading: boolean;
  isComplete: boolean;
  error: Error | null;
}

type StatusAction =
  | { type: "RESET" }
  | { type: "POLLING" }
  | {
      type: "SET";
      payload: Partial<StatusState>;
    };

const initial: StatusState = {
  status: "idle",
  ledger: null,
  resultXdr: null,
  isLoading: false,
  isComplete: false,
  error: null,
};

function reducer(state: StatusState, action: StatusAction): StatusState {
  switch (action.type) {
    case "RESET":
      return initial;
    case "POLLING":
      return { ...state, isLoading: true, error: null };
    case "SET":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

function toOnChainStatus(
  response: rpc.Api.GetTransactionResponse,
): Pick<StatusState, "status" | "ledger" | "resultXdr"> {
  if (response.status === rpc.Api.GetTransactionStatus.SUCCESS) {
    return { status: "success", ledger: response.ledger, resultXdr: response.resultXdr.toXDR("base64") };
  }
  if (response.status === rpc.Api.GetTransactionStatus.FAILED) {
    return { status: "failed", ledger: response.ledger, resultXdr: response.resultXdr.toXDR("base64") };
  }
  // NOT_FOUND — the network hasn't confirmed it yet, keep polling as pending.
  return { status: "pending", ledger: null, resultXdr: null };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Poll the on-chain status of a previously submitted transaction hash.
 *
 * Works for both Soroban RPC (`getTransaction`) and classic Horizon
 * transactions, exposing `{ status, ledger, resultXdr }` and stopping
 * automatically once the transaction reaches a terminal status.
 * Polling is cleaned up on unmount.
 *
 * @example
 * ```tsx
 * const { status, ledger, resultXdr, isComplete } = useTransactionStatus(hash, {
 *   mode: "soroban",
 *   refetchInterval: 2000,
 *   onComplete: (s) => console.log("done:", s),
 * });
 *
 * if (status === "success") return <p>Confirmed in ledger {ledger}</p>;
 * return <p>Waiting…</p>;
 * ```
 */
export function useTransactionStatus(
  hash: string | null | undefined,
  options: UseTransactionStatusOptions = {},
): UseTransactionStatusReturn {
  const {
    mode = "soroban",
    refetchInterval = 2000,
    timeoutSeconds = 60,
    enabled = true,
    onComplete,
  } = options;

  const { config } = useStellarContext();
  const [state, dispatch] = useReducer(reducer, initial);

  const enabledRef = useRef(enabled);
  const onCompleteRef = useRef(onComplete);
  const statusRef = useRef<StatusState>(initial);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    statusRef.current = state;
  }, [state]);

  const poll = useCallback(async () => {
    if (!hash) return;
    dispatch({ type: "POLLING" });

    try {
      if (mode === "soroban") {
        const server = new rpc.Server(config.sorobanRpcUrl);
        const response = await server.getTransaction(hash);
        const mapped = toOnChainStatus(response);
        const isComplete = mapped.status === "success" || mapped.status === "failed";
        dispatch({ type: "SET", payload: { ...mapped, isComplete, isLoading: false } });
        if (isComplete) onCompleteRef.current?.(mapped.status as "success" | "failed");
      } else {
        const server = new Horizon.Server(config.horizonUrl);
        const tx = await server.transactions().transaction(hash).call();
        const status = tx.successful ? "success" : "failed";
        const ledger = Number(tx.ledger);
        const resultXdr = tx.result_xdr ?? null;
        dispatch({ type: "SET", payload: { status, ledger, resultXdr, isComplete: true, isLoading: false } });
        onCompleteRef.current?.(status);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      dispatch({
        type: "SET",
        payload: {
          error: new Error(`Failed to poll transaction status: ${message}`),
          isLoading: false,
        },
      });
    }
  }, [hash, mode, config]);

  useEffect(() => {
    if (!enabled || !hash) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    let isActive = true;
    const deadline = Date.now() + timeoutSeconds * 1000;

    const tick = async () => {
      if (!isActive || !enabledRef.current) return;
      await poll();
      if (statusRef.current.isComplete) {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      }
    };

    void tick();

    if (refetchInterval > 0) {
      timer = setInterval(() => {
        if (statusRef.current.isComplete || Date.now() >= deadline) {
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
          return;
        }
        void tick();
      }, refetchInterval);
    }

    return () => {
      isActive = false;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, [enabled, hash, mode, refetchInterval, timeoutSeconds, poll]);

  const refetch = useCallback(async () => {
    await poll();
  }, [poll]);

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    status: state.status,
    ledger: state.ledger,
    resultXdr: state.resultXdr,
    hash: hash ? asTxHash(hash) : null,
    isLoading: state.isLoading,
    error: state.error,
    isComplete: state.isComplete,
    refetch,
    reset,
  };
}
