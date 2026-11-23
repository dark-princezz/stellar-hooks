import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockStream = vi.hoisted(() => vi.fn());
const mockCursor = vi.hoisted(() => vi.fn().mockReturnValue({ stream: mockStream }));
const mockLedgers = vi.hoisted(() => vi.fn().mockReturnValue({ cursor: mockCursor }));

vi.mock("@stellar/stellar-sdk", () => ({
  Horizon: {
    Server: vi.fn().mockImplementation(() => ({
      ledgers: mockLedgers,
    })),
  },
}));

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
      sorobanRpcUrl: "https://soroban-testnet.stellar.org",
    },
  }),
  useOptionalStellarHookDebugContext: () => null,
}));

import { useLedgerTime } from "./useLedgerTime";

const ledgerRecord = (sequence: number, closedAt: string) => ({
  id: `ledger-${sequence}`,
  sequence,
  closed_at: closedAt,
  hash: `hash-${sequence}`,
  fee_pool: "GAFEE",
  successful_transaction_count: 10,
  failed_transaction_count: 1,
  operations_count: 11,
});

const seedResponse = (record: ReturnType<typeof ledgerRecord>) =>
  new Response(JSON.stringify({ _embedded: { records: [record] } }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

/** Flush pending promise chains (fetch → json → ingest) under fake timers. */
async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe("useLedgerTime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockStream.mockReturnValue(vi.fn());
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(seedResponse(ledgerRecord(100, "2024-01-01T00:00:04.700Z")))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("seeds latestLedger and estimatedTime from the Horizon REST endpoint", async () => {
    vi.setSystemTime(new Date("2024-01-01T00:00:05Z"));

    const { result } = renderHook(() => useLedgerTime());
    await flush();

    expect(result.current.sequence).toBe(100);
    expect(result.current.closedAt).toBe("2024-01-01T00:00:04.700Z");
    expect(result.current.isLoading).toBe(false);
    // closed_at was stamped 300ms before local receive time → offset ≈ -300ms
    expect(result.current.clockOffsetMs).toBeCloseTo(-300, -2);
    // estimatedTime = now + offset → equals the ledger close time at ingest
    expect(result.current.estimatedTime?.toISOString()).toBe("2024-01-01T00:00:04.700Z");
    expect(result.current.estimatedTimeIso).toBe("2024-01-01T00:00:04.700Z");
    // stream was opened as well
    expect(mockCursor).toHaveBeenCalledWith("now");
  });

  it("updates latestLedger and estimatedTime when a new ledger closes", async () => {
    vi.setSystemTime(new Date("2024-01-01T00:00:10Z"));

    const { result } = renderHook(() => useLedgerTime());
    await flush();
    expect(result.current.sequence).toBe(100);

    const handlers = mockStream.mock.calls[0][0];
    act(() => {
      handlers.onmessage(ledgerRecord(101, "2024-01-01T00:00:10Z") as never);
    });

    expect(result.current.sequence).toBe(101);
    expect(result.current.closedAt).toBe("2024-01-01T00:00:10Z");
    expect(result.current.isConnected).toBe(true);
    expect(result.current.estimatedTime).toBeInstanceOf(Date);
  });

  it("ticks estimatedTime forward between ledger closes", async () => {
    vi.setSystemTime(new Date("2024-01-01T00:00:05Z"));

    const { result } = renderHook(() => useLedgerTime({ tickInterval: 1000 }));
    await flush();
    expect(result.current.sequence).toBe(100);

    const before = result.current.estimatedTime?.getTime();
    expect(before).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.estimatedTime?.getTime()).toBe(before! + 3000);
  });

  it("computes averageCloseIntervalSeconds across multiple ledgers", async () => {
    vi.setSystemTime(new Date("2024-01-01T00:00:20Z"));

    const { result } = renderHook(() => useLedgerTime());
    await flush();
    expect(result.current.sequence).toBe(100);

    const handlers = mockStream.mock.calls[0][0];
    act(() => {
      handlers.onmessage(ledgerRecord(101, "2024-01-01T00:00:05Z") as never);
      handlers.onmessage(ledgerRecord(102, "2024-01-01T00:00:10Z") as never);
      handlers.onmessage(ledgerRecord(103, "2024-01-01T00:00:15Z") as never);
    });

    expect(result.current.sequence).toBe(103);
    expect(result.current.averageCloseIntervalSeconds).toBeCloseTo(5, 5);
  });

  it("does not fetch or stream when disabled", async () => {
    const { result } = renderHook(() => useLedgerTime({ enabled: false }));
    await flush();

    expect(fetch).not.toHaveBeenCalled();
    expect(mockLedgers).not.toHaveBeenCalled();
    expect(result.current.latestLedger).toBeNull();
    expect(result.current.estimatedTime).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("surfaces stream errors via onError and error state", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useLedgerTime({ onError }));
    await flush();
    expect(result.current.sequence).toBe(100);

    const handlers = mockStream.mock.calls[0][0];
    act(() => {
      handlers.onerror(new Error("stream failed"));
    });

    expect(result.current.error?.message).toBe("stream failed");
    expect(result.current.isConnected).toBe(false);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
