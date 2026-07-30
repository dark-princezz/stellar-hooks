/**
 * @file useLedgerStream.ts
 * @description Hook for streaming newly closed ledgers from Horizon.
 * @package stellar-hooks
 * @license MIT
 */

import { useEffect, useState, useCallback } from "react";
import { Horizon } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { useHookActivityDebug } from "../devtools/useHookActivityDebug";

export interface LedgerStreamData {
  sequence: number;
  closedAt: string;
  hash: string;
  feeRecipient: string;
  operationCount: number;
  raw: Horizon.LedgerRecord;
}

export interface UseLedgerStreamOptions {
  /** Whether streaming is enabled. Default: true */
  enabled?: boolean;
  /** Friendly label for debug overlays. Default: "useLedgerStream" */
  debugLabel?: string;
  /** Callback fired whenever a new ledger is closed and received. */
  onLedger?: (ledger: LedgerStreamData) => void;
  /** Callback fired if an error occurs in the stream. */
  onError?: (error: Error) => void;
}

export interface UseLedgerStreamReturn {
  /** The most recently closed ledger data, or null if none received yet. */
  latestLedger: LedgerStreamData | null;
  /** Shortcut to the latest ledger sequence number. */
  sequence: number | null;
  /** Shortcut to the latest ledger closed_at ISO timestamp. */
  closedAt: string | null;
  /** True when the SSE stream is actively connected. */
  isConnected: boolean;
  /** Last stream error encountered, or null. */
  error: Error | null;
  /** Manually trigger reconnection of the ledger stream. */
  reconnect: () => void;
}

/**
 * Subscribe to newly closed ledgers via Horizon streaming and expose
 * real-time sequence numbers and timestamps for live UI indicators.
 *
 * @example
 * ```tsx
 * const { sequence, closedAt, isConnected } = useLedgerStream({
 *   onLedger: (ledger) => console.log("New ledger closed:", ledger.sequence),
 * });
 * ```
 */
export function useLedgerStream(options: UseLedgerStreamOptions = {}): UseLedgerStreamReturn {
  const { enabled = true, debugLabel = "useLedgerStream", onLedger, onError } = options;
  const { config } = useStellarContext();

  const [latestLedger, setLatestLedger] = useState<LedgerStreamData | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [connectionEpoch, setConnectionEpoch] = useState<number>(0);

  const reconnect = useCallback(() => {
    setConnectionEpoch((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      return;
    }

    let isCancelled = false;
    let closeStream: (() => void) | undefined;

    try {
      const server = new Horizon.Server(config.horizonUrl);

      // Stream ledgers starting from the latest ('now')
      closeStream = server.ledgers()
        .cursor("now")
        .stream({
          onmessage: (ledger: Horizon.LedgerRecord) => {
            if (isCancelled) return;
            const parsed: LedgerStreamData = {
              sequence: ledger.sequence,
              closedAt: ledger.closed_at,
              hash: ledger.hash,
              feeRecipient: ledger.fee_pool_account,
              operationCount: ledger.successful_transaction_count + ledger.failed_transaction_count,
              raw: ledger,
            };

            setLatestLedger(parsed);
            setIsConnected(true);
            setError(null);
            onLedger?.(parsed);
          },
          onerror: (err: any) => {
            if (isCancelled) return;
            const wrappedErr = err instanceof Error ? err : new Error(String(err));
            setError(wrappedErr);
            setIsConnected(false);
            onError?.(wrappedErr);
          },
        });

      setIsConnected(true);
    } catch (err) {
      if (!isCancelled) {
        const wrappedErr = err instanceof Error ? err : new Error(String(err));
        setError(wrappedErr);
        setIsConnected(false);
        onError?.(wrappedErr);
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
  }, [enabled, config.horizonUrl, connectionEpoch, onLedger, onError]);

  useHookActivityDebug({
    name: debugLabel,
    status: isConnected ? "streaming" : error ? "error" : "idle",
    error,
  });

  return {
    latestLedger,
    sequence: latestLedger?.sequence ?? null,
    closedAt: latestLedger?.closedAt ?? null,
    isConnected,
    error,
    reconnect,
  };
}
