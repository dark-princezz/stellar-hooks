/**
 * @file useContractStorageEntry.ts
 * @description Read a single ledger-entry key from a Soroban contract's storage
 *   with optional polling, for building live-updating contract state views.
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
 * Durability bucket a storage entry is read from.
 *
 * - `"persistent"` — survives ledger upgrades; needs fees to restore when expired.
 * - `"temporary"` — only valid for the current ledger; cheapest to read/write.
 *
 * Mirrors {@link xdr.ContractDataDurability}.
 */
export type ContractStorageDurability = "persistent" | "temporary";

/**
 * Options for {@link useContractStorageEntry}.
 *
 * Extends {@link UseLedgerEntryOptions} so callers still get `enabled`,
 * `refetchInterval`, and `cacheTTL` knobs from the underlying ledger query.
 */
export interface UseContractStorageEntryOptions extends UseLedgerEntryOptions {
  /** Storage durability bucket to read from. Defaults to `"persistent"`. */
  durability?: ContractStorageDurability;
  /**
   * Optional parser applied to the raw value `ScVal`. Useful if you want the
   * hook to return a native JS value (e.g. via `scvalToNative`) instead of the
   * raw binary XDR type.
   */
  parseResult?: (val: xdr.ScVal) => unknown;
}

/** A single contract-data storage entry, structured for state views. */
export interface ContractStorageEntry {
  /** The ledger-key `ScVal` used to look up the entry. */
  key: xdr.ScVal;
  /** The value `ScVal` stored at the key, or `null` when the entry is absent. */
  val: xdr.ScVal | null;
  /** The contract the entry belongs to. */
  contract: StellarContractId;
  /** Durability bucket the entry is read from. */
  durability: ContractStorageDurability;
}

/**
 * Return shape of {@link useContractStorageEntry}.
 *
 * @typeParam T - The shape returned by `options.parseResult`, or `xdr.ScVal`
 *                (the default) when no `parseResult` is supplied.
 */
export interface UseContractStorageEntryReturn<T = xdr.ScVal> {
  /** Structured entry, or `null` while loading or on a suspended fetch. */
  entry: ContractStorageEntry | null;
  /** Parsed value (`T`) when `parseResult` is supplied; otherwise the raw `xdr.ScVal`. */
  data: T | null;
  /** Raw value `ScVal` regardless of whether a parser is supplied. */
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
  const Ctor = xdr.LedgerKeyContractData as unknown as XdrConstructor<
    xdr.LedgerKeyContractData,
    LedgerKeyContractDataFields
  >;
  const inner = new Ctor({
    contract: address.toScAddress(),
    key: keyVal,
    durability:
      durability === "persistent"
        ? xdr.ContractDataDurability.persistent()
        : xdr.ContractDataDurability.temporary(),
  });
  return xdr.LedgerKey.contractData(inner);
}

function readContractDataVal(
  entry: { val?: { contractData?: () => { val: () => xdr.ScVal } } } | null | undefined,
): xdr.ScVal | null {
  return entry?.val?.contractData?.()?.val() ?? null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

// Overload 1: no parser supplied → `data` is the raw `xdr.ScVal`.
export function useContractStorageEntry(
  contractId: StellarContractId | null | undefined,
  key: string | xdr.ScVal | null | undefined,
  options?: Omit<UseContractStorageEntryOptions, "parseResult">,
): UseContractStorageEntryReturn<xdr.ScVal>;

// Overload 2: parser supplied → `data` is whatever the parser returns.
export function useContractStorageEntry<T>(
  contractId: StellarContractId | null | undefined,
  key: string | xdr.ScVal | null | undefined,
  options: UseContractStorageEntryOptions & { parseResult: (val: xdr.ScVal) => T },
): UseContractStorageEntryReturn<T>;

// Implementation signature — `T` defaults to `xdr.ScVal`.
export function useContractStorageEntry<T = xdr.ScVal>(
  contractId: StellarContractId | null | undefined,
  key: string | xdr.ScVal | null | undefined,
  options: UseContractStorageEntryOptions = {},
): UseContractStorageEntryReturn<T> {
  const { durability = "persistent", parseResult, ...ledgerOptions } = options;

  const keyPair = useMemo(() => {
    if (!contractId || key === null || key === undefined) return null;
    try {
      const scKey = typeof key === "string" ? xdr.ScVal.scvSymbol(key) : key;
      return {
        scKey,
        ledgerKey: buildContractDataLedgerKey(contractId, scKey, durability),
      };
    } catch {
      // Invalid contractId / key — treat as a suspended fetch rather than throwing.
      return null;
    }
  }, [contractId, key, durability]);

  const ledger = useLedgerEntry(keyPair?.ledgerKey ?? null, ledgerOptions);

  return useMemo(() => {
    const raw = readContractDataVal(ledger.data);
    const parsed: T | null =
      raw === null
        ? null
        : parseResult
          ? (parseResult(raw) as T)
          : (raw as unknown as T);

    const entry: ContractStorageEntry | null =
      contractId && keyPair && raw !== null
        ? {
            key: keyPair.scKey,
            val: raw,
            contract: contractId,
            durability,
          }
        : null;

    return {
      entry,
      data: parsed,
      raw,
      isLoading: ledger.isLoading,
      isRefetching: ledger.isRefetching,
      isError: ledger.error !== null,
      error: ledger.error,
      refetch: ledger.refetch,
      lastFetchedAt: ledger.lastFetchedAt,
    };
  }, [
    contractId,
    keyPair,
    ledger.data,
    ledger.isLoading,
    ledger.isRefetching,
    ledger.error,
    ledger.refetch,
    ledger.lastFetchedAt,
    durability,
    parseResult,
  ]);
}