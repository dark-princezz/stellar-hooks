/**
 * @file useTransactionCore.ts
 * @description Internal hook for submitting and polling pre-signed Stellar/Soroban transactions.
 *              Used by specific operation hooks (usePayment, useBumpSequence, etc.).
 *              Not exported from the public API — use useTransaction for the full lifecycle.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useReducer } from "react";
import { TransactionBuilder, Horizon } from "@stellar/stellar-sdk";
import * as rpc from "@stellar/stellar-sdk/rpc";
import { useStellarContext } from "../context";
import { useHookActivityDebug } from "../devtools/useHookActivityDebug";
import type { TransactionState, TransactionStatus, StellarXdrString, StellarTxHash, StellarTransactionError } from "../types";
import { asTxHash } from "../types";
import { sleep, backoff } from "../utils";

// ─── Options ──────────────────────────────────────────────────────────────────

export interface RetryStrategy {
  /** Maximum number of consecutive network failures allowed before giving up. Default: 3 */
  maxRetries?: number;
  /** Multiplier for exponential backoff on retries. Default: 1.5 */
  backoffMultiplier?: number;
}

export interface UseTransactionCoreOptions {
  /** "soroban" uses rpc; "classic" uses Horizon. Default: "soroban" */
  mode?: "soroban" | "classic";
  /** Polling timeout in seconds. Default: 60 */
  timeoutSeconds?: number;
  /** Configuration for handling network failures during polling */
  retryStrategy?: RetryStrategy;
  /** Friendly label shown in the development hook overlay. */
  debugLabel?: string;
  /** Callback fired when the transaction is successfully confirmed. */
  onSuccess?: (hash: string) => void;
  /** Callback fired when the transaction fails or an error occurs. */
  onError?: (error: StellarTransactionError) => void;
}

export interface UseTransactionCoreReturn extends TransactionState {
  submit: (signedXdr: StellarXdrString) => Promise<void>;
  reset: () => void;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "RESET" }
  | { type: "STATUS"; payload: TransactionStatus }
  | { type: "SUCCESS"; hash: StellarTxHash }
  | { type: "ERROR"; payload: StellarTransactionError };

function reducer(state: TransactionState, action: Action): TransactionState {
  switch (action.type) {
    case "RESET":
      return { status: "idle", hash: null, result: null, error: null, isLoading: false, isSuccess: false, isError: false };
    case "STATUS":
      return { ...state, status: action.payload, isLoading: true, isSuccess: false, isError: false };
    case "SUCCESS":
      return { status: "success", hash: action.hash, result: null, error: null, isLoading: false, isSuccess: true, isError: false };
    case "ERROR":
      return { ...state, status: "error", error: action.payload, isLoading: false, isSuccess: false, isError: true };
    default:
      return state;
  }
}

const initial: TransactionState = {
  status: "idle",
  hash: null,
  result: null,
  error: null,
  isLoading: false,
  isSuccess: false,
  isError: false,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTransactionCore(
  options: UseTransactionCoreOptions = {},
): UseTransactionCoreReturn {
  const {
    mode = "soroban",
    timeoutSeconds = 60,
    retryStrategy = {},
    debugLabel = "useTransactionCore",
    onSuccess,
    onError,
  } = options;
  const { maxRetries = 3, backoffMultiplier = 1.5 } = retryStrategy;
  const { config } = useStellarContext();
  const [state, dispatch] = useReducer(reducer, initial);

  useHookActivityDebug({
    name: debugLabel,
    status: state.status,
    error: state.error,
  });

  const submit = useCallback(
    async (signedXdr: StellarXdrString) => {
      dispatch({ type: "STATUS", payload: "submitting" });

      try {
        if (mode === "soroban") {
          const server = new rpc.Server(config.sorobanRpcUrl);
          const tx = TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase);

          const sendResult = await server.sendTransaction(tx);

          if (sendResult.status === "ERROR") {
            const error: StellarTransactionError = {
              type: "network",
              message: `Submission failed: ${JSON.stringify(sendResult.errorResult)}`,
            };
            dispatch({ type: "ERROR", payload: error });
            onError?.(error);
            return;
          }

          const txHash = sendResult.hash;
          dispatch({ type: "STATUS", payload: "polling" });

          const deadline = Date.now() + timeoutSeconds * 1000;
          let attempt = 0;
          let consecutiveFailures = 0;

          while (Date.now() < deadline) {
            await sleep(backoff(attempt));
            attempt++;

            let getResult;
            try {
              getResult = await server.getTransaction(txHash);
              consecutiveFailures = 0; // Reset failures on successful network request
            } catch (pollingErr) {
              consecutiveFailures++;
              const isNetworkError = pollingErr instanceof Error && 
                (pollingErr.message.includes("NetworkError") || pollingErr.message.includes("ECONNREFUSED") || pollingErr.message.includes("timeout") || pollingErr.message.includes("fetch"));
                
              if (isNetworkError && consecutiveFailures <= maxRetries) {
                console.warn(`[useTransactionCore] Polling network error. Retry ${consecutiveFailures}/${maxRetries}...`);
                const retryDelay = 1000 * Math.pow(backoffMultiplier, consecutiveFailures);
                await sleep(retryDelay);
                continue; // Skip the rest of this loop tick and try polling again
              } else {
                throw pollingErr; // Exceeded retries or non-network error, bubble up to outer catch
              }
            }

            if (getResult.status === rpc.Api.GetTransactionStatus.SUCCESS) {
              dispatch({ type: "SUCCESS", hash: asTxHash(txHash) });
              onSuccess?.(txHash);
              return;
            }

            if (getResult.status === rpc.Api.GetTransactionStatus.FAILED) {
              const error: StellarTransactionError = {
                type: "transaction",
                resultCode: "unknown",
                message: `Transaction failed on-chain`,
              };
              dispatch({ type: "ERROR", payload: error });
              onError?.(error);
              return;
            }
          }

          const timeoutError: StellarTransactionError = {
            type: "timeout",
            message: `Transaction polling timed out after ${timeoutSeconds}s: ${txHash}`,
          };
          dispatch({ type: "ERROR", payload: timeoutError });
          onError?.(timeoutError);
        } else {
          const server = new Horizon.Server(config.horizonUrl);
          const tx = TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase);

          const result = await server.submitTransaction(tx as Parameters<typeof server.submitTransaction>[0]);
          dispatch({ type: "SUCCESS", hash: asTxHash(result.hash) });
          onSuccess?.(result.hash);
        }
      } catch (err) {
        let error: StellarTransactionError;
        const message = err instanceof Error ? err.message : String(err);

        if (
          message.includes("NetworkError") ||
          message.includes("ECONNREFUSED") ||
          message.includes("ENOTFOUND") ||
          message.includes("timeout") ||
          message.includes("network")
        ) {
          error = {
            type: "network",
            message: `Network error during transaction: ${message}`,
          };
        } else {
          error = {
            type: "network",
            message: `Unexpected error: ${message}`,
          };
        }

        dispatch({ type: "ERROR", payload: error });
        onError?.(error);
      }
    },
    [mode, config, timeoutSeconds, maxRetries, backoffMultiplier, onSuccess, onError]
  );

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return { ...state, submit, reset };
}
