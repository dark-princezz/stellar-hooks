/**
 * @file useSorobanSimulate.ts
 * @description Hook for raw Soroban transaction simulation results.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useReducer, useRef, useEffect } from "react";
import {
  Contract,
  TransactionBuilder,
  BASE_FEE,
  xdr,
  nativeToScVal,
} from "@stellar/stellar-sdk";
import type { Transaction } from "@stellar/stellar-sdk";
import * as rpc from "@stellar/stellar-sdk/rpc";
import { useStellarContext } from "../context";
import { useFreighter } from "./useFreighter";
import type {
  SorobanSimulationEstimate,
  StellarContractId,
} from "../types";
import { validateContractId } from "../utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseSorobanSimulateOptions {
  /** Fee in stroops for the simulation transaction. Defaults to BASE_FEE. */
  fee?: number;
  /** Timeout in seconds for the built transaction. Defaults to 30. */
  timeoutSeconds?: number;
  /** Custom Soroban RPC server instance. If not provided, one is created from the provider config. */
  sorobanRpcServer?: rpc.Server;
}

export interface UseSorobanSimulateReturn {
  /** The raw simulation response from Soroban RPC, or `null` if not yet simulated. */
  simulation: rpc.Api.SimulateTransactionResponse | null;
  /** Normalized cost estimate derived from the simulation, or `null`. */
  estimatedCost: SorobanSimulationEstimate | null;
  /** Error from the most recent simulation attempt, or `null`. */
  error: Error | null;
  /** `true` while a simulation RPC call is in flight. */
  isLoading: boolean;
  /**
   * Perform a simulation-only call. Builds a transaction, submits it
   * to Soroban RPC for preflight simulation, and returns the raw result.
   * Does NOT sign or submit on-chain.
   */
  simulate: (
    method: string,
    args?: unknown[],
    overrides?: {
      fee?: number;
      timeoutSeconds?: number;
    }
  ) => Promise<rpc.Api.SimulateTransactionResponse>;
  /** Reset simulation state back to idle. */
  reset: () => void;
}

// ─── State ─────────────────────────────────────────────────────────────────────

interface SimulateState {
  simulation: rpc.Api.SimulateTransactionResponse | null;
  estimatedCost: SorobanSimulationEstimate | null;
  error: Error | null;
  isLoading: boolean;
}

type SimulateAction =
  | { type: "RESET" }
  | { type: "START" }
  | {
      type: "SUCCESS";
      payload: {
        simulation: rpc.Api.SimulateTransactionResponse;
        estimatedCost: SorobanSimulationEstimate;
      };
    }
  | { type: "ERROR"; payload: Error };

function reducer(state: SimulateState, action: SimulateAction): SimulateState {
  switch (action.type) {
    case "RESET":
      return { simulation: null, estimatedCost: null, error: null, isLoading: false };
    case "START":
      return { ...state, isLoading: true, error: null };
    case "SUCCESS":
      return {
        simulation: action.payload.simulation,
        estimatedCost: action.payload.estimatedCost,
        error: null,
        isLoading: false,
      };
    case "ERROR":
      return { ...state, error: action.payload, isLoading: false };
    default:
      return state;
  }
}

function estimateFromSimulation(
  simulation: rpc.Api.SimulateTransactionResponse,
): SorobanSimulationEstimate {
  const simulationRecord = simulation as unknown as Record<string, unknown>;
  const cost =
    "cost" in simulationRecord ? simulationRecord.cost ?? null : null;
  const costRecord =
    typeof cost === "object" && cost !== null
      ? (cost as Record<string, unknown>)
      : null;

  const resourceFeeCandidate =
    simulationRecord.minResourceFee ??
    simulationRecord.resourceFee ??
    costRecord?.resourceFee ??
    costRecord?.fee ??
    null;
  const instructionsCandidate =
    costRecord?.cpuInsns ??
    costRecord?.instructions ??
    costRecord?.instructionCount ??
    null;

  return {
    resourceFee:
      typeof resourceFeeCandidate === "string" ||
      typeof resourceFeeCandidate === "number"
        ? String(resourceFeeCandidate)
        : null,
    instructions:
      typeof instructionsCandidate === "string" ||
      typeof instructionsCandidate === "number"
        ? instructionsCandidate
        : null,
    cost,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Perform raw Soroban transaction simulation without signing or submitting.
 * Exposes the full simulation response (cost, footprint, auth entries) for
 * fee estimation UIs, dry-run previews, and preflight validation.
 *
 * @param contractId Soroban contract address (C...)
 * @param options    Configuration (fee, timeoutSeconds, sorobanRpcServer)
 *
 * @example
 * ```tsx
 * const { simulate, simulation, estimatedCost, isLoading } = useSorobanSimulate(
 *   "CABCDEF...",
 *   { fee: 1000 }
 * );
 *
 * const result = await simulate("balance", [userAddress]);
 * console.log(result.result?.retval);
 * console.log(estimatedCost?.resourceFee);
 * ```
 */
export function useSorobanSimulate(
  contractId: StellarContractId,
  options: UseSorobanSimulateOptions = {},
): UseSorobanSimulateReturn {
  const { fee = BASE_FEE, timeoutSeconds = 30, sorobanRpcServer } = options;

  const { config } = useStellarContext();
  const { publicKey, networkPassphrase } = useFreighter();

  const [state, dispatch] = useReducer(reducer, {
    simulation: null,
    estimatedCost: null,
    error: null,
    isLoading: false,
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const simulate = useCallback(
    async (
      method: string,
      args: unknown[] = [],
      overrides?: { fee?: number; timeoutSeconds?: number },
    ): Promise<rpc.Api.SimulateTransactionResponse> => {
      const simFee = overrides?.fee ?? fee;
      const simTimeout = overrides?.timeoutSeconds ?? timeoutSeconds;

      if (!publicKey) {
        throw new Error("No wallet connected. Call useFreighter().connect() first.");
      }

      validateContractId(contractId);

      dispatch({ type: "START" });

      try {
        const server = sorobanRpcServer ?? new rpc.Server(config.sorobanRpcUrl);
        const contract = new Contract(contractId);

        const scArgs = args.map((a) =>
          a instanceof xdr.ScVal ? a : nativeToScVal(a),
        );

        const account = await server.getAccount(publicKey);
        const passphrase = networkPassphrase ?? config.networkPassphrase;

        const tx = new TransactionBuilder(account, {
          fee: String(simFee),
          networkPassphrase: passphrase,
        })
          .addOperation(contract.call(method, ...scArgs))
          .setTimeout(simTimeout)
          .build();

        const simulation = await server.simulateTransaction(tx);

        if (rpc.Api.isSimulationError(simulation)) {
          const err = new Error(`Simulation failed: ${simulation.error}`);
          dispatch({ type: "ERROR", payload: err });
          throw err;
        }

        const estimatedCost = estimateFromSimulation(simulation);
        dispatch({ type: "SUCCESS", payload: { simulation, estimatedCost } });
        return simulation;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (stateRef.current.isLoading) {
          dispatch({ type: "ERROR", payload: error });
        }
        throw error;
      }
    },
    [contractId, fee, timeoutSeconds, sorobanRpcServer, publicKey, networkPassphrase, config],
  );

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    simulation: state.simulation,
    estimatedCost: state.estimatedCost,
    error: state.error,
    isLoading: state.isLoading,
    simulate,
    reset,
  };
}
