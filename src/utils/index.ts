/**
 * @file index.ts
 * @description Utility functions for the stellar-hooks library.
 * @package stellar-hooks
 */

import type { Horizon } from "@stellar/stellar-sdk";
import type { StellarAccountData } from "../types";
import { unsafeAsPublicKey, unsafeAsAssetIssuer } from "../types";

export {
  validatePublicKey,
  validateContractId,
  validateOptionalPublicKey,
  validateOptionalContractId,
  ValidationError,
} from "./validation";

/**
 * Transforms a raw Horizon AccountResponse into the library's internal StellarAccountData format.
 */
export function parseAccountResponse(raw: Horizon.AccountResponse): StellarAccountData {
  return {
    accountId: unsafeAsPublicKey(raw.account_id),
    sequence: raw.sequence,
    subentryCount: raw.subentry_count,
    numSponsored: (raw as Horizon.AccountResponse & { num_sponsored?: number }).num_sponsored ?? 0,
    numSponsoring: (raw as Horizon.AccountResponse & { num_sponsoring?: number }).num_sponsoring ?? 0,
    thresholds: {
      lowThreshold: raw.thresholds.low_threshold,
      medThreshold: raw.thresholds.med_threshold,
      highThreshold: raw.thresholds.high_threshold,
    },
    flags: {
      authRequired: raw.flags.auth_required,
      authRevocable: raw.flags.auth_revocable,
      authImmutable: raw.flags.auth_immutable,
      authClawbackEnabled: raw.flags.auth_clawback_enabled,
    },
    balances: raw.balances
      .filter((b) => b.asset_type !== "liquidity_pool_shares")
      .map((b) => {
        const isAsset = b.asset_type === "credit_alphanum4" || b.asset_type === "credit_alphanum12";
        return {
          assetType: b.asset_type,
          ...(isAsset && { assetCode: (b as Horizon.HorizonApi.BalanceLineAsset).asset_code }),
          ...(isAsset && { assetIssuer: unsafeAsAssetIssuer((b as Horizon.HorizonApi.BalanceLineAsset).asset_issuer) }),
          balance: b.balance,
          balanceFloat: parseBalance(b.balance),
          buyingLiabilities: isAsset || b.asset_type === "native"
            ? (b as Horizon.HorizonApi.BalanceLineAsset | Horizon.HorizonApi.BalanceLineNative).buying_liabilities
            : "0",
          sellingLiabilities: isAsset || b.asset_type === "native"
            ? (b as Horizon.HorizonApi.BalanceLineAsset | Horizon.HorizonApi.BalanceLineNative).selling_liabilities
            : "0",
          ...(isAsset && { limit: (b as Horizon.HorizonApi.BalanceLineAsset).limit }),
          isNative: b.asset_type === "native",
        };
      }),
    raw,
  };
}

/**
 * Converts a Stellar balance string (7 decimal places) to a number without floating point precision errors.
 * Uses fixed-point arithmetic to avoid rounding issues with 7 decimal place values.
 * 
 * @param balanceStr - Balance string with 7 decimal places (e.g., "100.1234567")
 * @returns Number representation of the balance
 */
export function parseBalance(balanceStr: string): number {
  // Remove any whitespace
  const trimmed = balanceStr.trim();
  
  // Split into whole and fractional parts
  const parts = trimmed.split('.');
  if (parts.length === 1) {
    // No decimal point, treat as integer
    return parseInt(parts[0] || '0', 10);
  }
  
  const [wholeStr, fractionStr] = parts;
  
  // Pad or truncate fractional part to exactly 7 digits (Stellar standard)
  const paddedFraction = (fractionStr || '').padEnd(7, '0').slice(0, 7);
  
  // Combine into a single integer representing the value in stroops
  const wholeValue = BigInt(wholeStr || '0');
  const fractionValue = BigInt(paddedFraction);
  const stroops = wholeValue * BigInt(10_000_000) + fractionValue;
  
  // Convert to number by dividing by 10^7
  // Use Number() for the final conversion since we need a number type
  return Number(stroops) / 10_000_000;
}

/**
 * Simple delay function for polling.
 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential backoff calculation for RPC polling.
 */
export function backoff(attempt: number, base = 1000) {
  return Math.min(base * Math.pow(2, attempt), 10000);
}

// ─── Simple In-Memory Cache ───────────────────────────────────────────────────

const cache = new Map<string, { data: unknown; expires: number }>();

export function getCache<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;
  
  if (Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }
  
  return item.data as T;
}

export function setCache<T>(key: string, data: T, ttl: number): void {
  cache.set(key, { data, expires: Date.now() + ttl });
}

export * from './xdr';
export * from './errors';
