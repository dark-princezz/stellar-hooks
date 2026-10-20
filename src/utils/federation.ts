/**
 * @file federation.ts
 * @description SEP-2 federation helpers: resolve `name*domain` to an account, and reverse an account ID.
 * @package stellar-hooks
 */

import { Federation, StrKey } from "@stellar/stellar-sdk";

export interface FederationRecord {
  accountId: string;
  memoType: string | null;
  memo: string | null;
  /** The federation address this record belongs to, when the server returned it. */
  address: string | null;
}

export interface FederationOptions {
  /** Allow plain-HTTP federation servers (testing only). */
  allowHttp?: boolean;
  /** Request timeout in milliseconds. */
  timeout?: number;
}

const FEDERATION_ADDRESS = /^[^*\s]+\*[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$/;
const DOMAIN = /^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$/;

export const isFederationAddress = (value: string): boolean => FEDERATION_ADDRESS.test(value);

interface RawFederationResponse {
  account_id: string;
  memo_type?: string;
  memo?: string;
  stellar_address?: string;
}

const toRecord = (raw: RawFederationResponse): FederationRecord => ({
  accountId: raw.account_id,
  memoType: raw.memo_type ?? null,
  memo: raw.memo ?? null,
  address: raw.stellar_address ?? null,
});

/** Resolves `name*domain` through the domain's federation server (found via its stellar.toml). */
export async function resolveFederationAddress(
  address: string,
  options: FederationOptions = {},
): Promise<FederationRecord> {
  if (!isFederationAddress(address)) {
    throw new Error(`Invalid federation address "${address}": expected name*domain`);
  }
  const raw = (await Federation.Server.resolve(address, options)) as RawFederationResponse;
  if (!StrKey.isValidEd25519PublicKey(raw.account_id)) {
    throw new Error("Federation server returned an invalid account ID");
  }
  return toRecord(raw);
}

/**
 * Looks up the federation address of an account on `domain`. Servers that do not support reverse
 * lookups reject the request; that surfaces as an error rather than a wrong answer.
 */
export async function reverseFederationLookup(
  accountId: string,
  domain: string,
  options: FederationOptions = {},
): Promise<FederationRecord> {
  if (!StrKey.isValidEd25519PublicKey(accountId)) throw new Error("Invalid account ID");
  if (!DOMAIN.test(domain)) throw new Error(`Invalid federation domain "${domain}"`);
  const server = await Federation.Server.createForDomain(domain, options);
  const raw = (await server.resolveAccountId(accountId)) as RawFederationResponse;
  if (!raw.stellar_address) throw new Error("Federation server returned no address for this account");
  return toRecord(raw);
}
