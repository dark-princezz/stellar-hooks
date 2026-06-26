import { useCallback, useReducer } from "react";
import {
  rpc,
  TransactionBuilder,
  Horizon,
} from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import type { TransactionState, TransactionStatus } from "../types";
import { sleep, backoff } from "../utils";

// ─── Options ──────────────────────────────────────────────────────────────────

export interface UseTransactionOptions {
  mode?: "soroban" | "classic";
  timeoutSeconds?: number;
}

export interface UseTransactionReturn extends TransactionState {
  submit: (signedXdr: string) => Promise<void>;
  reset: () => void;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "RESET" }
  | { type: "STATUS"; payload: TransactionStatus }
  | { type: "SUCCESS"; hash: string }
  | { type: "ERROR"; payload: Error };

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

export function useTransaction(
  options: UseTransactionOptions = {}
): UseTransactionReturn {
  const { mode = "soroban", timeoutSeconds = 60 } = options;
  const { config } = useStellarContext();
  const [state, dispatch] = useReducer(reducer, initial);

  const submit = useCallback(
    async (signedXdr: string) => {
      dispatch({ type: "STATUS", payload: "submitting" });

      try {
        if (mode === "soroban") {
          const server = new rpc.Server(config.sorobanRpcUrl);
          const tx = TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase);

          const sendResult = await server.sendTransaction(tx);

          if (sendResult.status === "ERROR") {
            throw new Error(`Submission error: ${JSON.stringify(sendResult.errorResult)}`);
          }

          const txHash = sendResult.hash;
          dispatch({ type: "STATUS", payload: "polling" });

          const deadline = Date.now() + timeoutSeconds * 1000;
          let attempt = 0;

          while (Date.now() < deadline) {
            await sleep(backoff(attempt));
            attempt++;

            const getResult = await server.getTransaction(txHash);

            if (getResult.status === rpc.Api.GetTransactionStatus.SUCCESS) {
              dispatch({ type: "SUCCESS", hash: txHash });
              return;
            }

            if (getResult.status === rpc.Api.GetTransactionStatus.FAILED) {
              throw new Error(`Transaction failed on-chain: ${txHash}`);
            }
          }

          throw new Error(`Transaction polling timed out: ${txHash}`);
        } else {
          // Classic Horizon path
          const server = new Horizon.Server(config.horizonUrl);
          const tx = TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase);

          const result = await server.submitTransaction(tx as Parameters<typeof server.submitTransaction>[0]);
          dispatch({ type: "SUCCESS", hash: result.hash });
        }
      } catch (err) {
        dispatch({
          type: "ERROR",
          payload: err instanceof Error ? err : new Error(String(err)),
        });
      }
    },
    [mode, config, timeoutSeconds]
  );

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return { ...state, submit, reset };
}
