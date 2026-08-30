/**
 * @file useWasmUpload.ts
 * @description Upload a compiled Soroban contract WASM binary to the network.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useRef, useState } from "react";
import { hash, Operation, rpc, TransactionBuilder } from "@stellar/stellar-sdk";
import type { Transaction } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import useFreighter from "./useFreighter";
import { unsafeAsXdrString } from "../types";
import { sleep, backoff } from "../utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseWasmUploadOptions {
  /** Base fee in stroops. Default: `"100000"`. */
  fee?: string;
  /** Timeout in seconds for submission + confirmation polling. Default: `120`. */
  timeoutSeconds?: number;
  /** Override the Soroban RPC server (defaults to the one from `StellarProvider`). */
  sorobanRpcServer?: rpc.Server;
  /** Called once the upload transaction is confirmed on-chain. */
  onSuccess?: (result: { wasmHash: string; transactionHash: string }) => void;
  /** Called with the error when the upload fails at any step. */
  onError?: (error: Error) => void;
}

export type WasmUploadPhase =
  | "idle"
  | "preparing"
  | "simulating"
  | "signing"
  | "submitting"
  | "confirming";

export interface WasmUploadState {
  /** Upload progress from 0 → 1 (best-effort mapping of `phase`). */
  progress: number;
  /** sha256 of the last successfully uploaded WASM binary (hex). */
  wasmHash: string | null;
  /** Transaction hash of the last submitted upload (`0x`-prefixed hex). */
  transactionHash: string | null;
  /** Current phase of the upload pipeline. */
  phase: WasmUploadPhase;
  /** `true` while any phase of the upload is in flight. */
  isLoading: boolean;
  /** `true` after the last upload confirmed successfully. */
  isSuccess: boolean;
  /** Most recent error, or `null`. */
  error: Error | null;
  /** Reset the transient state (`error`, `phase`, `isSuccess`, ...). */
  reset: () => void;
}

export interface UseWasmUploadReturn extends WasmUploadState {
  /**
   * Upload a compiled WASM binary.
   *
   * @returns The upload result (`{ wasmHash, transactionHash }`) or `null` when
   *          the upload failed (the error is also surfaced via `onError`/`error`).
   */
  upload: (
    wasm: Buffer | Uint8Array,
  ) => Promise<{ wasmHash: string; transactionHash: string } | null>;
}

// ─── Phase → progress helper ──────────────────────────────────────────────────

const PHASE_PROGRESS: Record<WasmUploadPhase, number> = {
  idle: 0,
  preparing: 0.15,
  simulating: 0.3,
  signing: 0.5,
  submitting: 0.75,
  confirming: 0.9,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Upload a compiled Soroban contract WASM binary to the network, returning the
 * hash of the uploaded binary. Requires a Deployer contract account funded with
 * a few XLM (deployment costs are paid by the uploader).
 *
 * @example
 * ```tsx
 * const { upload, isLoading, wasmHash, error } = useWasmUpload();
 *
 * const onClick = async () => {
 *   const res = await upload(myCompiledWasm); // Buffer | Uint8Array
 *   if (res) console.log(`Uploaded ${res.wasmHash}`);
 * };
 * ```
 */
export function useWasmUpload(options: UseWasmUploadOptions = {}): UseWasmUploadReturn {
  const { config } = useStellarContext();
  const { publicKey, networkPassphrase, signTransaction } = useFreighter();
  const busyRef = useRef(false);
  const { fee = "100000", timeoutSeconds = 120, sorobanRpcServer, onSuccess, onError } = options;

  const [phase, setPhase] = useState<WasmUploadPhase>("idle");
  const [wasmHash, setWasmHash] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const upload = useCallback(
    async (
      wasm: Buffer | Uint8Array,
    ): Promise<{ wasmHash: string; transactionHash: string } | null> => {
      if (busyRef.current) return null;
      if (!wasm || wasm.length === 0) {
        const err = new Error("Cannot upload an empty WASM binary.");
        setError(err);
        onError?.(err);
        return null;
      }

      busyRef.current = true;
      setError(null);
      setWasmHash(null);
      setTransactionHash(null);
      setPhase("preparing");

      const fail = (err: Error) => {
        setError(err);
        setPhase("idle");
        busyRef.current = false;
        onError?.(err);
        return null;
      };

      try {
        const buffer = Buffer.from(wasm);
        const wasmHashHex = hash(buffer).toString("hex");

        // ── 1. Build ───────────────────────────────────────────────────────────
        const server = sorobanRpcServer ?? new rpc.Server(config.sorobanRpcUrl);
        const source = await server.getAccount(publicKey);

        const tx = new TransactionBuilder(source, {
          fee,
          networkPassphrase: networkPassphrase,
        })
          .addOperation(Operation.uploadContractWasm({ wasm: buffer }))
          .setTimeout(timeoutSeconds)
          .build();

        setPhase("simulating");

        // ── 2. Simulate (sets resource fees + footprint) ───────────────────────
        const simResult = await server.simulateTransaction(tx);
        if (rpc.Api.isSimulationError(simResult)) {
          return fail(new Error(`Simulation failed: ${simResult.error}`));
        }
        const preparedTx = rpc.assembleTransaction(tx, simResult).build();

        // ── 3. Sign ────────────────────────────────────────────────────────────
        setPhase("signing");
        const signedXdr = await signTransaction(
          unsafeAsXdrString(preparedTx.toXDR()),
          { networkPassphrase },
        );
        const signedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase) as Transaction;

        // ── 4. Submit ──────────────────────────────────────────────────────────
        setPhase("submitting");
        const sendResult = await server.sendTransaction(signedTx);
        if (sendResult.status === "ERROR") {
          return fail(
            new Error(`Submission failed: ${JSON.stringify(sendResult.errorResult)}`),
          );
        }

        const txHash = sendResult.hash;

        // ── 5. Confirm ─────────────────────────────────────────────────────────
        setPhase("confirming");
        const deadline = Date.now() + timeoutSeconds * 1000;
        let attempt = 0;
        while (Date.now() < deadline) {
          await sleep(backoff(attempt));
          attempt++;
          const getResult = await server.getTransaction(txHash);
          if (getResult.status === rpc.Api.GetTransactionStatus.SUCCESS) {
            const result = { wasmHash: wasmHashHex, transactionHash: txHash };
            setWasmHash(wasmHashHex);
            setTransactionHash(txHash);
            setPhase("idle");
            busyRef.current = false;
            onSuccess?.(result);
            return result;
          }
          if (getResult.status === rpc.Api.GetTransactionStatus.FAILED) {
            return fail(
              new Error(
                `Upload transaction failed on-chain: ${JSON.stringify(getResult.resultXdr)}`,
              ),
            );
          }
        }
        return fail(new Error("Timed out waiting for the upload transaction to confirm."));
      } catch (err) {
        return fail(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [config.sorobanRpcUrl, publicKey, networkPassphrase, signTransaction, fee, timeoutSeconds, sorobanRpcServer, onSuccess, onError],
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setWasmHash(null);
    setTransactionHash(null);
    setError(null);
  }, []);

  return {
    upload,
    progress: PHASE_PROGRESS[phase],
    wasmHash,
    transactionHash,
    phase: phaseRef.current,
    isLoading: phase !== "idle",
    isSuccess: wasmHash !== null && transactionHash !== null,
    error,
    reset,
  };
}

export default useWasmUpload;