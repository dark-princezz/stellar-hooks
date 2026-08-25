import { useCallback, useState } from "react";
import { Horizon, Memo, TransactionBuilder, Operation } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { useFreighter } from "./useFreighter";
import { useTransactionCore } from "./useTransactionCore";
import type { TransactionStatus, StellarTransactionError } from "../types";
import { unsafeAsXdrString } from "../types";
import type { RetryStrategy } from "./useTransactionCore";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BuildOptions {
  memo?: string;
  source?: string;
}

export interface SignerEntry {
  key: string;
  type: "ed25519_public_key" | "preauth_tx" | "hash_x" | "signed_payload_ed25519";
  weight: number;
}

export interface Thresholds {
  low: number;
  medium: number;
  high: number;
}

export interface UseMultiSigOptions {
  fee?: number;
  timeoutSeconds?: number;
  retryStrategy?: RetryStrategy;
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
  /** Signer entries on the source account, populated after build(). */
  signers: SignerEntry[];
  /** Thresholds (low, medium, high) on the source account, populated after build(). */
  thresholds: Thresholds | null;
  /** Whether the collected signatures meet the medium (payment) threshold. */
  meetsThreshold: boolean;
  /** Total weight of all current signatures against the signer entries. */
  signatureWeight: number;
  /** List of signer public keys that have signed the current transaction. */
  signedBy: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface AccountSignerRecord {
  key: string;
  public_key?: string;
  type: string;
  weight: number;
}

interface AccountThresholdRecord {
  low_threshold: number;
  med_threshold: number;
  high_threshold: number;
}

interface HorizonAccountData {
  signers?: AccountSignerRecord[];
  thresholds?: AccountThresholdRecord;
}

function countSignatures(xdr: string, networkPassphrase: string): number {
  try {
    return TransactionBuilder.fromXDR(xdr, networkPassphrase).signatures.length;
  } catch {
    return 0;
  }
}

function computeSignatureWeight(
  xdr: string,
  signers: SignerEntry[],
  networkPassphrase: string,
): number {
  try {
    const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase);
    const signerMap = new Map<string, number>();
    for (const s of signers) {
      signerMap.set(s.key, s.weight);
    }

    let totalWeight = 0;
    for (const sig of tx.signatures) {
      const hint = sig.hint().toString("hex");
      for (const [key, weight] of signerMap) {
        const keyHint = key.slice(-8).toLowerCase();
        if (hint === keyHint) {
          totalWeight += weight;
          break;
        }
      }
    }
    return totalWeight;
  } catch {
    return 0;
  }
}

function getSignedBy(
  xdr: string,
  signers: SignerEntry[],
  networkPassphrase: string
): string[] {
  try {
    const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase);
    const signedKeys: string[] = [];
    for (const sig of tx.signatures) {
      const hint = sig.hint().toString("hex");
      for (const s of signers) {
        const keyHint = s.key.slice(-8).toLowerCase();
        if (hint === keyHint && !signedKeys.includes(s.key)) {
          signedKeys.push(s.key);
        }
      }
    }
    return signedKeys;
  } catch {
    return [];
  }
}

function parseSigners(account: HorizonAccountData): SignerEntry[] {
  if (!account.signers || !Array.isArray(account.signers)) return [];

  return account.signers.map((s) => ({
    key: s.key ?? s.public_key ?? "",
    type: (s.type ?? "ed25519_public_key") as SignerEntry["type"],
    weight: s.weight ?? 0,
  }));
}

function parseThresholds(account: HorizonAccountData): Thresholds | null {
  if (account.thresholds) {
    return {
      low: account.thresholds.low_threshold ?? 0,
      medium: account.thresholds.med_threshold ?? 0,
      high: account.thresholds.high_threshold ?? 0,
    };
  }
  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Build a multi-signature Stellar transaction, collect signatures from multiple
 * Freighter-connected signers, and submit when the threshold is met.
 *
 * Tracks the source account's signer entries and thresholds so you can
 * determine whether enough signatures have been collected.
 *
 * @example
 * ```tsx
 * const {
 *   build, sign, submit, unsignedXdr, signatureCount,
 *   signers, thresholds, meetsThreshold, signatureWeight,
 * } = useMultiSig();
 *
 * // Step 1 — signer A builds the tx
 * const xdr = await build([Operation.payment({ ... })]);
 * console.log(signers); // [{ key: "G...", weight: 1 }, ...]
 * console.log(thresholds); // { low: 0, medium: 1, high: 1 }
 *
 * // Step 2 — signer A signs
 * const signedXdr = await sign(xdr);
 * console.log(signatureWeight); // 1
 * console.log(meetsThreshold); // true
 *
 * // Submit when threshold is met
 * await submit(signedXdr);
 * ```
 */
export function useMultiSig(options: UseMultiSigOptions = {}): UseMultiSigReturn {
  const { fee = 100, timeoutSeconds = 60, onSuccess, onError } = options;
  const { config } = useStellarContext();
  const { signTransaction, publicKey } = useFreighter();
  const { submit: submitXdr, reset: txReset, ...txState } = useTransactionCore({
    mode: "classic",
    timeoutSeconds,
    debugLabel: "useMultiSig",
    ...(onSuccess && { onSuccess }),
    ...(onError && { onError }),
  });

  const [unsignedXdr, setUnsignedXdr] = useState<string | null>(null);
  const [signatureCount, setSignatureCount] = useState(0);
  const [signers, setSigners] = useState<SignerEntry[]>([]);
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);

  const build = useCallback(
    async (operations: Operation[], buildOpts?: BuildOptions): Promise<string> => {
      const sourceAddress = buildOpts?.source ?? publicKey;
      if (!sourceAddress) {
        throw new Error("Freighter is not connected. Call connect() first or provide a source address.");
      }

      const server = new Horizon.Server(config.horizonUrl);
      const sourceAccount = await server.loadAccount(sourceAddress);

      // Parse signers and thresholds from the loaded account data.
      const accountData = sourceAccount as unknown as HorizonAccountData;
      const parsedSigners = parseSigners(accountData);
      const parsedThresholds = parseThresholds(accountData);
      setSigners(parsedSigners);
      setThresholds(parsedThresholds);

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
    setSigners([]);
    setThresholds(null);
    txReset();
  }, [txReset]);


  const currentXdr = unsignedXdr ?? "";
  const signatureWeight = computeSignatureWeight(currentXdr, signers, config.networkPassphrase);
  const meetsThreshold = thresholds !== null && signatureWeight >= thresholds.medium;
  const signedBy = getSignedBy(currentXdr, signers, config.networkPassphrase);

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
    signers,
    thresholds,
    meetsThreshold,
    signatureWeight,
    signedBy,
  };
}
