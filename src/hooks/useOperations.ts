/**
 * @file useOperations.ts
 * @description Hook for fetching operations for an account or transaction from Horizon.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Horizon } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";

export interface UseOperationsOptions {
  /** Stellar account public key to fetch operations for */
  accountId?: string | null;
  /** Transaction hash to fetch operations for */
  transactionHash?: string | null;
  /** Cursor for pagination */
  cursor?: string;
  /** Maximum number of records per page. Default: 10 */
  limit?: number;
  /** Sort order. Default: "desc" */
  order?: "asc" | "desc";
  /** Include failed operations in the results. Default: false */
  includeFailed?: boolean;
  /** Whether the hook should fetch. Default: true */
  enabled?: boolean;
  /** Polling interval in ms. Default: 0 (disabled) */
  refetchInterval?: number;
}

/**
 * @example
 * ```tsx
 * // Fetch operations for an account
 * const { operations, isLoading } = useOperations({
 *   accountId: "G...",
 *   limit: 20,
 * });
 *
 * // Fetch operations for a transaction
 * const { operations, isLoading } = useOperations({
 *   transactionHash: "abc...",
 * });
 *
 * // With polling
 * const { operations } = useOperations({
 *   accountId: "G...",
 *   refetchInterval: 10_000,
 * });
 * ```
 */
export interface UseOperationsReturn {
  operations: Horizon.ServerApi.OperationRecord[];
  isLoading: boolean;
  error: Error | null;
  lastFetchedAt: Date | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches operations from Horizon for a given account or transaction.
 *
 * At least one of `accountId` or `transactionHash` must be provided.
 */
export function useOperations(
  options: UseOperationsOptions = {}
): UseOperationsReturn {
  const {
    accountId,
    transactionHash,
    cursor,
    limit = 10,
    order = "desc",
    includeFailed = false,
    enabled = true,
    refetchInterval = 0,
  } = options;

  const { config } = useStellarContext();

  const [operations, setOperations] = useState<Horizon.ServerApi.OperationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchIdRef = useRef(0);

  const refetch = useCallback(async () => {
    if (!accountId && !transactionHash) return;

    const id = ++fetchIdRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const server = new Horizon.Server(config.horizonUrl);
      let query = server.operations().order(order).limit(limit).includeFailed(includeFailed);

      if (cursor) {
        query = query.cursor(cursor);
      }

      if (accountId) {
        query = query.forAccount(accountId);
      }

      if (transactionHash) {
        query = query.forTransaction(transactionHash);
      }

      const response = await query.call();
      if (id !== fetchIdRef.current) return;
      setOperations(response.records);
      setLastFetchedAt(new Date());
    } catch (err) {
      if (id === fetchIdRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (id === fetchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [accountId, transactionHash, cursor, limit, order, includeFailed, config.horizonUrl]);

  useEffect(() => {
    if (!enabled || (!accountId && !transactionHash)) return;

    refetch();

    if (refetchInterval > 0) {
      intervalRef.current = setInterval(refetch, refetchInterval);
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      fetchIdRef.current += 1;
    };
  }, [enabled, accountId, transactionHash, refetch, refetchInterval]);

  return {
    operations,
    isLoading,
    error,
    lastFetchedAt,
    refetch,
  };
}
