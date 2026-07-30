/**
 * @file useNetworkStatus.ts
 * @description Hook exposing real-time Horizon and Soroban RPC health.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useStellarContext } from "../context";
import { getHorizonServer, getRpcServer } from "../utils/memoizedServers";

export interface UseNetworkStatusArgs {
  /** Poll interval in ms. 0 (default) disables polling — status is fetched once. */
  refetchInterval?: number;
}

export interface NetworkStatus {
  isHorizonHealthy: boolean;
  isRpcHealthy: boolean;
  /** Latest known ledger from Horizon. Retains its last value if Horizon is unreachable. */
  ledger: number;
  /** Round-trip latency to Horizon in ms, or Infinity if the last check failed. */
  horizonLatency: number;
  /** Round-trip latency to the Soroban RPC server in ms, or Infinity if the last check failed. */
  rpcLatency: number;
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Poll Horizon and Soroban RPC health/latency independently, so a failure on
 * one endpoint never masks the status of the other.
 *
 * @example
 * ```tsx
 * const { isHorizonHealthy, isRpcHealthy, ledger } = useNetworkStatus({
 *   refetchInterval: 10000,
 * });
 * ```
 */
export function useNetworkStatus(
  args: UseNetworkStatusArgs = {},
): NetworkStatus {
  const { refetchInterval = 0 } = args;
  const { config } = useStellarContext();
  const horizonServer = getHorizonServer(config.horizonUrl);
  const rpcServer = getRpcServer(config.sorobanRpcUrl);

  const [state, setState] = useState<
    Omit<NetworkStatus, "isLoading" | "refetch">
  >({
    isHorizonHealthy: false,
    isRpcHealthy: false,
    ledger: 0,
    horizonLatency: Infinity,
    rpcLatency: Infinity,
  });
  const [isLoading, setIsLoading] = useState(true);

  const cancelledRef = useRef(false);

  const check = useCallback(async () => {
    setIsLoading(true);

    const horizonStart = Date.now();
    let isHorizonHealthy = false;
    let horizonLatency = Infinity;
    let ledger: number | null = null;

    try {
      const root = await horizonServer.root();
      horizonLatency = Date.now() - horizonStart;
      isHorizonHealthy = true;
      ledger = root.history_latest_ledger ?? 0;
    } catch {
      isHorizonHealthy = false;
      horizonLatency = Infinity;
    }

    const rpcStart = Date.now();
    let isRpcHealthy = false;
    let rpcLatency = Infinity;

    try {
      await rpcServer.getHealth();
      rpcLatency = Date.now() - rpcStart;
      isRpcHealthy = true;
    } catch {
      isRpcHealthy = false;
      rpcLatency = Infinity;
    }

    if (!cancelledRef.current) {
      setState((prev) => ({
        isHorizonHealthy,
        isRpcHealthy,
        // Keep the last known ledger if this check couldn't reach Horizon.
        ledger: ledger ?? prev.ledger,
        horizonLatency,
        rpcLatency,
      }));
    }
    if (!cancelledRef.current) {
      setIsLoading(false);
    }
  }, [horizonServer, rpcServer]);

  useEffect(() => {
    cancelledRef.current = false;
    check();

    if (!refetchInterval) return;

    const id = setInterval(check, refetchInterval);
    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, [check, refetchInterval]);

  return { ...state, isLoading, refetch: check };
}