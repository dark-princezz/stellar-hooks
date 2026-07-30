/**
 * @file useAssetSearch.ts
 * @description Hook for searching Stellar assets via StellarExpert API.
 * @package stellar-hooks
 * @license MIT
 */

import { useEffect, useRef, useState } from "react";

export interface StellarAssetRating {
  age: number;
  activity: number;
  trustlines: number;
  liquidity: number;
  volume7d: number;
  interop: number;
  average: number;
}

export interface StellarAssetTomlInfo {
  code: string;
  issuer: string;
  image?: string;
  name?: string;
  anchorAssetType?: string;
  anchorAsset?: string;
  orgName?: string;
  orgLogo?: string;
  decimals?: number;
  status?: string;
  [key: string]: unknown;
}

export interface StellarAssetInfo {
  asset: string; // Format: "CODE-ISSUER"
  code: string;
  issuer: string;
  domain?: string;
  rating: StellarAssetRating;
  tomlInfo?: StellarAssetTomlInfo;
  supply?: string;
  traded_amount?: string;
  payments_amount?: string;
  payments?: number;
  trades?: number;
  trustlines?: number[];
  price?: number;
  created?: number;
  score?: number;
  paging_token?: number;
}

export interface UseAssetSearchOptions {
  /** Debounce delay in ms before triggering a new search. Default: 300 */
  debounceMs?: number;
  /** Whether the hook should fetch. Default: true */
  enabled?: boolean;
}

/**
 * @example
 * ```tsx
 * const { results, search, isLoading, error } = useAssetSearch();
 *
 * await search("USDC");
 * // results: StellarAssetInfo[]
 * // results[0] = { code: "USDC", issuer: "G...", domain: "centre.io", ... }
 * ```
 */
export interface UseAssetSearchReturn {
  results: StellarAssetInfo[];
  isLoading: boolean;
  error: Error | null;
  search: (query: string) => Promise<void>;
  lastFetchedAt: Date | null;
}

const STELLAR_EXPERT_API_URL = "https://api.stellar.expert/explorer/public/asset";

/**
 * Searches for Stellar assets via the StellarExpert public API.
 * Debounces search input and gracefully handles rate limiting.
 */
export function useAssetSearch(
  options: UseAssetSearchOptions = {}
): UseAssetSearchReturn {
  const { debounceMs = 300, enabled = true } = options;

  const [results, setResults] = useState<StellarAssetInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = (query: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      if (!enabled || !query.trim()) {
        setResults([]);
        setError(null);
        resolve();
        return;
      }

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Clear any pending debounce
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(async () => {
        setIsLoading(true);
        setError(null);
        abortControllerRef.current = new AbortController();

        try {
          const url = `${STELLAR_EXPERT_API_URL}?search=${encodeURIComponent(query.trim())}`;
          const response = await fetch(url, {
            signal: abortControllerRef.current.signal,
          });

          if (!response.ok) {
            // Handle rate limiting (429) with a specific error message
            if (response.status === 429) {
              throw new Error("Rate limited by StellarExpert API. Please try again later.");
            }
            throw new Error(`StellarExpert API returned ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();

          // Extract records from the embedded response
          const records = data._embedded?.records || [];

          // Transform records to include parsed code and issuer
          const transformedResults: StellarAssetInfo[] = records.map((record: StellarAssetInfo) => {
            const [code, issuer] = record.asset.split("-");
            return {
              ...record,
              code,
              issuer,
            };
          });

          setResults(transformedResults);
          setLastFetchedAt(new Date());
        } catch (err) {
          // Ignore abort errors (from cancellation)
          if (err instanceof Error && err.name === "AbortError") {
            return;
          }
          setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
          setIsLoading(false);
          abortControllerRef.current = null;
          resolve();
        }
      }, debounceMs);
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { results, isLoading, error, search, lastFetchedAt };
}
