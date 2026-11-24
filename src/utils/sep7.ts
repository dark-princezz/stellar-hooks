/**
 * @file sep7.ts
 * @description Pure SEP-7 `web+stellar:pay` URI builder and parser.
 * @package stellar-hooks
 * @license MIT
 */

import { StrKey } from "@stellar/stellar-sdk/minimal";

export interface Sep7PayParams {
  destination: string;
  amount?: string;
  assetCode?: string;
  assetIssuer?: string;
  memo?: string;
  memoType?: "MEMO_TEXT" | "MEMO_ID" | "MEMO_HASH" | "MEMO_RETURN";
  message?: string;
  networkPassphrase?: string;
  callback?: string;
}

const isDestination = (d: string) =>
  StrKey.isValidEd25519PublicKey(d) || StrKey.isValidMed25519PublicKey(d);

/** Returns a list of problems with `params` (empty when valid). */
export function validateSep7Pay(params: Sep7PayParams): string[] {
  const errors: string[] = [];
  if (!params.destination || !isDestination(params.destination)) {
    errors.push("destination must be a valid G... or M... address.");
  }
  if (params.amount !== undefined && !(Number(params.amount) > 0)) {
    errors.push("amount must be a positive number.");
  }
  if (params.assetCode !== undefined && !/^[A-Za-z0-9]{1,12}$/.test(params.assetCode)) {
    errors.push("assetCode must be 1-12 alphanumeric characters.");
  }
  if (params.assetIssuer !== undefined && !StrKey.isValidEd25519PublicKey(params.assetIssuer)) {
    errors.push("assetIssuer must be a valid G... address.");
  }
  if (params.assetCode && !params.assetIssuer) {
    errors.push("assetIssuer is required with assetCode.");
  }
  if (params.memo !== undefined && (params.memoType ?? "MEMO_TEXT") === "MEMO_TEXT") {
    if (new TextEncoder().encode(params.memo).length > 28) errors.push("text memo exceeds 28 bytes.");
  }
  return errors;
}

/** Build a `web+stellar:pay?...` URI. Throws if the params are invalid. */
export function buildSep7PayUri(params: Sep7PayParams): string {
  const errors = validateSep7Pay(params);
  if (errors.length) throw new Error(errors.join(" "));
  const q = new URLSearchParams();
  q.set("destination", params.destination);
  if (params.amount) q.set("amount", params.amount);
  if (params.assetCode) q.set("asset_code", params.assetCode);
  if (params.assetIssuer) q.set("asset_issuer", params.assetIssuer);
  if (params.memo) {
    q.set("memo", params.memo);
    q.set("memo_type", params.memoType ?? "MEMO_TEXT");
  }
  if (params.message) q.set("msg", params.message);
  if (params.networkPassphrase) q.set("network_passphrase", params.networkPassphrase);
  if (params.callback) q.set("callback", params.callback.startsWith("url:") ? params.callback : `url:${params.callback}`);
  return `web+stellar:pay?${q.toString()}`;
}

/** Parse a SEP-7 `pay` URI (e.g. scanned from a QR code). Returns null if it isn't a valid one. */
export function parseSep7PayUri(uri: string): Sep7PayParams | null {
  const prefix = "web+stellar:pay?";
  if (typeof uri !== "string" || !uri.startsWith(prefix)) return null;
  const q = new URLSearchParams(uri.slice(prefix.length));
  const params: Sep7PayParams = {
    destination: q.get("destination") ?? "",
    amount: q.get("amount") ?? undefined,
    assetCode: q.get("asset_code") ?? undefined,
    assetIssuer: q.get("asset_issuer") ?? undefined,
    memo: q.get("memo") ?? undefined,
    memoType: (q.get("memo_type") as Sep7PayParams["memoType"]) ?? undefined,
    message: q.get("msg") ?? undefined,
    networkPassphrase: q.get("network_passphrase") ?? undefined,
    callback: q.get("callback") ?? undefined,
  };
  return validateSep7Pay(params).length === 0 ? params : null;
}
