/**
 * @file muxedAccount.ts
 * @description Create and parse muxed (M...) addresses.
 * @package stellar-hooks
 */

import { Account, MuxedAccount, StrKey } from "@stellar/stellar-sdk";

const MAX_MUXED_ID = (1n << 64n) - 1n;

export interface ParsedMuxedAddress {
  /** The underlying G... account. */
  baseAccount: string;
  /** The 64-bit muxed ID as a decimal string. */
  id: string;
}

export const isMuxedAddress = (value: string): boolean => StrKey.isValidMed25519PublicKey(value);

/** Combines a base G... account and an unsigned 64-bit ID into an M... address. */
export function createMuxedAddress(baseAccount: string, id: string | number | bigint): string {
  if (!StrKey.isValidEd25519PublicKey(baseAccount)) throw new Error("Base account must be a valid G... address");
  let numeric: bigint;
  try {
    numeric = BigInt(id);
  } catch {
    throw new Error("Muxed ID must be an integer");
  }
  if (numeric < 0n || numeric > MAX_MUXED_ID) throw new Error("Muxed ID must fit in an unsigned 64-bit integer");
  return new MuxedAccount(new Account(baseAccount, "0"), numeric.toString()).accountId();
}

/** Splits an M... address into its base account and ID. */
export function parseMuxedAddress(address: string): ParsedMuxedAddress {
  if (!isMuxedAddress(address)) throw new Error("Not a valid muxed (M...) address");
  const muxed = MuxedAccount.fromAddress(address, "0");
  return { baseAccount: muxed.baseAccount().accountId(), id: muxed.id() };
}
