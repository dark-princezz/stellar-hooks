/**
 * @file useStellarToml.ts
 * @description Hook for fetching and parsing stellar.toml files.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { StellarToml } from "@stellar/stellar-sdk";
import { getCache, setCache } from "../utils";

/** A single entry of the `[[CURRENCIES]]` array in a stellar.toml file. */
export interface StellarTomlCurrency {
  code?: string;
  code_template?: string;
  issuer?: string;
  contract?: string;
  status?: string;
  display_decimals?: number;
  name?: string;
  desc?: string;
  conditions?: string;
  image?: string;
  fixed_number?: number;
  max_number?: number;
  is_unlimited?: boolean;
  is_asset_anchored?: boolean;
  anchor_asset_type?: string;
  anchor_asset?: string;
  toml?: string;
  [key: string]: unknown;
}

/** The `[DOCUMENTATION]` table of a stellar.toml file. */
export interface StellarTomlDocumentation {
  ORG_NAME?: string;
  ORG_DBA?: string;
  ORG_URL?: string;
  ORG_LOGO?: string;
  ORG_DESCRIPTION?: string;
  ORG_PHYSICAL_ADDRESS?: string;
  ORG_OFFICIAL_EMAIL?: string;
  ORG_SUPPORT_EMAIL?: string;
  ORG_TWITTER?: string;
  ORG_GITHUB?: string;
  [key: string]: unknown;
}

/**
 * Well-known SEP-1 fields of a stellar.toml file. Unlisted or future fields
 * stay reachable through the index signature.
 */
export interface StellarTomlData {
  VERSION?: string;
  NETWORK_PASSPHRASE?: string;
  FEDERATION_SERVER?: string;
  AUTH_SERVER?: string;
  TRANSFER_SERVER?: string;
  TRANSFER_SERVER_SEP0024?: string;
  KYC_SERVER?: string;
  WEB_AUTH_ENDPOINT?: string;
  SIGNING_KEY?: string;
  HORIZON_URL?: string;
  ANCHOR_QUOTE_SERVER?: string;
  DIRECT_PAYMENT_SERVER?: string;
  URI_REQUEST_SIGNING_KEY?: string;
  ACCOUNTS?: string[];
  CURRENCIES?: StellarTomlCurrency[];
  VALIDATORS?: Array<Record<string, unknown>>;
  PRINCIPALS?: Array<Record<string, unknown>>;
  DOCUMENTATION?: StellarTomlDocumentation;
  [key: string]: unknown;
}

export interface UseStellarTomlOptions {
  /** Time-to-live for cache in milliseconds (default: 300000 = 5 minutes) */
  cacheTTL?: number;
  /** Allow resolving over plain HTTP instead of HTTPS (default: false) */
  allowHttp?: boolean;
  /** Request timeout in milliseconds, passed to the SEP-1 resolver */
  timeout?: number;
}

/**
 * @example
 * ```tsx
 * const {
 *   data,             // StellarTomlData | null — full parsed stellar.toml
 *   federationServer, // string | null — FEDERATION_SERVER
 *   signingKey,       // string | null — SIGNING_KEY
 *   currencies,       // StellarTomlCurrency[] — [[CURRENCIES]] entries
 *   documentation,    // StellarTomlDocumentation | null — [DOCUMENTATION]
 *   isLoading,        // boolean
 *   error,            // Error | null
 *   refetch,          // () => Promise<void>
 * } = useStellarToml("stellar.org");
 * ```
 */
export interface UseStellarTomlReturn {
  data: StellarTomlData | null;
  /** `FEDERATION_SERVER` — SEP-2 federation endpoint, if published. */
  federationServer: string | null;
  /** `SIGNING_KEY` — public key used to verify the domain's signatures. */
  signingKey: string | null;
  /** `WEB_AUTH_ENDPOINT` — SEP-10 authentication endpoint. */
  webAuthEndpoint: string | null;
  /** `TRANSFER_SERVER` — SEP-6 deposit / withdrawal endpoint. */
  transferServer: string | null;
  /** `KYC_SERVER` — SEP-12 customer info endpoint. */
  kycServer: string | null;
  /** `NETWORK_PASSPHRASE` the domain operates on. */
  networkPassphrase: string | null;
  /** `[[CURRENCIES]]` entries — always an array, empty when absent. */
  currencies: StellarTomlCurrency[];
  /** `[DOCUMENTATION]` organisation metadata. */
  documentation: StellarTomlDocumentation | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches and parses a domain's stellar.toml file via the SEP-1 standard.
 */
export function useStellarToml(
  domain: string | null | undefined,
  options: UseStellarTomlOptions = {},
): UseStellarTomlReturn {
  const { cacheTTL = 300000, allowHttp, timeout } = options;
  const [data, setData] = useState<StellarTomlData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const cancelledRef = useRef(false);

  const refetch = useCallback(async (force = false) => {
    if (!domain) return;

    const cacheKey = `stellar-toml-${domain}`;
    if (!force) {
      const cached = getCache<StellarTomlData>(cacheKey);
      if (cached) {
        setData(cached);
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    try {
      const toml = await StellarToml.Resolver.resolve(domain, {
        ...(allowHttp !== undefined ? { allowHttp } : {}),
        ...(timeout !== undefined ? { timeout } : {}),
      });
      if (cancelledRef.current) return;
      const parsed = toml as StellarTomlData;
      setCache(cacheKey, parsed, cacheTTL);
      setData(parsed);
    } catch (err) {
      if (!cancelledRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (!cancelledRef.current) {
        setIsLoading(false);
      }
    }
  }, [domain, cacheTTL, allowHttp, timeout]);

  useEffect(() => {
    cancelledRef.current = false;
    if (domain) {
      void refetch();
      return () => {
        cancelledRef.current = true;
      };
    }

    setData(null);
    setError(null);
    setIsLoading(false);

    return () => {
      cancelledRef.current = true;
    };
  }, [domain, refetch]);

  return {
    data,
    federationServer: data?.FEDERATION_SERVER ?? null,
    signingKey: data?.SIGNING_KEY ?? null,
    webAuthEndpoint: data?.WEB_AUTH_ENDPOINT ?? null,
    transferServer: data?.TRANSFER_SERVER ?? null,
    kycServer: data?.KYC_SERVER ?? null,
    networkPassphrase: data?.NETWORK_PASSPHRASE ?? null,
    currencies: data?.CURRENCIES ?? [],
    documentation: data?.DOCUMENTATION ?? null,
    isLoading,
    error,
    refetch: () => refetch(true),
  };
}
