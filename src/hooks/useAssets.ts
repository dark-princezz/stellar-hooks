/**
 * @file useAssets.ts
 * @description Hook for fetching and listing Stellar assets via Horizon.
 * @package stellar-hooks
 */

import { useCallback, useEffect, useReducer } from "react";
import { Horizon } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { getHorizonServer } from "../utils/memoizedServers";

export interface UseAssetsOptions {
  /** Filter by asset code */
  assetCode?: string;
  /** Filter by asset issuer */
  assetIssuer?: string;
  /** Page size, default 10, max 200 */
  limit?: number;
  /** Paging token */
  cursor?: string;
  /** Sort order */
  order?: "asc" | "desc";
  /** Whether the query is enabled. Defaults to true. */
  enabled?: boolean;
}

export interface UseAssetsReturn {
  assets: Horizon.ServerApi.AssetRecord[];
  isLoading: boolean;
  error: Error | null;
  /** Manually trigger a refetch of the assets. */
  refetch: () => Promise<void>;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

interface State {
  assets: Horizon.ServerApi.AssetRecord[];
  isLoading: boolean;
  error: Error | null;
}

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: Horizon.ServerApi.AssetRecord[] }
  | { type: "FETCH_ERROR"; payload: Error };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, isLoading: true, error: null };
    case "FETCH_SUCCESS":
      return {
        assets: action.payload,
        isLoading: false,
        error: null,
      };
    case "FETCH_ERROR":
      return { ...state, isLoading: false, error: action.payload };
    default:
      return state;
  }
}

const initialState: State = {
  assets: [],
  isLoading: false,
  error: null,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetch and list Stellar assets via Horizon.
 *
 * @param {UseAssetsOptions} [options={}] - Configuration options.
 * @returns {UseAssetsReturn}
 *
 * @example
 * ```tsx
 * const { assets, isLoading, error } = useAssets({ assetCode: "USDC" });
 *
 * return assets.map((a) => (
 *   <p key={a.asset_code + a.asset_issuer}>{a.asset_code} — {a.amount}</p>
 * ));
 * ```
 */
export function useAssets(options: UseAssetsOptions = {}): UseAssetsReturn {
  const {
    assetCode,
    assetIssuer,
    limit = 10,
    cursor,
    order = "asc",
    enabled = true,
  } = options;

  const { config } = useStellarContext();
  const [state, dispatch] = useReducer(reducer, initialState);

  const fetchAssets = useCallback(async () => {
    dispatch({ type: "FETCH_START" });

    try {
      const server = getHorizonServer(config.horizonUrl);
      let callBuilder = server.assets();

      if (assetCode) callBuilder = callBuilder.forCode(assetCode);
      if (assetIssuer) callBuilder = callBuilder.forIssuer(assetIssuer);
      if (cursor) callBuilder = callBuilder.cursor(cursor);
      
      callBuilder = callBuilder.limit(limit).order(order);

      const response = await callBuilder.call();
      dispatch({ type: "FETCH_SUCCESS", payload: response.records });
    } catch (err) {
      dispatch({
        type: "FETCH_ERROR",
        payload: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }, [
    config.horizonUrl,
    assetCode,
    assetIssuer,
    limit,
    cursor,
    order,
  ]);

  useEffect(() => {
    if (enabled) {
      void fetchAssets();
    }
  }, [enabled, fetchAssets]);

  return { ...state, refetch: fetchAssets };
}
