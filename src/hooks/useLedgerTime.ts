/**
 * @file useLedgerTime.ts
 * @description Hook exposing the latest closed ledger plus an estimated
 *   current network time, kept in sync as new ledgers close.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Horizon } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { useHookActivityDebug } from "../devtools/useHookActivityDebug";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Normalized snapshot of a closed ledger. */
export interface LedgerTimeSnapshot {
  sequence: number;
  /** Ledger close timestamp (ISO-8601), as reported by Horizon. */
  closedAt: string;
  hash: string;
  feePool: string;
  successfulTransactionCount: number;
  failedTransactionCount: number;
  operationCount: number;
}

/** Options for {@link useLedgerTime}. */
export interface UseLedgerTimeOptions {
  /** Set false to skip fetching/streaming. Default: true */
  enabled?: boolean;
  /** Friendly label for debug overlays. Default: "useLedgerTime" */
  debugLabel?: string;
  /**
   * How often (ms) `estimatedTime` is recomputed between ledger closes.
   * Set to 0 to only update on ledger close. Default: 1000.
   */
  tickInterval?: number;
  /**
   * Number of recent ledger observations retained for clock-offset and
   * close-interval estimation. Default: 12 (~1 minute of ledgers).
   */
  sampleWindow?: number;
  /** Callback fired whenever a new ledger is observed. */
  onLedger?: (ledger: LedgerTimeSnapshot) => void;
  /** Callback fired if the ledger stream errors. */
  onError?: (error: Error) => void;
}

/** Return shape of {@link useLedgerTime}. */
export interface UseLedgerTimeReturn {
  /** Most recently observed closed ledger, or `null` before the first fetch. */
  latestLedger: LedgerTimeSnapshot | null;
  /** Shortcut to `latestLedger.sequence`. */
  sequence: number | null;
  /** Shortcut to `latestLedger.closedAt` (ISO-8601). */
  closedAt: string | null;
  /**
   * Estimated current time on the Stellar network clock. Derived from the
   * median offset between ledger `closed_at` timestamps and local receive
   * times, so it stays accurate even when the device clock is skewed.
   * `null` until the first ledger is observed.
   */
  estimatedTime: Date | null;
  /** ISO-8601 form of `estimatedTime`. */
  estimatedTimeIso: string | null;
  /**
   * Smoothed clock offset in milliseconds (`networkTime - localTime`).
   * `null` until at least one ledger has been observed.
   */
  clockOffsetMs: number | null;
  /**
   * Mean seconds between consecutive ledger closes across the retained
   * sample window. `null` until at least two ledgers have been observed.
   */
  averageCloseIntervalSeconds: number | null;
  /** True while the initial ledger fetch is in flight. */
  isLoading: boolean;
  /** True when the SSE stream is actively connected. */
  isConnected: boolean;
  /** Last stream error encountered, or `null`. */
  error: Error | null;
  /** Re-fetch the latest ledger snapshot from Horizon. */
  refetch: () => void;
  /** Close and re-open the ledger stream (also re-seeds the snapshot). */
  reconnect: () => void;
}

// ─── Internals ────────────────────────────────────────────────────────────────

interface ClockSample {
  closedAtMs: number;
  receivedAtMs: number;
}

interface HorizonLedgerRecord {
  sequence?: number;
  closed_at?: string;
  closedAt?: string;
  hash?: string;
  fee_pool?: string;
  feePool?: string;
  successful_transaction_count?: number;
  successfulTransactionCount?: number;
  failed_transaction_count?: number;
  failedTransactionCount?: number;
  operations_count?: number;
  operationCount?: number;
}

interface HorizonLedgersPage {
  _embedded?: { records?: HorizonLedgerRecord[] };
  records?: HorizonLedgerRecord[];
}

function normalizeLedger(raw: HorizonLedgerRecord): LedgerTimeSnapshot | null {
  const sequence = raw.sequence;
  const closedAt = raw.closedAt ?? raw.closed_at;
  if (sequence === undefined || !closedAt) return null;
  const successful = raw.successfulTransactionCount ?? raw.successful_transaction_count ?? 0;
  const failed = raw.failedTransactionCount ?? raw.failed_transaction_count ?? 0;
  return {
    sequence,
    closedAt,
    hash: raw.hash ?? "",
    feePool: raw.feePool ?? raw.fee_pool ?? "",
    successfulTransactionCount: successful,
    failedTransactionCount: failed,
    operationCount: raw.operationCount ?? raw.operations_count ?? successful + failed,
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Track the latest closed Stellar ledger and an estimated current network
 * time. The hook seeds from Horizon's most recent ledger, then follows the
 * ledger stream so `estimatedTime` refreshes every time a new ledger closes
 * (and ticks smoothly in between).
 *
 * `estimatedTime` is computed as `Date.now() + clockOffset`, where the offset
 * is the median of `ledger.closed_at - localReceiveTime` over the recent
 * sample window. This makes it a network-synced clock: it stays correct even
 * if the device clock is wrong, and it self-corrects as ledgers close.
 *
 * @param options - Configuration options
 * @param options.enabled - Set false to disable fetching/streaming (default: true)
 * @param options.tickInterval - ms between `estimatedTime` recomputes (default: 1000, 0 = only on ledger close)
 * @param options.sampleWindow - ledgers retained for offset/interval stats (default: 12)
 * @param options.onLedger - callback fired on each newly observed ledger
 * @param options.onError - callback fired on stream errors
 *
 * @example
 * ```tsx
 * const { latestLedger, estimatedTime, isConnected } = useLedgerTime();
 *
 * return (
 *   <div>
 *     Ledger {latestLedger?.sequence} closed at {latestLedger?.closedAt}
 *     <br />
 *     Network time: {estimatedTime?.toLocaleTimeString()}
 *     <br />
 *     Stream: {isConnected ? "live" : "offline"}
 *   </div>
 * );
 * ```
 */
export function useLedgerTime(options: UseLedgerTimeOptions = {}): UseLedgerTimeReturn {
  const {
    enabled = true,
    debugLabel = "useLedgerTime",
    tickInterval = 1000,
    sampleWindow = 12,
    onLedger,
    onError,
  } = options;
  const { config } = useStellarContext();

  const [latestLedger, setLatestLedger] = useState<LedgerTimeSnapshot | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<Date | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState<number | null>(null);
  const [averageCloseIntervalSeconds, setAverageCloseIntervalSeconds] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [seedEpoch, setSeedEpoch] = useState<number>(0);
  const [connectionEpoch, setConnectionEpoch] = useState<number>(0);

  const samplesRef = useRef<ClockSample[]>([]);
  const offsetRef = useRef<number | null>(null);
  const maxSequenceRef = useRef<number>(-1);
  const onLedgerRef = useRef(onLedger);
  const onErrorRef = useRef(onError);
  onLedgerRef.current = onLedger;
  onErrorRef.current = onError;

  const reconnect = useCallback(() => {
    setConnectionEpoch((prev) => prev + 1);
    setSeedEpoch((prev) => prev + 1);
  }, []);

  const refetch = useCallback(() => {
    setSeedEpoch((prev) => prev + 1);
  }, []);

  // Recompute derived clock stats from the retained samples.
  const recomputeStats = useCallback(() => {
    const samples = samplesRef.current;
    if (samples.length === 0) {
      offsetRef.current = null;
      setClockOffsetMs(null);
      setAverageCloseIntervalSeconds(null);
      setEstimatedTime(null);
      return;
    }

    const offset = median(samples.map((s) => s.closedAtMs - s.receivedAtMs));
    offsetRef.current = offset;
    setClockOffsetMs(offset);
    setEstimatedTime(new Date(Date.now() + offset));

    if (samples.length >= 2) {
      const sorted = [...samples].sort((a, b) => a.closedAtMs - b.closedAtMs);
      let total = 0;
      let count = 0;
      for (let i = 1; i < sorted.length; i++) {
        const delta = sorted[i].closedAtMs - sorted[i - 1].closedAtMs;
        if (delta > 0) {
          total += delta;
          count++;
        }
      }
      setAverageCloseIntervalSeconds(count > 0 ? total / count / 1000 : null);
    } else {
      setAverageCloseIntervalSeconds(null);
    }
  }, []);

  // Ingest a ledger record: dedupe by sequence, record a clock sample, update state.
  const ingest = useCallback(
    (raw: HorizonLedgerRecord, receivedAtMs: number) => {
      const snapshot = normalizeLedger(raw);
      if (!snapshot || snapshot.sequence <= maxSequenceRef.current) return;

      maxSequenceRef.current = snapshot.sequence;
      const closedAtMs = Date.parse(snapshot.closedAt);
      if (Number.isFinite(closedAtMs)) {
        samplesRef.current = [...samplesRef.current, { closedAtMs, receivedAtMs }].slice(-sampleWindow);
      }

      setLatestLedger(snapshot);
      setIsLoading(false);
      recomputeStats();
      onLedgerRef.current?.(snapshot);
    },
    [sampleWindow, recomputeStats],
  );

  // Seed with the latest closed ledger so the hook is useful immediately,
  // without waiting up to one ledger interval (~5s) for the first stream event.
  useEffect(() => {
    if (!enabled) return;

    const abortController = new AbortController();
    const horizonUrl = config.horizonUrl.replace(/\/$/, "");

    fetch(`${horizonUrl}/ledgers?order=desc&limit=1`, {
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as HorizonLedgersPage;
        const record = payload._embedded?.records?.[0] ?? payload.records?.[0];
        if (record) ingest(record, Date.now());
      })
      .catch(() => {
        // Seed is best-effort; the stream will populate state if it fails.
      });

    return () => abortController.abort();
  }, [enabled, config.horizonUrl, seedEpoch, connectionEpoch, ingest]);

  // Stream newly closed ledgers.
  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      return;
    }

    let isCancelled = false;
    let closeStream: (() => void) | undefined;

    try {
      const server = new Horizon.Server(config.horizonUrl);
      closeStream = server
        .ledgers()
        .cursor("now")
        .stream({
          onmessage: (ledger: Horizon.ServerApi.LedgerRecord) => {
            if (isCancelled) return;
            setIsConnected(true);
            setError(null);
            ingest(ledger as unknown as HorizonLedgerRecord, Date.now());
          },
          onerror: (err: unknown) => {
            if (isCancelled) return;
            const wrappedErr = err instanceof Error ? err : new Error(String(err));
            setError(wrappedErr);
            setIsConnected(false);
            setIsLoading(false);
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
  }, [enabled, config.horizonUrl, connectionEpoch, ingest]);

  // Tick the estimated time forward between ledger closes.
  useEffect(() => {
    if (!enabled || tickInterval <= 0) return;
    const id = setInterval(() => {
      if (offsetRef.current !== null) {
        setEstimatedTime(new Date(Date.now() + offsetRef.current));
      }
    }, tickInterval);
    return () => clearInterval(id);
  }, [enabled, tickInterval]);

  // Reset state when disabled.
  useEffect(() => {
    if (enabled) return;
    samplesRef.current = [];
    offsetRef.current = null;
    maxSequenceRef.current = -1;
    setLatestLedger(null);
    setEstimatedTime(null);
    setClockOffsetMs(null);
    setAverageCloseIntervalSeconds(null);
    setError(null);
    setIsLoading(false);
  }, [enabled]);

  useHookActivityDebug({
    name: debugLabel,
    status: isConnected ? "streaming" : error ? "error" : "idle",
    error,
  });

  return {
    latestLedger,
    sequence: latestLedger?.sequence ?? null,
    closedAt: latestLedger?.closedAt ?? null,
    estimatedTime,
    estimatedTimeIso: estimatedTime ? estimatedTime.toISOString() : null,
    clockOffsetMs,
    averageCloseIntervalSeconds,
    isLoading,
    isConnected,
    error,
    refetch,
    reconnect,
  };
}
