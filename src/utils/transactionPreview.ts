/**
 * @file transactionPreview.ts
 * @description Decode a transaction envelope XDR into a readable summary with a fee breakdown and
 * per-operation risk levels.
 * @package stellar-hooks
 */

import { FeeBumpTransaction, TransactionBuilder } from "@stellar/stellar-sdk";
import type { Operation, Transaction } from "@stellar/stellar-sdk";

export type RiskLevel = "low" | "medium" | "high";

export interface OperationRisk {
  risk: RiskLevel;
  reasons: string[];
}

export interface PreviewOperation {
  index: number;
  type: string;
  source: string | null;
  /** Operation fields worth showing, stringified (amounts, assets, destinations...). */
  details: Record<string, string>;
  risk: RiskLevel;
  riskReasons: string[];
}

export interface FeeBreakdown {
  /** Everything the source account pays, in stroops. */
  total: string;
  /** Inclusion (base) fee in stroops: total minus the Soroban resource fee. */
  inclusion: string;
  /** Soroban resource fee in stroops, or `null` for classic transactions. */
  resource: string | null;
}

export interface TransactionPreview {
  source: string;
  memo: { type: string; value: string } | null;
  timeBounds: { minTime: string; maxTime: string } | null;
  fee: FeeBreakdown;
  operations: PreviewOperation[];
  highestRisk: RiskLevel;
  isFeeBump: boolean;
}

const RISK_ORDER: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };

const higher = (a: RiskLevel, b: RiskLevel): RiskLevel => (RISK_ORDER[a] >= RISK_ORDER[b] ? a : b);

type AnyOperation = Operation & Record<string, unknown>;

/**
 * Classifies one operation. High: changes who controls an account (signers, thresholds, master weight),
 * merges an account or claws funds back. Medium: changes trust or authorization flags.
 */
export function classifyOperationRisk(op: Operation): OperationRisk {
  const o = op as AnyOperation;
  const reasons: string[] = [];
  let risk: RiskLevel = "low";
  const raise = (level: RiskLevel, reason: string) => {
    risk = higher(risk, level);
    reasons.push(reason);
  };

  switch (op.type) {
    case "setOptions":
      if (o.signer) raise("high", "Adds, removes or reweights a signer");
      if (o.masterWeight !== undefined) raise("high", "Changes the master key weight");
      if (o.lowThreshold !== undefined || o.medThreshold !== undefined || o.highThreshold !== undefined) {
        raise("high", "Changes signing thresholds");
      }
      if (o.homeDomain !== undefined) raise("medium", "Changes the home domain");
      if (o.setFlags !== undefined || o.clearFlags !== undefined) raise("medium", "Changes account flags");
      if (o.inflationDest !== undefined) raise("medium", "Changes the inflation destination");
      break;
    case "accountMerge":
      raise("high", "Merges this account and moves all its XLM to the destination");
      break;
    case "clawback":
    case "clawbackClaimableBalance":
      raise("high", "Claws back an issued asset");
      break;
    case "changeTrust":
      if (o.limit === "0.0000000") raise("medium", "Removes a trustline");
      break;
    case "allowTrust":
    case "setTrustLineFlags":
      raise("medium", "Changes authorization of a trustline");
      break;
    default:
      break;
  }
  return { risk, reasons };
}

function assetLabel(asset: unknown): string {
  const a = asset as { code?: string; issuer?: string; isNative?: () => boolean } | undefined;
  if (!a) return "";
  if (a.isNative?.()) return "XLM";
  return a.issuer ? `${a.code}:${a.issuer}` : String(a.code ?? "");
}

const DETAIL_KEYS = [
  "destination",
  "amount",
  "sendAmount",
  "sendMax",
  "destAmount",
  "limit",
  "name",
  "from",
  "balanceId",
  "homeDomain",
  "masterWeight",
  "lowThreshold",
  "medThreshold",
  "highThreshold",
] as const;

function operationDetails(op: Operation): Record<string, string> {
  const o = op as AnyOperation;
  const details: Record<string, string> = {};
  for (const key of DETAIL_KEYS) {
    if (o[key] !== undefined && o[key] !== null) details[key] = String(o[key]);
  }
  for (const key of ["asset", "sendAsset", "destAsset", "buying", "selling"] as const) {
    if (o[key]) details[key] = assetLabel(o[key]);
  }
  const signer = o.signer as { ed25519PublicKey?: string; weight?: number } | undefined;
  if (signer) details.signer = `${signer.ed25519PublicKey ?? "signer"} (weight ${signer.weight ?? "?"})`;
  return details;
}

function resourceFeeOf(tx: Transaction): string | null {
  try {
    const ext = tx.toEnvelope().v1().tx().ext();
    return ext.switch() === 1 ? ext.sorobanData().resourceFee().toString() : null;
  } catch {
    return null;
  }
}

/**
 * Decodes a base64 transaction envelope (including fee-bump envelopes) into a preview.
 * Throws if the XDR is not a valid transaction envelope for the given network passphrase.
 */
export function previewTransaction(xdrBase64: string, networkPassphrase: string): TransactionPreview {
  const parsed = TransactionBuilder.fromXDR(xdrBase64, networkPassphrase);
  const isFeeBump = parsed instanceof FeeBumpTransaction;
  const tx = (isFeeBump ? parsed.innerTransaction : parsed) as Transaction;

  const resource = resourceFeeOf(tx);
  const total = BigInt(isFeeBump ? parsed.fee : tx.fee);
  const inclusion = resource === null ? total : total - BigInt(resource);

  const operations = tx.operations.map<PreviewOperation>((op, index) => {
    const { risk, reasons } = classifyOperationRisk(op);
    return {
      index,
      type: op.type,
      source: op.source ?? null,
      details: operationDetails(op),
      risk,
      riskReasons: reasons,
    };
  });

  const memo = tx.memo && tx.memo.type !== "none" ? { type: tx.memo.type, value: String(tx.memo.value) } : null;
  const tb = tx.timeBounds;

  return {
    source: tx.source,
    memo,
    timeBounds: tb ? { minTime: tb.minTime, maxTime: tb.maxTime } : null,
    fee: { total: total.toString(), inclusion: inclusion.toString(), resource },
    operations,
    highestRisk: operations.reduce<RiskLevel>((acc, op) => higher(acc, op.risk), "low"),
    isFeeBump,
  };
}
