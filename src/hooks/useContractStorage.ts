/**
 * @file useContractStorage.ts
 * @description Convenience hook for reading named Soroban contract storage entries.
 *              Thin wrapper over {@link useLedgerEntry} that constructs the
 *              contract-data ledger key from contractId + key + durability.
 * @package stellar-hooks
 * @license MIT
 */

import { useMemo } from "react";
import { Address, xdr } from "@stellar/stellar-sdk";
import { useLedgerEntry } from "./useLedgerEntry";
import type { UseLedgerEntryOptions } from "./useLedgerEntry";
import type { StellarContractId } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Durability of the storage entry being read.
 *
 * - `"persistent"` — survives ledger upgrades; needs fees to restore when expired.
 * - `"temporary"` — only valid for the current ledger; cheapest to read/write.
 *
 * Mirrors {@link xdr.ContractDataDurability}.
 */
export type ContractStorageDurability = "persistent" | "temporary";

/**
 * Options for {@link useContractStorage}.
 *
 * Extends {@link UseLedgerEntryOptions} so callers still get `enabled`,
 * `refetchInterval`, and `cacheTTL` knobs from the underlying ledger query.
 */
export interface UseContractStorageOptions extends UseLedgerEntryOptions {
  /**
   * Storage durability bucket to read from. Defaults to `"persistent"`,
   * which matches the common case of storing token balances, counters,
   * admin configs, and identifiers.
   */
  durability?: ContractStorageDurability;
  /**
   * Optional parser applied to the raw `ScVal`. Useful if you want the
   * hook to return a native JS value (e.g. via `scvalToNative`)
   * instead of the raw binary XDR type.
   *
   * @example
   * ```ts
   * { parseResult: (v) => scvalToNative(v) as bigint }
   * ```
   */
  parseResult?: (val: xdr.ScVal) => unknown;
}

/**
 * Return shape of {@link useContractStorage}.
 *
 * @typeParam T - The shape returned by `options.parseResult`, or `xdr.ScVal`
 *                (the default) when no `parseResult` is supplied.
 */
export interface UseContractStorageReturn<T = xdr.ScVal> {
  /**
   * Parsed value (`T`) when `parseResult` is supplied; otherwise the raw
   * `xdr.ScVal`. `null` while loading or when the entry is missing.
   */
  data: T | null;
  /** Raw `ScVal` regardless of whether a parser is supplied. `null` on miss/error. */
  raw: xdr.ScVal | null;
  /** `true` while the initial fetch is in flight. */
  isLoading: boolean;
  /** `true` while a refetch is in flight. */
  isRefetching: boolean;
  /** `true` when `error` is non-null. */
  isError: boolean;
  /** Most recent fetch error, or `null`. */
  error: Error | null;
  /** Manually trigger a re-fetch of the storage entry. */
  refetch: () => Promise<void>;
  /** Timestamp of the most recent successful fetch, or `null`. */
  lastFetchedAt: Date | null;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Constructable shape for XDR-generated types whose constructor signature
 * is not formally exposed by the SDK's published `.d.ts` but exists at
 * runtime.
 */
type XdrConstructor<TInstance, TFields> = new (fields: TFields) => TInstance;

interface LedgerKeyContractDataFields {
  contract: xdr.ScAddress;
  key: xdr.ScVal;
  durability: xdr.ContractDataDurability;
}

function buildContractDataLedgerKey(
  contractId: StellarContractId,
  keyVal: xdr.ScVal,
  durability: ContractStorageDurability,
): xdr.LedgerKey {
  const address = new Address(contractId);
  const LedgerKeyContractDataCtor = xdr.LedgerKeyContractData as unknown as XdrConstructor<
    xdr.LedgerKeyContractData,
    LedgerKeyContractDataFields
  >;
  const inner = new LedgerKeyContractDataCtor({
    contract: address.toScAddress(),
    key: keyVal,
    durability:
      durability === "persistent"
        ? xdr.ContractDataDurability.persistent()
        : xdr.ContractDataDurability.temporary(),
  });
  return xdr.LedgerKey.contractData(inner);
}

/**
 * Pull the inner `ScVal` out of a Soroban RPC ledger entry, or `null` if
 * the entry isn't a contract-data entry. Pure runtime shape-check.
 */
function readContractDataVal(
  entry: { val?: { contractData?: () => { val: () => xdr.ScVal } } } | null | undefined,
): xdr.ScVal | null {
  return entry?.val?.contractData?.()?.val() ?? null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

// Overload 1: no parser supplied → `data` is the raw `xdr.ScVal`.
export function useContractStorage(
  contractId: StellarContractId | null | undefined,
  key: string | xdr.ScVal | null | undefined,
  options?: Omit<UseContractStorageOptions, "parseResult">,
): UseContractStorageReturn<xdr.ScVal>;

// Overload 2: parser supplied → `data` is whatever the parser returns.
export function useContractStorage<T>(
  contractId: StellarContractId | null | undefined,
  key: string | xdr.ScVal | null | undefined,
  options: UseContractStorageOptions & { parseResult: (val: xdr.ScVal) => T },
): UseContractStorageReturn<T>;

// Implementation signature — `T` defaults to `xdr.ScVal`.
export function useContractStorage<T = xdr.ScVal>(
  contractId: StellarContractId | null | undefined,
  key: string | xdr.ScVal | null | undefined,
  options: UseContractStorageOptions = {},
): UseContractStorageReturn<T> {
  const { durability = "persistent", parseResult, ...ledgerOptions } = options;

  const ledgerKey = useMemo(() => {
    if (!contractId || key === null || key === undefined) return null;
    try {
      const scKey = typeof key === "string" ? xdr.ScVal.scvSymbol(key) : key;
      return buildContractDataLedgerKey(contractId, scKey, durability);
    } catch {
      // Invalid contractId / key — treat as a suspended fetch rather than throwing.
      return null;
    }
  }, [contractId, key, durability]);

  const ledger = useLedgerEntry(ledgerKey, ledgerOptions);

  return useMemo(() => {
    // `parseResult` is user-supplied, so we cannot trust it to be total on
    // arbitrary retval shapes. We catch any throw and surface it as a
    // hook-level error rather than crashing the render. Callers can choose
    // to make their parsers total to avoid this branch.
    const raw = readContractDataVal(ledger.data);
    let parsed: T | null = null;
    let parseError: Error | null = null;
    if (raw !== null) {
      if (parseResult) {
        try {
          parsed = parseResult(raw) as T;
        } catch (e) {
          parseError = e instanceof Error ? e : new Error(String(e));
          parsed = null;
        }
      } else {
        parsed = raw as unknown as T;
      }
    }

    const combinedError = ledger.error ?? parseError;

    return {
      data: parsed,
      raw,
      isLoading: ledger.isLoading,
      isRefetching: ledger.isRefetching,
      isError: combinedError !== null,
      error: combinedError,
      refetch: ledger.refetch,
      lastFetchedAt: ledger.lastFetchedAt,
    };
  }, [
    ledger.data,
    ledger.isLoading,
    ledger.isRefetching,
    ledger.error,
    ledger.refetch,
    ledger.lastFetchedAt,
    parseResult,
  ]);
}
