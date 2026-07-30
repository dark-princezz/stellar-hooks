/**
 * @file useMultiOperationTransaction.ts
 * @description Hook for building and submitting a single Stellar transaction
 *              that contains multiple operations with unified status tracking.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useReducer } from "react";
import {
  Horizon,
  Memo,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { useFreighter } from "./useFreighter";
import { useTransactionCore } from "./useTransactionCore";
import type {
  StellarTransactionError,
  StellarXdrString,
  TransactionState,
  TransactionStatus,
} from "../types";
import { unsafeAsXdrString } from "../types";
import { validatePublicKey } from "../utils";

export type MultiOperationBuilder = () => xdr.Operation | Promise<xdr.Operation>;
export type MultiOperationInput = xdr.Operation | MultiOperationBuilder;

export interface UseMultiOperationTransactionOptions {
  /**
   * "classic" submits through Horizon; "soroban" submits through the RPC server.
   * Default: "classic"
   */
  mode?: "classic" | "soroban";
  /** Base fee in stroops. Default: 100 */
  fee?: number;
  /** Optional text memo attached to every transaction built by this hook. */
  memo?: string;
  /**
   * Wrap the inner transaction in a fee-bump sponsored by a separate account.
   * `fee` is the total fee for the fee-bump envelope (in stroops as a string).
   * `sponsor` defaults to the connected wallet's public key if omitted.
   */
  feeBump?: {
    fee: string;
    sponsor?: string;
  };
  /** Build and polling timeout in seconds. Default: 60 */
  timeoutSeconds?: number;
  /** Callback fired when the transaction is successfully confirmed on-chain. */
  onSuccess?: (hash: string) => void;
  /** Callback fired when an error occurs at any stage. */
  onError?: (error: StellarTransactionError) => void;
}

export interface UseMultiOperationTransactionReturn {
  /**
   * Build an unsigned transaction XDR from the provided operation inputs.
   * Useful when callers want to inspect or cache the assembled transaction.
   */
  build: (operations: readonly MultiOperationInput[]) => Promise<StellarXdrString>;
  /**
   * Build, sign, and submit a single transaction containing all provided
   * operations. The hook exposes one combined lifecycle for the batch.
   */
  submit: (operations: readonly MultiOperationInput[]) => Promise<void>;
  /** Current lifecycle status for the combined transaction. */
  status: TransactionStatus;
  /** Transaction hash once the combined transaction is confirmed on-chain. */
  hash: TransactionState["hash"];
  /** Error object if the combined transaction fails at any stage. */
  error: StellarTransactionError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  /** Reset state back to idle. */
  reset: () => void;
}

interface LocalState {
  status: "idle" | "building" | "signing" | "error";
  error: StellarTransactionError | null;
}

type LocalAction =
  | { type: "RESET" }
  | { type: "STATUS"; payload: "building" | "signing" }
  | { type: "ERROR"; payload: StellarTransactionError };

const initialLocalState: LocalState = {
  status: "idle",
  error: null,
};

function localReducer(state: LocalState, action: LocalAction): LocalState {
  switch (action.type) {
    case "RESET":
      return initialLocalState;
    case "STATUS":
      return { status: action.payload, error: null };
    case "ERROR":
      return { status: "error", error: action.payload };
    default:
      return state;
  }
}

function isTransactionError(value: unknown): value is StellarTransactionError {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as { type?: unknown; message?: unknown };
  return (
    typeof candidate.message === "string" &&
    (candidate.type === "network" ||
      candidate.type === "transaction" ||
      candidate.type === "timeout")
  );
}

function normalizeTransactionError(error: unknown): StellarTransactionError {
  if (isTransactionError(error)) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);

  if (message.toLowerCase().includes("timeout")) {
    return {
      type: "timeout",
      message,
    };
  }

  return {
    type: "network",
    message,
  };
}

function isOperationBuilder(
  operation: MultiOperationInput,
): operation is MultiOperationBuilder {
  return typeof operation === "function";
}

export function useMultiOperationTransaction(
  options: UseMultiOperationTransactionOptions = {},
): UseMultiOperationTransactionReturn {
  const {
    mode = "classic",
    fee = 100,
    memo,
    feeBump,
    timeoutSeconds = 60,
    onSuccess,
    onError,
  } = options;

  const { config } = useStellarContext();
  const { signTransaction, publicKey } = useFreighter();
  const [localState, dispatchLocal] = useReducer(localReducer, initialLocalState);
  const {
    submit: submitXdr,
    reset: resetCore,
    status: coreStatus,
    hash,
    error: coreError,
    isLoading: coreIsLoading,
    isSuccess,
    isError: coreIsError,
  } = useTransactionCore({
    mode,
    timeoutSeconds,
    debugLabel: "useMultiOperationTransaction",
    ...(onSuccess && { onSuccess }),
    ...(onError && { onError }),
  });

  const resolveOperations = useCallback(
    async (operations: readonly MultiOperationInput[]): Promise<xdr.Operation[]> => {
      const resolved: xdr.Operation[] = [];

      for (const operation of operations) {
        resolved.push(
          isOperationBuilder(operation) ? await operation() : operation,
        );
      }

      return resolved;
    },
    [],
  );

  const buildTransaction = useCallback(
    async (operations: readonly MultiOperationInput[]) => {
      if (!publicKey) {
        throw new Error("Freighter is not connected. Call connect() first.");
      }

      const resolvedOperations = await resolveOperations(operations);

      if (resolvedOperations.length === 0) {
        throw new Error("At least one operation is required.");
      }

      const server = new Horizon.Server(config.horizonUrl);
      const sourceAccount = await server.loadAccount(publicKey);

      const builder = new TransactionBuilder(sourceAccount, {
        fee: String(fee),
        networkPassphrase: config.networkPassphrase,
      }).setTimeout(timeoutSeconds);

      for (const operation of resolvedOperations) {
        builder.addOperation(operation);
      }

      if (memo) {
        builder.addMemo(Memo.text(memo));
      }

      return builder.build();
    },
    [config, fee, memo, publicKey, resolveOperations, timeoutSeconds],
  );

  const build = useCallback(
    async (operations: readonly MultiOperationInput[]) =>
      unsafeAsXdrString((await buildTransaction(operations)).toXDR()),
    [buildTransaction],
  );

  const submit = useCallback(
    async (operations: readonly MultiOperationInput[]) => {
      dispatchLocal({ type: "RESET" });

      try {
        dispatchLocal({ type: "STATUS", payload: "building" });
        const builtTx = await buildTransaction(operations);

        dispatchLocal({ type: "STATUS", payload: "signing" });
        const signedInnerXdr = await signTransaction(
          unsafeAsXdrString(builtTx.toXDR()),
          { networkPassphrase: config.networkPassphrase },
        );

        dispatchLocal({ type: "RESET" });

        if (feeBump) {
          const sponsorAddress = feeBump.sponsor ?? publicKey;
          if (!sponsorAddress) {
            throw new Error("Freighter is not connected. Call connect() first.");
          }
          validatePublicKey(sponsorAddress, "feeBump.sponsor");

          const innerTx = TransactionBuilder.fromXDR(
            signedInnerXdr,
            config.networkPassphrase,
          );
          const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
            sponsorAddress,
            feeBump.fee,
            innerTx as Transaction,
            config.networkPassphrase,
          );
          const signedFeeBumpXdr = await signTransaction(
            unsafeAsXdrString(feeBumpTx.toXDR()),
            {
              networkPassphrase: config.networkPassphrase,
              address: sponsorAddress,
            },
          );
          await submitXdr(signedFeeBumpXdr);
          return;
        }

        await submitXdr(signedInnerXdr);
      } catch (error) {
        const normalizedError = normalizeTransactionError(error);
        dispatchLocal({ type: "ERROR", payload: normalizedError });
        onError?.(normalizedError);
        throw error;
      }
    },
    [
      buildTransaction,
      config.networkPassphrase,
      feeBump,
      onError,
      publicKey,
      signTransaction,
      submitXdr,
    ],
  );

  const reset = useCallback(() => {
    dispatchLocal({ type: "RESET" });
    resetCore();
  }, [resetCore]);

  const status: TransactionStatus =
    localState.status === "idle" ? coreStatus : localState.status;
  const error = localState.error ?? coreError;
  const isLoading =
    localState.status === "building" ||
    localState.status === "signing" ||
    coreIsLoading;
  const isError = localState.status === "error" || coreIsError;

  return {
    build,
    submit,
    reset,
    status,
    hash,
    error,
    isLoading,
    isSuccess,
    isError,
  };
}
