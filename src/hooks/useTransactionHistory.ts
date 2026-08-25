import { useState, useCallback, useEffect, useRef } from 'react';
import { Horizon } from '@stellar/stellar-sdk';
import { useStellarContext } from '../context';
import { getHorizonServer } from '../utils/memoizedServers';

export interface UseTransactionHistoryOptions {
  /** The maximum number of records to return per page. Default: 10. */
  limit?: number;
  /** The order of the records. 'asc' or 'desc'. Default: 'desc'. */
  order?: 'asc' | 'desc';
  /** Whether to include failed transactions. Default: false. */
  includeFailed?: boolean;
}

export interface UseTransactionHistoryReturn {
  /** An array of transaction records for the account. */
  transactions: Horizon.ServerApi.TransactionRecord[];
  /** Fetches the next page of transactions (older in desc order, newer in asc order). */
  fetchNextPage: () => void;
  /** Fetches the previous page of transactions (newer in desc order, older in asc order). */
  fetchPreviousPage: () => void;
  /** Simple loadMore function that loads more transactions in the forward direction (alias for fetchNextPage). */
  loadMore: () => void;
  /** Whether there are more transactions available in the forward direction. */
  hasNext: boolean;
  /** Whether there are more transactions available in the backward direction. */
  hasPrevious: boolean;
  /** Whether the hook is currently fetching data. */
  isLoading: boolean;
  /** An error object if the fetch fails. */
  error: Error | null;
  /** Current cursor for the next page (useful for external cursor management). */
  cursor: string | null;
  /** Reset the transaction history to initial state. */
  reset: () => void;
}

const DEFAULT_LIMIT = 10;
const DEFAULT_ORDER = 'desc';

/**
 * `useTransactionHistory` is a hook that fetches a paginated list of transactions
 * for a given Stellar account from Horizon, with support for forward and backward
 * cursor-based pagination. Includes loadMore for infinite scroll patterns.
 *
 * @param {string} publicKey - The public key of the account to fetch history for.
 * @param {UseTransactionHistoryOptions} [options] - Options for the query.
 * @returns {UseTransactionHistoryReturn} An object containing the transaction history and pagination controls.
 *
 * @example
 * ```tsx
 * const {
 *   transactions,
 *   loadMore,
 *   hasNext,
 *   isLoading,
 *   reset,
 * } = useTransactionHistory('G...', { limit: 20, includeFailed: true });
 *
 * // For infinite scroll
 * <button onClick={loadMore} disabled={!hasNext || isLoading}>
 *   Load More
 * </button>
 * ```
 */
export function useTransactionHistory(
  publicKey: string,
  options?: UseTransactionHistoryOptions
): UseTransactionHistoryReturn {
  const { config } = useStellarContext();
  const server = getHorizonServer(config.horizonUrl);
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const order = options?.order ?? DEFAULT_ORDER;
  const includeFailed = options?.includeFailed ?? false;

  const [transactions, setTransactions] = useState<Horizon.ServerApi.TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [prevCursor, setPrevCursor] = useState<string | undefined>(undefined);
  const [hasNext, setHasNext] = useState<boolean>(true);
  const [hasPrevious, setHasPrevious] = useState<boolean>(false);
  const [resetKey, setResetKey] = useState(0);

  const fetchIdRef = useRef(0);

  const fetchTransactions = useCallback(
    async (cursor?: string, direction: 'next' | 'prev' = 'next') => {
      if (!publicKey) {
        return;
      }

      const id = ++fetchIdRef.current;

      setIsLoading(true);
      setError(null);

      try {
        let builder = server
          .transactions()
          .forAccount(publicKey)
          .limit(limit)
          .includeFailed(includeFailed);

        if (direction === 'prev') {
          const oppositeOrder = order === 'desc' ? 'asc' : 'desc';
          builder = builder.order(oppositeOrder);
        } else {
          builder = builder.order(order);
        }

        if (cursor) {
          builder = builder.cursor(cursor);
        }

        const response = await builder.call();

        if (id !== fetchIdRef.current) return;

        if (direction === 'next') {
          if (cursor) {
            setTransactions(prev => [...prev, ...response.records]);
          } else {
            setTransactions(response.records);
          }

          if (response.records.length > 0) {
            setNextCursor(response.records[response.records.length - 1]!.paging_token);
            setPrevCursor(response.records[0]!.paging_token);
          }
          setHasNext(response.records.length >= limit);
          setHasPrevious(cursor !== undefined);
        } else {
          const reversedRecords = [...response.records].reverse();

          setTransactions(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const newRecords = reversedRecords.filter(r => !existingIds.has(r.id));
            return [...newRecords, ...prev];
          });

          if (reversedRecords.length > 0) {
            setPrevCursor(reversedRecords[0]!.paging_token);
          }
          setHasNext(true);
          setHasPrevious(response.records.length >= limit);
        }
      } catch (e) {
        if (id === fetchIdRef.current) {
          setError(e as Error);
        }
      } finally {
        if (id === fetchIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [publicKey, server, limit, order, includeFailed]
  );

  useEffect(() => {
    setTransactions([]);
    setNextCursor(undefined);
    setPrevCursor(undefined);
    setHasNext(true);
    setHasPrevious(false);
    setError(null);
    fetchTransactions();
    return () => {
      fetchIdRef.current += 1;
    };
  }, [fetchTransactions, resetKey]);

  const fetchNextPage = useCallback(() => {
    if (!isLoading && hasNext && nextCursor) {
      fetchTransactions(nextCursor, 'next');
    }
  }, [isLoading, hasNext, nextCursor, fetchTransactions]);

  const fetchPreviousPage = useCallback(() => {
    if (!isLoading && hasPrevious && prevCursor) {
      fetchTransactions(prevCursor, 'prev');
    }
  }, [isLoading, hasPrevious, prevCursor, fetchTransactions]);

  const loadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  const reset = useCallback(() => {
    // Cancel any in-flight request by incrementing the fetch ID
    fetchIdRef.current += 1;
    // Reset state to initial values
    setTransactions([]);
    setNextCursor(undefined);
    setPrevCursor(undefined);
    setHasNext(true);
    setHasPrevious(false);
    setError(null);
    // Trigger a fresh fetch by incrementing the reset key
    setResetKey(k => k + 1);
  }, []);

  return {
    transactions,
    fetchNextPage,
    fetchPreviousPage,
    loadMore,
    hasNext,
    hasPrevious,
    isLoading,
    error,
    cursor: nextCursor ?? null,
    reset,
  };
}
