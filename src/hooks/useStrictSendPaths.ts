/**
 * @file useStrictSendPaths.ts
 * @description Hook for querying available payment paths via Horizon's strict-send endpoint.
 * @package stellar-hooks
 * @license MIT
 */

import { useEffect, useRef, useState } from "react";
import { Asset, Horizon } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";

export interface PathRecord {
  source_asset_type: string;
  source_asset_code?: string;
  source_asset_issuer?: string;
  source_amount: string;
  destination_asset_type: string;
  destination_asset_code?: string;
  destination_asset_issuer?: string;
  destination_amount: string;
  path: Array<{
    asset_type: string;
    asset_code?: string;
    asset_issuer?: string;
  }>;
}

export interface UseStrictSendPathsOptions {
  /** Debounce delay in ms before triggering a new query on input change. Default: 300 */
  debounceMs?: number;
  /** Whether the hook should fetch. Default: true */
  enabled?: boolean;
}

/**
 * @example
 * ```tsx
 * import { useStrictSendPaths } from "stellar-hooks";
 * import { Asset } from "@stellar/stellar-sdk";
 *
 * // Swap rate preview UI — show available paths for sending 10 XLM
 * function SwapRatePreview() {
 *   const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
 *   const { paths, isLoading, error } = useStrictSendPaths(
 *     Asset.native(),
 *     "10",
 *     [new Asset("USDC", USDC_ISSUER)],
 *   );
 *
 *   if (isLoading) return <p>Finding best rate…</p>;
 *   if (error) return <p>Error: {error.message}</p>;
 *
 *   const best = paths[0];
 *   if (!best) return <p>No paths found.</p>;
 *
 *   return (
 *     <p>
 *       Send {best.source_amount} XLM → Receive ~{best.destination_amount} USDC
 *     </p>
 *   );
 * }
 * ```
 */
export interface UseStrictSendPathsReturn {
  paths: PathRecord[];
  isLoading: boolean;
  error: Error | null;
  lastFetchedAt: Date | null;
}

/**
 * Queries Horizon's `/paths/strict-send` endpoint to discover available payment
 * paths and exchange rates before the user commits to a swap.
 *
 * Automatically re-queries whenever `sourceAsset`, `sourceAmount`, or
 * `destinationAssets` change, with a configurable debounce (default 300 ms).
 *
 * @param sourceAsset - Asset being sent (e.g., Asset.native() for XLM)
 * @param sourceAmount - Amount to send as a string (e.g., "10.5")
 * @param destinationAssets - Array of destination assets to find paths to
 * @param options - Configuration options for the query
 * @param options.debounceMs - Debounce delay in milliseconds before triggering query (default: 300)
 * @param options.enabled - Whether the hook should fetch (default: true)
 *
 * @returns Object containing path records and query state
 * @returns {PathRecord[]} returns.paths - Array of available payment paths with exchange rates
 * @returns {boolean} returns.isLoading - True during initial fetch
 * @returns {Error|null} returns.error - Any error from the fetch
 * @returns {Date|null} returns.lastFetchedAt - Timestamp of last successful fetch
 *
 * @example
 * ```tsx
 * import { useStrictSendPaths } from "stellar-hooks";
 * import { Asset } from "@stellar/stellar-sdk";
 *
 * // Swap rate preview UI — show available paths for sending 10 XLM
 * function SwapRatePreview() {
 *   const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
 *   const { paths, isLoading, error } = useStrictSendPaths(
 *     Asset.native(),
 *     "10",
 *     [new Asset("USDC", USDC_ISSUER)],
 *   );
 *
 *   if (isLoading) return <p>Finding best rate…</p>;
 *   if (error) return <p>Error: {error.message}</p>;
 *
 *   const best = paths[0];
 *   if (!best) return <p>No paths found.</p>;
 *
 *   return (
 *     <p>
 *       Send {best.source_amount} XLM → Receive ~{best.destination_amount} USDC
 *     </p>
 *   );
 * }
 * ```
 */
export function useStrictSendPaths(
  sourceAsset: Asset,
  sourceAmount: string,
  destinationAssets: Asset[],
  options: UseStrictSendPathsOptions = {}
): UseStrictSendPathsReturn {
  const { debounceMs = 300, enabled = true } = options;

  const { config } = useStellarContext();

  const [paths, setPaths] = useState<PathRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable string keys for dependency comparison
  const sourceAssetKey = sourceAsset.toString();
  const destinationAssetsKey = destinationAssets.map((a) => a.toString()).join(",");

  useEffect(() => {
    if (!enabled || !sourceAmount || destinationAssets.length === 0) return;

    // Clear any pending debounce before scheduling a new one
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const server = new Horizon.Server(config.horizonUrl);
        const response = await server
          .strictSendPaths(sourceAsset, sourceAmount, destinationAssets)
          .call();

        setPaths(response.records as unknown as PathRecord[]);
        setLastFetchedAt(new Date());
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sourceAssetKey, sourceAmount, destinationAssetsKey, debounceMs, config.horizonUrl]);

  return { paths, isLoading, error, lastFetchedAt };
}
