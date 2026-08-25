/**
 * @file useTransactionLifecycle.ts
 * @description Hook for handling complete transaction lifecycle: simulate -> sign -> submit -> poll-for-result
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useReducer } from "react";
import { TransactionBuilder, Horizon } from "@stellar/stellar-sdk";
import * as rpc from "@stellar/stellar-sdk/rpc";
import { useStellarContext } from "../context";
import { useFreighter } from "./useFreighter";
import { useHookActivityDebug } from "../devtools/useHookActivityDebug";
import type { 
  TransactionState, 
  TransactionStatus, 
  StellarXdrString, 
  StellarTxHash, 
  StellarTransactionError,
  StellarPublicKey 
} from "../types";
import { asTxHash, unsafeAsXdrString } from "../types";
import { sleep, backoff } from "../utils";

// ─── Enhanced Status Types ────────────────────────────────────────────────────────────

/**
 * Detailed transaction lifecycle stages for granular UI feedback.
 */
export type TransactionLifecycleStatus =
  | "idle"
  | "simulating"
  | "simulation_success"
  | "simulation_failed"
  | "signing"
  | "signing_success"
  | "signing_failed"
  | "submitting"
  | "submitting_success"
  | "submitting_failed"
  | "polling"
  | "success"
  | "error";

/**
 * Extended transaction state with detailed lifecycle information.
 */
export interface TransactionLifecycleState<TResult = unknown> extends TransactionState<TResult> {
  /** Detailed lifecycle stage of the transaction. */
  lifecycleStatus: TransactionLifecycleStatus;
  /** Raw simulation response from Soroban RPC (null for classic transactions). */
  simulation: rpc.Api.SimulateTransactionResponse | null;
  /** Estimated resource fee from simulation (for Soroban transactions). */
  estimatedFee: string | null;
  /** Whether the transaction is currently in the simulation phase. */
  isSimulating: boolean;
  /** Whether the transaction is currently in the signing phase. */
  isSigning: boolean;
  /** Whether the transaction is currently in the submitting phase. */
  isSubmitting: boolean;
  /** Whether the transaction is currently in the polling phase. */
  isPolling: boolean;
}

// ─── Options ──────────────────────────────────────────────────────────────────

export interface UseTransactionLifecycleOptions {
  /** "classic" submits through Horizon; "soroban" submits through the RPC server. Default: "classic" */
  mode?: "classic" | "soroban";
  /** Base fee in stroops. Default: 100 */
  fee?: number;
  /** Optional text memo attached to the transaction. */
  memo?: string;
  /** Build and polling timeout in seconds. Default: 60 */
  timeoutSeconds?: number;
  /** Maximum number of consecutive network failures allowed during polling. Default: 3 */
  maxRetries?: number;
  /** Multiplier for exponential backoff on retries. Default: 1.5 */
  backoffMultiplier?: number;
  /** Callback fired when the transaction is successfully confirmed on-chain. */
  onSuccess?: (hash: string) => void;
  /** Callback fired when an error occurs at any stage. */
  onError?: (error: StellarTransactionError) => void;
  /** Callback fired when simulation completes (Soroban only). */
  onSimulationComplete?: (simulation: rpc.Api.SimulateTransactionResponse) => void;
}

export interface UseTransactionLifecycleReturn<TResult = unknown> extends TransactionLifecycleState<TResult> {
  /**
   * Build and optionally simulate a transaction before signing.
   * For Soroban transactions, this performs simulation to estimate costs.
   * For classic transactions, this just builds the transaction.
   */
  build: (operations: Horizon.Operation[]) => Promise<StellarXdrString>;
  /**
   * Sign a transaction XDR using the connected wallet.
   */
  sign: (xdr: StellarXdrString) => Promise<StellarXdrString>;
  /**
   * Submit a signed transaction XDR to the network and poll for confirmation.
   */
  submit: (signedXdr: StellarXdrString) => Promise<void>;
  /**
   * Execute the full lifecycle: build -> simulate (if Soroban) -> sign -> submit -> poll.
   */
  execute: (operations: Horizon.Operation[]) => Promise<void>;
  /** Reset state back to idle. */
  reset: () => void;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

type LifecycleAction =
  | { type: "RESET" }
  | { type: "LIFECYCLE_STATUS"; payload: TransactionLifecycleStatus }
  | { type: "SIMULATION"; payload: rpc.Api.SimulateTransactionResponse | null }
  | { type: "ESTIMATED_FEE"; payload: string | null }
  | { type: "SUCCESS"; hash: StellarTxHash }
  | { type: "ERROR"; payload: StellarTransactionError };

function lifecycleReducer<TResult = unknown>(
  state: TransactionLifecycleState<TResult>,
  action: LifecycleAction
): TransactionLifecycleState<TResult> {
  switch (action.type) {
    case "RESET":
      return {
        status: "idle",
        lifecycleStatus: "idle",
        hash: null,
        result: null,
        error: null,
        simulation: null,
        estimatedFee: null,
        isLoading: false,
        isSuccess: false,
        isError: false,
        isSimulating: false,
        isSigning: false,
        isSubmitting: false,
        isPolling: false,
      };
    case "LIFECYCLE_STATUS":
      return {
        ...state,
        lifecycleStatus: action.payload,
        status: mapLifecycleToStatus(action.payload),
        isLoading: isLifecycleLoading(action.payload),
        isSimulating: action.payload === "simulating",
        isSigning: action.payload === "signing",
        isSubmitting: action.payload === "submitting",
        isPolling: action.payload === "polling",
        isSuccess: action.payload === "success",
        isError: action.payload === "error",
      };
    case "SIMULATION":
      return { ...state, simulation: action.payload };
    case "ESTIMATED_FEE":
      return { ...state, estimatedFee: action.payload };
    case "SUCCESS":
      return {
        status: "success",
        lifecycleStatus: "success",
        hash: action.hash,
        result: null,
        error: null,
        simulation: state.simulation,
        estimatedFee: state.estimatedFee,
        isLoading: false,
        isSuccess: true,
        isError: false,
        isSimulating: false,
        isSigning: false,
        isSubmitting: false,
        isPolling: false,
      };
    case "ERROR":
      return {
        ...state,
        status: "error",
        lifecycleStatus: "error",
        error: action.payload,
        isLoading: false,
        isSuccess: false,
        isError: true,
        isSimulating: false,
        isSigning: false,
        isSubmitting: false,
        isPolling: false,
      };
    default:
      return state;
  }
}

function mapLifecycleToStatus(lifecycleStatus: TransactionLifecycleStatus): TransactionStatus {
  if (lifecycleStatus === "idle" || lifecycleStatus === "success" || lifecycleStatus === "error") {
    return lifecycleStatus;
  }
  if (lifecycleStatus === "simulating" || lifecycleStatus === "simulation_success" || lifecycleStatus === "simulation_failed") {
    return "building";
  }
  if (lifecycleStatus === "signing" || lifecycleStatus === "signing_success" || lifecycleStatus === "signing_failed") {
    return "signing";
  }
  if (lifecycleStatus === "submitting" || lifecycleStatus === "submitting_success" || lifecycleStatus === "submitting_failed") {
    return "submitting";
  }
  return "polling";
}

function isLifecycleLoading(lifecycleStatus: TransactionLifecycleStatus): boolean {
  return [
    "simulating",
    "signing",
    "submitting",
    "polling",
  ].includes(lifecycleStatus);
}

const initialLifecycleState: TransactionLifecycleState = {
  status: "idle",
  lifecycleStatus: "idle",
  hash: null,
  result: null,
  error: null,
  simulation: null,
  estimatedFee: null,
  isLoading: false,
  isSuccess: false,
  isError: false,
  isSimulating: false,
  isSigning: false,
  isSubmitting: false,
  isPolling: false,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook for managing the complete Stellar transaction lifecycle with detailed status tracking.
 * 
 * Handles: simulate → sign → submit → poll-for-result with granular status transitions.
 * Supports both classic (Horizon) and Soroban (RPC) transactions.
 *
 * @example
 * ```tsx
 * const { execute, lifecycleStatus, isSimulating, isSigning, isSubmitting, isPolling, error } = 
 *   useTransactionLifecycle({ mode: "soroban" });
 *
 * async function handleSend() {
 *   await execute([
 *     Operation.payment({
 *       destination: "GDEST...",
 *       asset: Asset.native(),
 *       amount: "10",
 *     }),
 *   ]);
 * }
 * ```
 */
export function useTransactionLifecycle<TResult = unknown>(
  options: UseTransactionLifecycleOptions = {}
): UseTransactionLifecycleReturn<TResult> {
  const {
    mode = "classic",
    fee = 100,
    memo,
    timeoutSeconds = 60,
    maxRetries = 3,
    backoffMultiplier = 1.5,
    onSuccess,
    onError,
    onSimulationComplete,
  } = options;

  const { config } = useStellarContext();
  const { signTransaction: freighterSign, publicKey } = useFreighter();
  const [state, dispatch] = useReducer(lifecycleReducer<TResult>, initialLifecycleState);

  useHookActivityDebug({
    name: "useTransactionLifecycle",
    status: state.lifecycleStatus,
    error: state.error,
  });

  const build = useCallback(
    async (operations: Horizon.Operation[]): Promise<StellarXdrString> => {
      if (!publicKey) {
        throw new Error("Freighter is not connected. Call connect() first.");
      }

      if (operations.length === 0) {
        throw new Error("At least one operation is required.");
      }

      dispatch({ type: "LIFECYCLE_STATUS", payload: "simulating" });

      try {
        // Load the source account to obtain the current sequence number
        const server = new Horizon.Server(config.horizonUrl);
        const sourceAccount = await server.loadAccount(publicKey);

        // Build the transaction
        const builder = new TransactionBuilder(sourceAccount, {
          fee: String(fee),
          networkPassphrase: config.networkPassphrase,
        }).setTimeout(timeoutSeconds);

        for (const op of operations) {
          builder.addOperation(op);
        }

        if (memo) {
          builder.addMemo(Horizon.Memo.text(memo));
        }

        const builtTx = builder.build();
        const xdr = unsafeAsXdrString(builtTx.toXDR());

        // For Soroban transactions, perform simulation
        if (mode === "soroban") {
          const rpcServer = new rpc.Server(config.sorobanRpcUrl);
          const tx = TransactionBuilder.fromXDR(xdr, config.networkPassphrase);
          
          const simulation = await rpcServer.simulateTransaction(tx);
          dispatch({ type: "SIMULATION", payload: simulation });
          dispatch({ type: "ESTIMATED_FEE", payload: simulation.estimatedResourceFee ?? null });
          dispatch({ type: "LIFECYCLE_STATUS", payload: "simulation_success" });
          onSimulationComplete?.(simulation);
        } else {
          dispatch({ type: "LIFECYCLE_STATUS", payload: "simulation_success" });
        }

        return xdr;
      } catch (err) {
        const error: StellarTransactionError = {
          type: "network",
          message: err instanceof Error ? err.message : String(err),
        };
        dispatch({ type: "LIFECYCLE_STATUS", payload: "simulation_failed" });
        dispatch({ type: "ERROR", payload: error });
        onError?.(error);
        throw error;
      }
    },
    [publicKey, config, fee, memo, timeoutSeconds, mode, onSuccess, onError, onSimulationComplete]
  );

  const sign = useCallback(
    async (xdr: StellarXdrString): Promise<StellarXdrString> => {
      dispatch({ type: "LIFECYCLE_STATUS", payload: "signing" });

      try {
        const signedXdr = await freighterSign(xdr, { networkPassphrase: config.networkPassphrase });
        dispatch({ type: "LIFECYCLE_STATUS", payload: "signing_success" });
        return signedXdr;
      } catch (err) {
        const error: StellarTransactionError = {
          type: "network",
          message: err instanceof Error ? err.message : String(err),
        };
        dispatch({ type: "LIFECYCLE_STATUS", payload: "signing_failed" });
        dispatch({ type: "ERROR", payload: error });
        onError?.(error);
        throw error;
      }
    },
    [freighterSign, config.networkPassphrase, onError]
  );

  const submit = useCallback(
    async (signedXdr: StellarXdrString): Promise<void> => {
      dispatch({ type: "LIFECYCLE_STATUS", payload: "submitting" });

      try {
        if (mode === "soroban") {
          const rpcServer = new rpc.Server(config.sorobanRpcUrl);
          const tx = TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase);

          const sendResult = await rpcServer.sendTransaction(tx);

          if (sendResult.status === "ERROR") {
            const error: StellarTransactionError = {
              type: "network",
              message: `Submission failed: ${JSON.stringify(sendResult.errorResult)}`,
            };
            dispatch({ type: "LIFECYCLE_STATUS", payload: "submitting_failed" });
            dispatch({ type: "ERROR", payload: error });
            onError?.(error);
            return;
          }

          dispatch({ type: "LIFECYCLE_STATUS", payload: "submitting_success" });
          dispatch({ type: "LIFECYCLE_STATUS", payload: "polling" });

          const txHash = sendResult.hash;
          const deadline = Date.now() + timeoutSeconds * 1000;
          let attempt = 0;
          let consecutiveFailures = 0;

          while (Date.now() < deadline) {
            await sleep(backoff(attempt));
            attempt++;

            let getResult;
            try {
              getResult = await rpcServer.getTransaction(txHash);
              consecutiveFailures = 0;
            } catch (pollingErr) {
              consecutiveFailures++;
              const isNetworkError = pollingErr instanceof Error && 
                (pollingErr.message.includes("NetworkError") || 
                 pollingErr.message.includes("ECONNREFUSED") || 
                 pollingErr.message.includes("timeout") || 
                 pollingErr.message.includes("fetch"));
                
              if (isNetworkError && consecutiveFailures <= maxRetries) {
                console.warn(`[useTransactionLifecycle] Polling network error. Retry ${consecutiveFailures}/${maxRetries}...`);
                const retryDelay = 1000 * Math.pow(backoffMultiplier, consecutiveFailures);
                await sleep(retryDelay);
                continue;
              } else {
                throw pollingErr;
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
          const horizonServer = new Horizon.Server(config.horizonUrl);
          const tx = TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase);

          const result = await horizonServer.submitTransaction(tx as Parameters<typeof horizonServer.submitTransaction>[0]);
          dispatch({ type: "LIFECYCLE_STATUS", payload: "submitting_success" });
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

        dispatch({ type: "LIFECYCLE_STATUS", payload: "submitting_failed" });
        dispatch({ type: "ERROR", payload: error });
        onError?.(error);
      }
    },
    [mode, config, timeoutSeconds, maxRetries, backoffMultiplier, onSuccess, onError]
  );

  const execute = useCallback(
    async (operations: Horizon.Operation[]): Promise<void> => {
      const xdr = await build(operations);
      const signedXdr = await sign(xdr);
      await submit(signedXdr);
    },
    [build, sign, submit]
  );

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    ...state,
    build,
    sign,
    submit,
    execute,
    reset,
  };
}
