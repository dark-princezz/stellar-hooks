/**
 * @file useAssetMetadata.ts
 * @description Hook for fetching asset metadata from stellar.toml files.
 * @package stellar-hooks
 */

import { useMemo } from "react";
import { useStellarAccount } from "./useStellarAccount";
import { useStellarToml } from "./useStellarToml";
import { asPublicKey } from "../types";

export interface AssetMetadata {
  code?: string;
  issuer?: string;
  name?: string;
  desc?: string;
  image?: string;
  [key: string]: unknown;
}

/**
 * @example
 * ```tsx
 * const {
 *   metadata,  // AssetMetadata | null — matched CURRENCIES entry from stellar.toml
 *   isLoading, // boolean
 *   error,     // Error | null
 * } = useAssetMetadata("USDC", "GISSUER...");
 *
 * // metadata.name  → human-readable asset name
 * // metadata.image → logo URL
 * // metadata.desc  → description
 * ```
 */
export interface UseAssetMetadataReturn {
  metadata: AssetMetadata | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Resolves asset issuer info via stellar.toml.
 * Composes useStellarAccount and useStellarToml to fetch the issuer's home_domain and metadata.
 *
 * This hook fetches asset metadata by:
 * 1. Getting the issuer account's home_domain from Horizon
 * 2. Fetching the stellar.toml file from that domain
 * 3. Finding the matching asset in the CURRENCIES section
 *
 * This provides access to asset information like name, description, logo, and other
 * metadata defined in the issuer's stellar.toml file.
 *
 * @param assetCode - Asset code to look up (e.g., "USDC")
 * @param assetIssuer - Asset issuer public key (G...)
 *
 * @returns Object containing asset metadata and query state
 * @returns {AssetMetadata|null} returns.metadata - Matched CURRENCIES entry from stellar.toml
 * @returns {boolean} returns.isLoading - True during account or toml fetch
 * @returns {Error|null} returns.error - Any error from the fetch process
 *
 * @example
 * ```tsx
 * const {
 *   metadata,  // AssetMetadata | null — matched CURRENCIES entry from stellar.toml
 *   isLoading, // boolean
 *   error,     // Error | null
 * } = useAssetMetadata("USDC", "GISSUER...");
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorBanner error={error} />;
 * if (!metadata) return <div>Asset metadata not found</div>;
 *
 * return (
 *   <div>
 *     <h3>{metadata.name || metadata.code}</h3>
 *     <p>{metadata.desc}</p>
 *     {metadata.image && <img src={metadata.image} alt={metadata.code} />}
 *   </div>
 * );
 * ```
 */
export function useAssetMetadata(
  assetCode: string | null | undefined,
  assetIssuer: string | null | undefined
): UseAssetMetadataReturn {
  const {
    data: accountData,
    isLoading: isAccountLoading,
    error: accountError,
  } = useStellarAccount(assetIssuer ? asPublicKey(assetIssuer) : null, { enabled: !!assetIssuer });

  const homeDomain = accountData?.raw?.home_domain;
  const { data: tomlData, isLoading: isTomlLoading, error: tomlError } = useStellarToml(homeDomain);

  const metadata = useMemo(() => {
    if (!tomlData || !tomlData.CURRENCIES || !assetCode || !assetIssuer) return null;
    
    return tomlData.CURRENCIES.find((c) => c.code === assetCode && c.issuer === assetIssuer) || null;
  }, [tomlData, assetCode, assetIssuer]);

  return {
    metadata,
    isLoading: isAccountLoading || isTomlLoading,
    error: accountError || tomlError,
  };
}