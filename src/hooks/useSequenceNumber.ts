import { useCallback, useMemo, useState } from "react";
import { useStellarContext } from "../context";
import { getHorizonServer } from "../utils/memoizedServers";
import { useStellarQuery } from "./useStellarQuery";

export interface UseSequenceNumberOptions {
  enabled?: boolean;
  autoIncrement?: boolean;
}

export interface UseSequenceNumberReturn {
  sequence: string | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Fetches the current sequence number for a Stellar account, with optional
 * auto-increment for building multiple transactions in a single session.
 *
 * @example
 * ```tsx
 * // Basic usage — get the current sequence number
 * const { sequence, isLoading, error, refresh } = useSequenceNumber(publicKey);
 * // sequence: "1234567890"
 *
 * // With autoIncrement — each call to refresh() increments locally
 * // so you can build multiple transactions without re-fetching
 * const { sequence, refresh } = useSequenceNumber(publicKey, { autoIncrement: true });
 * // sequence: "1234567890" → refresh() → "1234567891" → refresh() → "1234567892"
 * ```
 */
export function useSequenceNumber(
  publicKey: string | null | undefined,
  options: UseSequenceNumberOptions = {}
): UseSequenceNumberReturn {
  const { enabled = true, autoIncrement = false } = options;
  const { config } = useStellarContext();
  const [incrementCount, setIncrementCount] = useState(0);

  const fetcher = useCallback(async (_signal?: AbortSignal) => {
    if (!publicKey) return null;
    const server = getHorizonServer(config.horizonUrl);
    const account = await server.loadAccount(publicKey);
    return account.sequenceNumber();
  }, [publicKey, config.horizonUrl]);

  const state = useStellarQuery<string | null>(fetcher, {
    enabled: enabled && Boolean(publicKey),
    initialData: null,
    debugLabel: "useSequenceNumber",
  });

  const refresh = useCallback(async () => {
    setIncrementCount(0);
    await state.refetch();
    // `state` itself is intentionally omitted: `state.refetch` is the only
    // stable field this callback needs, and depending on the whole object
    // would re-create `refresh` on every data/loading update from useStellarQuery.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.refetch]);

  const sequence = useMemo(() => {
    if (!state.data) return null;
    if (!autoIncrement || incrementCount === 0) return state.data;
    return (BigInt(state.data) + BigInt(incrementCount)).toString();
  }, [state.data, autoIncrement, incrementCount]);

  const wrappedRefresh = useCallback(async () => {
    if (autoIncrement && state.data) {
      setIncrementCount((c) => c + 1);
      return;
    }
    await refresh();
  }, [autoIncrement, state.data, refresh]);

  return {
    sequence,
    isLoading: state.isLoading,
    error: state.error,
    refresh: wrappedRefresh,
  };
}
