import { useCallback, useReducer } from "react";
import {
  Contract,
  Transaction,
  TransactionBuilder,
  BASE_FEE,
  xdr,
  nativeToScVal,
} from "@stellar/stellar-sdk";
import { rpc } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { useFreighter } from "./useFreighter";
import type { ContractCallOptions, UseContractCallReturn, TransactionStatus } from "../types";
import { sleep, backoff } from "../utils";

// ─── State ─────────────────────────────────────────────────────────────────────

interface ContractState<TResult> {
  status: TransactionStatus;
  hash: string | null;
  result: TResult | null;
  error: Error | null;
}

type Action<TResult> =
  | { type: "RESET" }
  | { type: "BUILDING" }
  | { type: "SIGNING" }
  | { type: "SUBMITTING" }
  | { type: "POLLING" }
  | { type: "SUCCESS"; payload: TResult; hash: string }
  | { type: "ERROR"; payload: Error };

function createReducer<TResult>() {
  return function reducer(
    state: ContractState<TResult>,
    action: Action<TResult>
  ): ContractState<TResult> {
    switch (action.type) {
      case "RESET":
        return { status: "idle", hash: null, result: null, error: null };
      case "BUILDING":
        return { ...state, status: "building", error: null };
      case "SIGNING":
        return { ...state, status: "signing" };
      case "SUBMITTING":
        return { ...state, status: "submitting" };
      case "POLLING":
        return { ...state, status: "polling" };
      case "SUCCESS":
        return { status: "success", hash: action.hash, result: action.payload, error: null };
      case "ERROR":
        return { ...state, status: "error", error: action.payload };
      default:
        return state;
    }
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSorobanContract<TResult = unknown>(
  options: ContractCallOptions
): UseContractCallReturn<TResult> {
  const { config } = useStellarContext();
  const { publicKey, networkPassphrase, signTransaction } = useFreighter();

  const reducer = createReducer<TResult>();
  const [state, dispatch] = useReducer(reducer, {
    status: "idle",
    hash: null,
    result: null,
    error: null,
  });

  const call = useCallback(
    async (overrides?: Partial<ContractCallOptions>): Promise<TResult | null> => {
      const {
        contractId,
        method,
        args = [],
        fee = BASE_FEE,
        timeoutSeconds = 30,
        sorobanRpcServer,
      } = { ...options, ...overrides };

      if (!publicKey) {
        const err = new Error("No wallet connected. Call useFreighter().connect() first.");
        dispatch({ type: "ERROR", payload: err });
        return null;
      }

      try {
        // ── 1. Build ──────────────────────────────────────────────────────────
        dispatch({ type: "BUILDING" });

        const server = sorobanRpcServer ?? new rpc.Server(config.sorobanRpcUrl);
        const contract = new Contract(contractId);

        const scArgs = args.map((a) =>
          a instanceof xdr.ScVal ? a : nativeToScVal(a as never)
        );

        const account = await server.getAccount(publicKey);
        const passphrase = networkPassphrase ?? config.networkPassphrase;

        const tx = new TransactionBuilder(account, {
          fee: String(fee),
          networkPassphrase: passphrase,
        })
          .addOperation(contract.call(method, ...scArgs))
          .setTimeout(timeoutSeconds)
          .build();

        // ── 2. Simulate ───────────────────────────────────────────────────────
        const simResult = await server.simulateTransaction(tx);

        if (rpc.Api.isSimulationError(simResult)) {
          throw new Error(`Simulation failed: ${simResult.error}`);
        }

        const preparedTx = rpc.assembleTransaction(tx, simResult).build();

        // ── 3. Sign ───────────────────────────────────────────────────────────
        dispatch({ type: "SIGNING" });

        const signedXdr = await signTransaction(preparedTx.toXDR(), {
          networkPassphrase: passphrase,
        });

        const signedTx = TransactionBuilder.fromXDR(
          signedXdr,
          passphrase
        ) as Transaction;

        // ── 4. Submit ─────────────────────────────────────────────────────────
        dispatch({ type: "SUBMITTING" });

        const sendResult = await server.sendTransaction(signedTx);

        if (sendResult.status === "ERROR") {
          throw new Error(`Submission failed: ${JSON.stringify(sendResult.errorResult)}`);
        }

        const txHash = sendResult.hash;

        // ── 5. Poll ───────────────────────────────────────────────────────────
        dispatch({ type: "POLLING" });

        let attempt = 0;
        const deadline = Date.now() + timeoutSeconds * 1000;

        while (Date.now() < deadline) {
          await sleep(backoff(attempt));
          attempt++;

          const getResult = await server.getTransaction(txHash);

          if (getResult.status === rpc.Api.GetTransactionStatus.SUCCESS) {
            let parsed: TResult = txHash as TResult;

            if (getResult.resultMetaXdr) {
              try {
                const meta = xdr.TransactionMeta.fromXDR(getResult.resultMetaXdr.toXDR());
                const v3 = meta.v3();
                const sorobanMeta = v3.sorobanMeta();
                if (sorobanMeta) {
                  parsed = sorobanMeta.returnValue() as unknown as TResult;
                }
              } catch {
                // Non-fatal
              }
            }

            dispatch({ type: "SUCCESS", payload: parsed, hash: txHash });
            return parsed;
          }

          if (getResult.status === rpc.Api.GetTransactionStatus.FAILED) {
            throw new Error(`Transaction failed: ${txHash}`);
          }
        }

        throw new Error(`Transaction timed out after ${timeoutSeconds}s: ${txHash}`);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        dispatch({ type: "ERROR", payload: error });
        return null;
      }
    },
    [options, publicKey, networkPassphrase, signTransaction, config]
  );

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    ...state,
    isLoading: !["idle", "success", "error"].includes(state.status),
    isSuccess: state.status === "success",
    isError: state.status === "error",
    call,
    reset,
  };
}
