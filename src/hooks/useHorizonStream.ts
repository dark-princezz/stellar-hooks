import { useEffect, useRef, useState, useCallback } from "react";
import { Horizon } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { useHookActivityDebug } from "../devtools/useHookActivityDebug";

export type HorizonStreamResource = "accounts" | "operations" | "effects";

export interface UseHorizonStreamOptions<T> {
  /** The Horizon resource to stream. */
  resource: HorizonStreamResource;
  /** Filter operations or effects by account ID. */
  accountId?: string;
  /** Filter operations or effects by transaction hash. */
  transactionHash?: string;
  /** Filter operations or effects by ledger sequence. */
  ledgerSeq?: number | string;
  /** Filter accounts by signer. */
  signer?: string;
  /** Filter accounts by sponsor. */
  sponsor?: string;
  /** The cursor to start streaming from. Defaults to "now". */
  cursor?: string;
  /** The order of the stream. Default is "asc". */
  order?: "asc" | "desc";
  /** Maximum number of records to return per page. */
  limit?: number;
  /** Whether the stream is active. Default is true. */
  enabled?: boolean;
  /** Callback fired when a new record is received. */
  onMessage?: (record: T) => void;
  /** Callback fired on stream errors. */
  onError?: (error: Error) => void;
  /** Optional label for the debug overlay. */
  debugLabel?: string;
}

export interface UseHorizonStreamReturn<T> {
  /** The most recent record received from the stream. */
  latestRecord: T | null;
  /** True when the SSE stream is actively connected. */
  isConnected: boolean;
  /** The last error encountered by the stream. */
  error: Error | null;
  /** Manually reconnect the stream. */
  reconnect: () => void;
}

/**
 * A generic wrapper around Horizon's Server-Sent Events (SSE) streaming.
 * Supports streaming accounts, operations, and effects with various filters.
 *
 * @example
 * ```tsx
 * const { isConnected, latestRecord } = useHorizonStream<Horizon.ServerApi.OperationRecord>({
 *   resource: "operations",
 *   accountId: "G...",
 *   onMessage: (op) => console.log("New operation:", op)
 * });
 * ```
 */
export function useHorizonStream<
  T extends
    | Horizon.ServerApi.AccountRecord
    | Horizon.ServerApi.OperationRecord
    | Horizon.ServerApi.EffectRecord
>(options: UseHorizonStreamOptions<T>): UseHorizonStreamReturn<T> {
  const {
    resource,
    accountId,
    transactionHash,
    ledgerSeq,
    signer,
    sponsor,
    cursor = "now",
    order = "asc",
    limit,
    enabled = true,
    onMessage,
    onError,
    debugLabel = "useHorizonStream",
  } = options;

  const { config } = useStellarContext();

  const [latestRecord, setLatestRecord] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [connectionEpoch, setConnectionEpoch] = useState<number>(0);

  const reconnect = useCallback(() => {
    setConnectionEpoch((prev) => prev + 1);
  }, []);

  // Use refs for callbacks to avoid re-triggering the effect on every render if they aren't memoized
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
  }, [onMessage, onError]);

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      return;
    }

    let isCancelled = false;
    let closeStream: (() => void) | undefined;

    try {
      const server = new Horizon.Server(config.horizonUrl);
      let builder: any;

      if (resource === "accounts") {
        builder = server.accounts();
        if (signer) builder = builder.forSigner(signer);
        if (sponsor) builder = builder.forSponsor(sponsor);
      } else if (resource === "operations") {
        builder = server.operations();
        if (accountId) builder = builder.forAccount(accountId);
        if (transactionHash) builder = builder.forTransaction(transactionHash);
        if (ledgerSeq) builder = builder.forLedger(ledgerSeq);
      } else if (resource === "effects") {
        builder = server.effects();
        if (accountId) builder = builder.forAccount(accountId);
        if (transactionHash) builder = builder.forTransaction(transactionHash);
        if (ledgerSeq) builder = builder.forLedger(ledgerSeq);
      } else {
        throw new Error(`Unsupported stream resource: ${resource}`);
      }

      if (cursor) builder = builder.cursor(cursor);
      if (order) builder = builder.order(order);
      if (limit) builder = builder.limit(limit);

      closeStream = builder.stream({
        onmessage: (record: T) => {
          if (isCancelled) return;
          setLatestRecord(record);
          setIsConnected(true);
          setError(null);
          onMessageRef.current?.(record);
        },
        onerror: (err: unknown) => {
          if (isCancelled) return;
          const wrappedErr = err instanceof Error ? err : new Error(String(err));
          setError(wrappedErr);
          setIsConnected(false);
          onErrorRef.current?.(wrappedErr);
        },
      });

      setIsConnected(true);
    } catch (err) {
      if (!isCancelled) {
        const wrappedErr = err instanceof Error ? err : new Error(String(err));
        setError(wrappedErr);
        setIsConnected(false);
        onErrorRef.current?.(wrappedErr);
      }
    }

    return () => {
      isCancelled = true;
      if (typeof closeStream === "function") {
        try {
          closeStream();
        } catch {
          // ignore cleanup errors on closed streams
        }
      }
      setIsConnected(false);
    };
  }, [
    enabled,
    config.horizonUrl,
    connectionEpoch,
    resource,
    accountId,
    transactionHash,
    ledgerSeq,
    signer,
    sponsor,
    cursor,
    order,
    limit,
  ]);

  useHookActivityDebug({
    name: debugLabel,
    status: isConnected ? "streaming" : error ? "error" : "idle",
    error,
  });

  return {
    latestRecord,
    isConnected,
    error,
    reconnect,
  };
}
