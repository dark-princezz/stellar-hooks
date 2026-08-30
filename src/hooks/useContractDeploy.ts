/**
 * @file useContractDeploy.ts
 * @description Deploy a new Soroban contract instance from a previously
 *   uploaded WASM binary.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useRef, useState } from "react";
import { Address, hash, Operation, rpc, StrKey, TransactionBuilder, xdr } from "@stellar/stellar-sdk";
import type { Transaction } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import useFreighter from "./useFreighter";
import { unsafeAsXdrString } from "../types";
import { sleep, backoff } from "../utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseContractDeployOptions {
  /** Base fee in stroops. Default: `"100000"`. */
  fee?: string;
  /** Timeout in seconds for submission + confirmation polling. Default: `120`. */
  timeoutSeconds?: number;
  /** Override the Soroban RPC server (defaults to the one from `StellarProvider`). */
  sorobanRpcServer?: rpc.Server;
  /** Called once the deploy transaction is confirmed on-chain. */
  onSuccess?: (result: { contractId: string; transactionHash: string }) => void;
  /** Called with the error when the deploy fails at any step. */
  onError?: (error: Error) => void;
}

export type ContractDeployPhase =
  | "idle"
  | "preparing"
  | "simulating"
  | "signing"
  | "submitting"
  | "confirming";

export interface ContractDeployOverrides {
  /**
   * Deterministic salt (32 bytes) used when deriving the new contract's ID.
   * Omitted by default, in which case a random salt is generated per deploy.
   * Supply a fixed salt to make the deploy idempotent for a given address.
   */
  salt?: Buffer | Uint8Array;
}

export interface UseContractDeployReturn {
  /**
   * Deploy a new contract instance from an uploaded WASM hash.
   *
   * @param wasmHash  Hash of the WASM to deploy (32-byte Buffer/Uint8Array, or
   *                  hex string, e.g. the value returned by {@link useWasmUpload}).
   * @param constructorArgs  Optional `constructor_args` passed to the contract's
   *                         `__constructor` function.
   * @param overrides  Optional per-call overrides (e.g. a fixed `salt`).
   *
   * @returns `{ contractId, transactionHash }`, or `null` when the deploy
   *          failed (the error is surfaced via `onError`/`error`).
   */
  deploy: (
    wasmHash: string | Buffer | Uint8Array,
    constructorArgs?: xdr.ScVal[],
    overrides?: ContractDeployOverrides,
  ) => Promise<{ contractId: string; transactionHash: string } | null>;
  /** ID of the last deployed contract (`C...`). */
  contractId: string | null;
  /** Transaction hash of the last submitted deploy (`0x`-prefixed hex). */
  transactionHash: string | null;
  /** Deploy progress from 0 → 1 (best-effort mapping of `phase`). */
  progress: number;
  /** Current phase of the deploy pipeline. */
  phase: ContractDeployPhase;
  /** `true` while any phase of the deploy is in flight. */
  isLoading: boolean;
  /** `true` after the last deploy confirmed successfully. */
  isSuccess: boolean;
  /** Most recent error, or `null`. */
  error: Error | null;
  /** Reset the transient state (`error`, `phase`, `isSuccess`, ...). */
  reset: () => void;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const PHASE_PROGRESS: Record<ContractDeployPhase, number> = {
  idle: 0,
  preparing: 0.1,
  simulating: 0.3,
  signing: 0.5,
  submitting: 0.75,
  confirming: 0.9,
};

function toWasmHashBuffer(wasmHash: string | Buffer | Uint8Array): Buffer {
  if (typeof wasmHash === "string") {
    const hex = wasmHash.replace(/^0x/, "");
    if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length !== 64) {
      throw new Error("`wasmHash` must be a 32-byte Buffer/Uint8Array or its 64-char hex string.");
    }
    return Buffer.from(hex, "hex");
  }
  const buf = Buffer.from(wasmHash);
  if (buf.length !== 32) {
    throw new Error("`wasmHash` must be exactly 32 bytes.");
  }
  return buf;
}

/**
 * Derive the contract ID (C...) from a deploy's source address + salt,
 * following the Soroban spec:
 *
 *   contractId = sha256(ContractIdPreimageFromAddress || sha256(networkPassphrase))
 *
 * Used as a fallback when the simulation preflight does not return the
 * deployed contract's address (`SimulateHostFunctionResult.retval`), which can
 * happen with certain RPC implementations.
 */
export function deriveContractId(
  sourceAddress: string,
  salt: Buffer | Uint8Array,
  networkPassphrase: string,
): string {
  const networkId = hash(Buffer.from(networkPassphrase));
  const preimage = xdr.ContractIdPreimage.contractIdPreimageFromAddress(
    new xdr.ContractIdPreimageFromAddress({
      address: new Address(sourceAddress).toScAddress(),
      salt: Buffer.from(salt),
    }),
  );
  const digest = hash(Buffer.concat([Buffer.from(preimage.toXDR()), Buffer.from(networkId)]));
  return StrKey.encodeContract(digest);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Deploy a new Soroban contract instance from an already-uploaded WASM binary.
 *
 * The new contract's ID is read from the preflight simulation's return value
 * when available, falling back to on-chain contract-ID derivation
 * ({@link deriveContractId}) otherwise.
 *
 * @example
 * ```tsx
 * const { upload, wasmHash } = useWasmUpload();
 * const { deploy, contractId, isLoading, error } = useContractDeploy();
 *
 * const onDeploy = async () => {
 *   const up = await upload(myCompiledWasm);
 *   if (!up) return;
 *   const res = await deploy(up.wasmHash, [new Address(someAccount).toScVal()]);
 *   if (res) console.log(`Deployed ${res.contractId}`);
 * };
 * ```
 */
export function useContractDeploy(
  options: UseContractDeployOptions = {},
): UseContractDeployReturn {
  const { config } = useStellarContext();
  const { publicKey, networkPassphrase, signTransaction } = useFreighter();
  const busyRef = useRef(false);
  const { fee = "100000", timeoutSeconds = 120, sorobanRpcServer, onSuccess, onError } = options;

  const [phase, setPhase] = useState<ContractDeployPhase>("idle");
  const [contractId, setContractId] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const deploy = useCallback(
    async (
      wasmHashArg: string | Buffer | Uint8Array,
      constructorArgs: xdr.ScVal[] = [],
      overrides: ContractDeployOverrides = {},
    ): Promise<{ contractId: string; transactionHash: string } | null> => {
      if (busyRef.current) return null;

      let wasmHash: Buffer;
      try {
        wasmHash = toWasmHashBuffer(wasmHashArg);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        onError?.(e);
        return null;
      }

      const salt = overrides.salt
        ? Buffer.from(overrides.salt)
        : Buffer.from(crypto.getRandomValues(new Uint8Array(32)));

      busyRef.current = true;
      setError(null);
      setContractId(null);
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
        const address = new Address(publicKey);

        // ── 1. Build ───────────────────────────────────────────────────────────
        const server = sorobanRpcServer ?? new rpc.Server(config.sorobanRpcUrl);
        const source = await server.getAccount(publicKey);

        const tx = new TransactionBuilder(source, {
          fee,
          networkPassphrase,
        })
          .addOperation(
            Operation.createCustomContract({
              // The deployer (source) is used as the deployer address: the
              // preimage `from_address` is `publicKey`, so the derived
              // contract ID is a function of { address, salt }.
              address,
              wasmHash,
              salt,
              constructorArgs,
            }),
          )
          .setTimeout(timeoutSeconds)
          .build();

        setPhase("simulating");

        // ── 2. Simulate (sets resource fees + footprint) ───────────────────────
        const simResult = await server.simulateTransaction(tx);
        if (rpc.Api.isSimulationError(simResult)) {
          return fail(new Error(`Simulation failed: ${simResult.error}`));
        }

        // The deploy's simulated retval is the new contract's address.
        let newContractId: string;
        const retval = simResult.result?.retval;
        if (retval) {
          try {
            newContractId = Address.fromScVal(retval).toString();
          } catch {
            newContractId = deriveContractId(address.toString(), salt, networkPassphrase);
          }
        } else {
          newContractId = deriveContractId(address.toString(), salt, networkPassphrase);
        }

        const preparedTx = rpc.assembleTransaction(tx, simResult).build();

        // ── 3. Sign ────────────────────────────────────────────────────────────
        setPhase("signing");
        const signedXdr = await signTransaction(unsafeAsXdrString(preparedTx.toXDR()), {
          networkPassphrase,
        });
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
            const result = { contractId: newContractId, transactionHash: txHash };
            setContractId(newContractId);
            setTransactionHash(txHash);
            setPhase("idle");
            busyRef.current = false;
            onSuccess?.(result);
            return result;
          }
          if (getResult.status === rpc.Api.GetTransactionStatus.FAILED) {
            return fail(
              new Error(
                `Deploy transaction failed on-chain: ${JSON.stringify(getResult.resultXdr)}`,
              ),
            );
          }
        }
        return fail(new Error("Timed out waiting for the deploy transaction to confirm."));
      } catch (err) {
        return fail(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [config.sorobanRpcUrl, publicKey, networkPassphrase, signTransaction, fee, timeoutSeconds, sorobanRpcServer, onSuccess, onError],
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setContractId(null);
    setTransactionHash(null);
    setError(null);
  }, []);

  return {
    deploy,
    progress: PHASE_PROGRESS[phase],
    contractId,
    transactionHash,
    phase: phaseRef.current,
    isLoading: phase !== "idle",
    isSuccess: contractId !== null && transactionHash !== null,
    error,
    reset,
  };
}

// Re-export the phase map so callers can render progress independently.
export default useContractDeploy;