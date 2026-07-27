import { useCallback } from "react";
import { AuthFlag, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { getHorizonServer } from "../utils/memoizedServers";
import { useTransactionCore } from "./useTransactionCore";
import { useFreighter } from "./useFreighter";
import type { TransactionStatus, StellarTransactionError } from "../types";
import { unsafeAsXdrString } from "../types";

export type AccountFlag =
  | "authRequired"
  | "authRevocable"
  | "authImmutable"
  | "authClawbackEnabled";

export interface UseAccountFlagsOptions {
  setFlags?: AccountFlag[];
  clearFlags?: AccountFlag[];
  fee?: number;
  timeoutSeconds?: number;
  onSuccess?: (hash: string) => void;
  onError?: (error: StellarTransactionError) => void;
}

/**
 * @example
 * ```tsx
 * const {
 *   submit,    // () => Promise<void>
 *   status,    // "idle" | "submitting" | "polling" | "success" | "error"
 *   hash,      // string | null
 *   isLoading, // boolean
 *   isSuccess, // boolean
 *   isError,   // boolean
 *   error,     // Error | null
 *   reset,     // () => void
 * } = useAccountFlags({
 *   setFlags: ["authRequired"],
 *   clearFlags: ["authRevocable"],
 * });
 *
 * return <button onClick={submit} disabled={isLoading}>Update flags</button>;
 * ```
 */
export interface UseAccountFlagsReturn {
  submit: () => Promise<void>;
  status: TransactionStatus;
  hash: string | null;
  error: StellarTransactionError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
}

const FLAG_BITS: Record<AccountFlag, number> = {
  authRequired: 1,
  authRevocable: 2,
  authImmutable: 4,
  authClawbackEnabled: 8,
};

function toMask(flags: AccountFlag[]): number {
  return flags.reduce((mask, flag) => mask | FLAG_BITS[flag], 0);
}

/**
 * Sets or clears account-level flags (authRequired, authRevocable, authImmutable,
 * authClawbackEnabled) via a classic Stellar setOptions operation.
 *
 * Wraps `useTransaction({ mode: "classic" })` for submission and polling.
 *
 * @example
 * ```tsx
 * const { submit, status } = useAccountFlags({
 *   setFlags: ["authRequired", "authRevocable"],
 * });
 *
 * return <button onClick={submit} disabled={status !== "idle"}>Set Flags</button>;
 * ```
 */
export function useAccountFlags(options: UseAccountFlagsOptions = {}): UseAccountFlagsReturn {
  const { setFlags, clearFlags, fee = 100, timeoutSeconds = 60, onSuccess, onError } = options;

  const { config } = useStellarContext();
  const { signTransaction, publicKey } = useFreighter();
  const { submit: submitXdr, reset, ...txState } = useTransactionCore({
    mode: "classic",
    timeoutSeconds,
    ...(onSuccess && { onSuccess }),
    ...(onError && { onError }),
  });

  const submit = useCallback(async () => {
    if (!publicKey) {
      throw new Error("Freighter is not connected. Call connect() first.");
    }

    const server = getHorizonServer(config.horizonUrl);
    const sourceAccount = await server.loadAccount(publicKey);

    const setFlagsMask = setFlags && setFlags.length > 0 ? toMask(setFlags) : undefined;
    const clearFlagsMask = clearFlags && clearFlags.length > 0 ? toMask(clearFlags) : undefined;

    if (!setFlagsMask && !clearFlagsMask) {
      throw new Error("At least one of setFlags or clearFlags must be provided.");
    }

    const setOptionsParams: Parameters<typeof Operation.setOptions>[0] = {};
    if (setFlagsMask !== undefined) {
      setOptionsParams.setFlags = setFlagsMask as AuthFlag;
    }
    if (clearFlagsMask !== undefined) {
      setOptionsParams.clearFlags = clearFlagsMask as AuthFlag;
    }

    const builder = new TransactionBuilder(sourceAccount, {
      fee: String(fee),
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(Operation.setOptions(setOptionsParams))
      .setTimeout(timeoutSeconds);

    const builtTx = builder.build();
    const builtXdr = builtTx.toXDR();

    const signedXdr = await signTransaction(unsafeAsXdrString(builtXdr), {
       networkPassphrase: config.networkPassphrase,
    });

    await submitXdr(signedXdr);
  }, [
    setFlags,
    clearFlags,
    fee,
    timeoutSeconds,
    config,
    publicKey,
    signTransaction,
    submitXdr,
  ]);

  return {
    submit,
    reset,
    status: txState.status,
    hash: txState.hash,
    error: txState.error,
    isLoading: txState.isLoading,
    isSuccess: txState.isSuccess,
    isError: txState.isError,
  };
}
