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
 * This hook retrieves Stellar operations from the Horizon API, supporting both
 * account-level and transaction-level operation queries. It includes pagination
 * support, filtering options, and optional polling for real-time updates.
 *
 * At least one of `accountId` or `transactionHash` must be provided.
 *
 * @param options - Configuration options for the operations query
 * @param options.accountId - Stellar account public key to fetch operations for
 * @param options.transactionHash - Transaction hash to fetch operations for
 * @param options.cursor - Cursor for pagination
 * @param options.limit - Maximum number of records per page (default: 10)
 * @param options.order - Sort order: "asc" or "desc" (default: "desc")
 * @param options.includeFailed - Include failed operations in results (default: false)
 * @param options.enabled - Whether the hook should fetch (default: true)
 * @param options.refetchInterval - Polling interval in milliseconds, 0 = disabled (default: 0)
 *
 * @returns Object containing operations data and query state
 * @returns {Horizon.ServerApi.OperationRecord[]} returns.operations - Array of operation records
 * @returns {boolean} returns.isLoading - True during fetch
 * @returns {Error|null} returns.error - Any error from the fetch
 * @returns {Date|null} returns.lastFetchedAt - Timestamp of last successful fetch
 * @returns {function} returns.refetch - Manually trigger a refetch
 *
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
 *
 * @example
 * ```tsx
 * // With pagination
 * const { operations, isLoading } = useOperations({
 *   accountId: publicKey,
 *   cursor: "123456...",
 *   limit: 50,
 *   order: "asc",
 * });
 * ```
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
