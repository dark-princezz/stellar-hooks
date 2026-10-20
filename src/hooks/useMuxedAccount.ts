/**
 * @file useMuxedAccount.ts
 * @description Helpers for creating and parsing muxed (M...) addresses.
 * @package stellar-hooks
 * @license MIT
 */

import { useMemo } from "react";
import { createMuxedAddress, isMuxedAddress, parseMuxedAddress } from "../utils/muxedAccount";
import type { ParsedMuxedAddress } from "../utils/muxedAccount";

export interface UseMuxedAccountReturn {
  /** Combine a base G... account and a 64-bit ID into an M... address. */
  create: (baseAccount: string, id: string | number | bigint) => string;
  /** Split an M... address into `{ baseAccount, id }`. */
  parse: (address: string) => ParsedMuxedAddress;
  isMuxed: (address: string) => boolean;
}

/** Stable helpers (no network access) for working with muxed accounts. */
export function useMuxedAccount(): UseMuxedAccountReturn {
  return useMemo(() => ({ create: createMuxedAddress, parse: parseMuxedAddress, isMuxed: isMuxedAddress }), []);
}
