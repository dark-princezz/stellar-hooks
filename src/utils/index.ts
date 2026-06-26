import { Horizon } from "@stellar/stellar-sdk";
import type { StellarBalance, StellarAccountData } from "../types";

export function parseAccountResponse(
  raw: Horizon.AccountResponse
): StellarAccountData {
  const balances: StellarBalance[] = raw.balances.map((b) => {
    const isNative = b.asset_type === "native";
    const balance: StellarBalance = {
      assetType: b.asset_type,
      balance: b.balance,
      balanceFloat: parseFloat(b.balance),
      buyingLiabilities: "buying_liabilities" in b ? b.buying_liabilities : "0.0000000",
      sellingLiabilities: "selling_liabilities" in b ? b.selling_liabilities : "0.0000000",
      isNative,
    };
    if ("asset_code" in b) {
      balance.assetCode = b.asset_code;
    }
    if ("asset_issuer" in b) {
      balance.assetIssuer = b.asset_issuer;
    }
    if ("limit" in b) {
      balance.limit = b.limit;
    }
    return balance;
  });

  return {
    accountId: raw.account_id,
    balances,
    sequence: raw.sequence,
    subentryCount: raw.subentry_count,
    thresholds: {
      lowThreshold: raw.thresholds.low_threshold,
      medThreshold: raw.thresholds.med_threshold,
      highThreshold: raw.thresholds.high_threshold,
    },
    flags: {
      authRequired: raw.flags.auth_required,
      authRevocable: raw.flags.auth_revocable,
      authImmutable: raw.flags.auth_immutable,
      authClawbackEnabled: raw.flags.auth_clawback_enabled ?? false,
    },
    raw,
  };
}

export function backoff(attempt: number, baseMs = 1000, maxMs = 10000): number {
  return Math.min(baseMs * 2 ** attempt, maxMs);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function assertDefined<T>(
  value: T | null | undefined,
  message: string
): asserts value is T {
  if (value == null) throw new Error(`[stellar-hooks] ${message}`);
}
