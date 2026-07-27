import { useCallback, useState } from "react";
import { Memo, TransactionBuilder, Operation } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { getHorizonServer } from "../utils/memoizedServers";
import { useFreighter } from "./useFreighter";
import { useTransactionCore } from "./useTransactionCore";
import type { TransactionStatus, StellarTransactionError } from "../types";
import { unsafeAsXdrString } from "../types";

export interface BuildOptions {
  memo?: string;
  source?: string;
}

export interface UseMultiSigOptions {
  fee?: number;
  timeoutSeconds?: number;
  onSuccess?: (hash: string) => void;
  onError?: (error: StellarTransactionError) => void;
}

export interface UseMultiSigReturn {
  build: (operations: Operation[], options?: BuildOptions) => Promise<string>;
  sign: (xdr?: string) => Promise<string>;
  submit: (signedXdr: string) => Promise<void>;
  reset: () => void;
  status: TransactionStatus;
  unsignedXdr: string | null;
  hash: string | null;
  signatureCount: number;
  error: StellarTransactionError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

function countSignatures(xdr: string, networkPassphrase: string): number {
  try {
    return TransactionBuilder.fromXDR(xdr, networkPassphrase).signatures.length;
  } catch {
    return 0;
  }
}

/**
 * Build a multi-signature Stellar transaction, collect signatures from multiple
 * Freighter-connected signers, and submit when the threshold is met.
 *
 * @example
 * ```tsx
 * const { build, sign, submit, unsignedXdr, signatureCount, status } = useMultiSig();
 *
 * // Step 1 — signer A builds the tx
 * const xdr = await build([Operation.payment({ ... })]);
 *
 * // Step 2 — signer A signs
 * const signedXdr = await sign(xdr);
 *
 * // Share signedXdr with signer B out-of-band, then:
 * const doublySignedXdr = await sign(signedXdr);
 *
 * // Step 3 — submit when threshold is met
 * await submit(doublySignedXdr);
 * ```
 */
export function useMultiSig(options: UseMultiSigOptions = {}): UseMultiSigReturn {
  const { fee = 100, timeoutSeconds = 60, onSuccess, onError } = options;
  const { config } = useStellarContext();
  const { signTransaction, publicKey } = useFreighter();
  const { submit: submitXdr, reset: txReset, ...txState } = useTransactionCore({
    mode: "classic",
    timeoutSeconds,
    ...(onSuccess && { onSuccess }),
    ...(onError && { onError }),
  });

  const [unsignedXdr, setUnsignedXdr] = useState<string | null>(null);
  const [signatureCount, setSignatureCount] = useState(0);

  const build = useCallback(
    async (operations: Operation[], buildOpts?: BuildOptions): Promise<string> => {
      const sourceAddress = buildOpts?.source ?? publicKey;
      if (!sourceAddress) {
        throw new Error("Freighter is not connected. Call connect() first or provide a source address.");
      }

      const server = getHorizonServer(config.horizonUrl);
      const sourceAccount = await server.loadAccount(sourceAddress);

      const builder = new TransactionBuilder(sourceAccount, {
        fee: String(fee),
        networkPassphrase: config.networkPassphrase,
      });

      operations.forEach(op => builder.addOperation(op as unknown as Parameters<typeof builder.addOperation>[0]));
      builder.setTimeout(timeoutSeconds);

      if (buildOpts?.memo) {
        builder.addMemo(Memo.text(buildOpts.memo));
      }

      const builtTx = builder.build();
      const xdr = builtTx.toXDR();

      setUnsignedXdr(xdr);
      setSignatureCount(countSignatures(xdr, config.networkPassphrase));
      return xdr;
    },
    [publicKey, config, fee, timeoutSeconds]
  );

  const sign = useCallback(
    async (xdr?: string): Promise<string> => {
      const xdrToSign = xdr ?? unsignedXdr;
      if (!xdrToSign) {
        throw new Error("No transaction XDR provided. Call build() first or pass an XDR.");
      }
      if (!publicKey) {
        throw new Error("Freighter is not connected. Call connect() first.");
      }

      const signedXdr = await signTransaction(unsafeAsXdrString(xdrToSign), {
        networkPassphrase: config.networkPassphrase,
      });

      setSignatureCount(countSignatures(signedXdr, config.networkPassphrase));
      return signedXdr;
    },
    [publicKey, config, signTransaction, unsignedXdr]
  );

  const submit = useCallback(
    async (signedXdr: string): Promise<void> => {
      await submitXdr(unsafeAsXdrString(signedXdr));
    },
    [submitXdr]
  );

  const reset = useCallback(() => {
    setUnsignedXdr(null);
    setSignatureCount(0);
    txReset();
  }, [txReset]);

  return {
    build,
    sign,
    submit,
    reset,
    status: txState.status,
    unsignedXdr,
    hash: txState.hash,
    signatureCount,
    error: txState.error,
    isLoading: txState.isLoading,
    isSuccess: txState.isSuccess,
    isError: txState.isError,
  };
}
