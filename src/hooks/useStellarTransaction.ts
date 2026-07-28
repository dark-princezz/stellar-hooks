import { useCallback } from "react";
import { Transaction, TransactionBuilder, Operation, Memo, xdr } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { getHorizonServer } from "../utils/memoizedServers";
import { useFreighter } from "./useFreighter";
import { useTransactionCore } from "./useTransactionCore";
import { unsafeAsXdrString, type TransactionStatus, type StellarTransactionError } from "../types";
import { validatePublicKey } from "../utils";

export interface UseStellarTransactionOptions {
  /** Target base fee in stroops. Default: 100 */
  fee?: number;
  /** Polling and build timeout in seconds. Default: 60 */
  timeoutSeconds?: number;
  /** Optional configuration to sponsor the transaction via fee bumping */
  feeBump?: {
    fee: string;
    sponsor?: string;
  };
  /** Optional memo text (max 28 bytes) */
  memo?: string;
  onSuccess?: (hash: string) => void;
  onError?: (error: StellarTransactionError) => void;
}

export interface UseStellarTransactionReturn {
  submit: (operations: xdr.Operation[]) => Promise<void>;
  status: TransactionStatus;
  txHash: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: StellarTransactionError | null;
  reset: () => void;
}

/**
 * Build a classic Stellar transaction from raw XDR operations, optionally wrap
 * it in a fee-bump transaction, sign via Freighter, and submit through Horizon.
 *
 * @example
 * ```tsx
 * const { submit, status, txHash, isLoading } = useStellarTransaction({
 *   fee: 100,
 *   onSuccess: (hash) => console.log("Confirmed:", hash),
 * });
 *
 * await submit([Operation.payment({ destination, asset, amount })]);
 * ```
 *
 * @example
 * ```tsx
 * // With fee-bump sponsorship
 * const { submit, status } = useStellarTransaction({
 *   feeBump: { fee: "500", sponsor: sponsorPublicKey },
 * });
 * ```
 */
export function useStellarTransaction(options: UseStellarTransactionOptions = {}): UseStellarTransactionReturn {
  const { fee = 100, timeoutSeconds = 60, feeBump, memo, onSuccess, onError } = options;
  const { config } = useStellarContext();
  const { signTransaction, publicKey } = useFreighter();
  const { submit: submitXdr, reset, status, hash, error, isLoading, isSuccess, isError } = useTransactionCore({
    mode: "classic",
    timeoutSeconds,
    ...(onSuccess && { onSuccess }),
    ...(onError && { onError }),
  });

  const submit = useCallback(async (operations: xdr.Operation[]) => {
    if (!publicKey) throw new Error("Freighter is not connected. Call connect() first.");

    const server = getHorizonServer(config.horizonUrl);
    const sourceAccount = await server.loadAccount(publicKey);

    const builder = new TransactionBuilder(sourceAccount, {
      fee: String(fee),
      networkPassphrase: config.networkPassphrase,
    }).setTimeout(timeoutSeconds);

    operations.forEach(op => builder.addOperation(op));

    if (memo) {
      builder.addMemo(Memo.text(memo));
    }

    const builtTx = builder.build();
    const signedInnerXdr = await signTransaction(unsafeAsXdrString(builtTx.toXDR()), { networkPassphrase: config.networkPassphrase });

    // If fee bump is configured, construct and sign the FeeBump transaction wrapping the inner tx
    if (feeBump) {
      const sponsorAddress = feeBump.sponsor || publicKey;
      validatePublicKey(sponsorAddress, "feeBump.sponsor");
      const innerTxSigned = TransactionBuilder.fromXDR(signedInnerXdr, config.networkPassphrase);
      const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
        sponsorAddress,
        feeBump.fee,
        innerTxSigned as Transaction,
        config.networkPassphrase
      );
      
      const signedFeeBumpXdr = await signTransaction(unsafeAsXdrString(feeBumpTx.toXDR()), { 
        networkPassphrase: config.networkPassphrase,
        address: sponsorAddress
      });
      await submitXdr(signedFeeBumpXdr);
    } else {
      await submitXdr(signedInnerXdr);
    }
  }, [publicKey, config, signTransaction, submitXdr, fee, timeoutSeconds, feeBump, memo]);

  return { submit, status, txHash: hash, isLoading, isSuccess, isError, error, reset };
}
