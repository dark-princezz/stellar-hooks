/**
 * @file useLedgerEntry.test.ts
 * @description Unit tests for the useLedgerEntry hook with mocked RPC responses.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useLedgerEntry } from "../hooks/useLedgerEntry";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetLedgerEntries = vi.fn();

vi.mock("@stellar/stellar-sdk/rpc", () => ({
  Server: vi.fn().mockImplementation(() => ({
    getLedgerEntries: mockGetLedgerEntries,
  })),
}));

vi.mock("@stellar/stellar-sdk", () => ({
  xdr: {},
}));

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: {
      network: "testnet",
      sorobanRpcUrl: "https://soroban-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
}));

vi.mock("../utils", () => ({
  getCache: vi.fn().mockReturnValue(null),
  setCache: vi.fn(),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockLedgerKey = {
  toXDR: vi.fn().mockReturnValue("bW9ja2xlZGdlcmtleQ=="),
};

const mockEntry = {
  key: mockLedgerKey,
  val: { type: "contractData", value: "test" },
  lastModifiedLedgerSeq: 100,
  liveUntilLedgerSeq: 200,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useLedgerEntry", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const utils = await import("../utils");
    vi.mocked(utils.getCache).mockReturnValue(null);
  });

  it("returns idle initial state when ledgerKey is null", () => {
    const { result } = renderHook(() => useLedgerEntry(null));

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastFetchedAt).toBeNull();
    expect(typeof result.current.refetch).toBe("function");
    expect(mockGetLedgerEntries).not.toHaveBeenCalled();
  });

  it("returns idle initial state when ledgerKey is undefined", () => {
    const { result } = renderHook(() => useLedgerEntry(undefined));

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockGetLedgerEntries).not.toHaveBeenCalled();
  });

  it("fetches ledger entry on mount and returns data on success", async () => {
    mockGetLedgerEntries.mockResolvedValueOnce({ entries: [mockEntry] });

    const { result } = renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useLedgerEntry(mockLedgerKey as any),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(mockEntry);
    expect(result.current.error).toBeNull();
    expect(mockGetLedgerEntries).toHaveBeenCalledTimes(1);
    expect(mockGetLedgerEntries).toHaveBeenCalledWith(mockLedgerKey);
  });

  it("sets lastFetchedAt timestamp after a successful fetch", async () => {
    const before = new Date();
    mockGetLedgerEntries.mockResolvedValueOnce({ entries: [mockEntry] });

    const { result } = renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useLedgerEntry(mockLedgerKey as any),
    );

    await waitFor(() => expect(result.current.lastFetchedAt).not.toBeNull());

    expect(result.current.lastFetchedAt!.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
  });

  it("sets data to null and no error when RPC returns empty entries", async () => {
    mockGetLedgerEntries.mockResolvedValueOnce({ entries: [] });

    const { result } = renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useLedgerEntry(mockLedgerKey as any),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.lastFetchedAt).not.toBeNull();
  });

  it("sets error state when getLedgerEntries throws", async () => {
    mockGetLedgerEntries.mockRejectedValueOnce(new Error("RPC connection refused"));

    const { result } = renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useLedgerEntry(mockLedgerKey as any),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("RPC connection refused");
    expect(result.current.data).toBeNull();
  });

  it("wraps non-Error rejections in an Error object", async () => {
    mockGetLedgerEntries.mockRejectedValueOnce("string error");

    const { result } = renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useLedgerEntry(mockLedgerKey as any),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("string error");
  });

  it("does not fetch when enabled is false", () => {
    const { result } = renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useLedgerEntry(mockLedgerKey as any, { enabled: false }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(mockGetLedgerEntries).not.toHaveBeenCalled();
  });

  it("serves cached data without calling RPC", async () => {
    const utils = await import("../utils");
    vi.mocked(utils.getCache).mockReturnValue(mockEntry);

    const { result } = renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useLedgerEntry(mockLedgerKey as any),
    );

    await waitFor(() => expect(result.current.data).toEqual(mockEntry));

    expect(mockGetLedgerEntries).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it("stores fetched entry in cache with default TTL", async () => {
    const utils = await import("../utils");
    mockGetLedgerEntries.mockResolvedValueOnce({ entries: [mockEntry] });

    const { result } = renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useLedgerEntry(mockLedgerKey as any),
    );

    await waitFor(() => expect(result.current.data).toEqual(mockEntry));

    expect(vi.mocked(utils.setCache)).toHaveBeenCalledWith(
      expect.stringContaining("ledger-entry-"),
      mockEntry,
      60000,
    );
  });

  it("stores fetched entry in cache with custom cacheTTL", async () => {
    const utils = await import("../utils");
    mockGetLedgerEntries.mockResolvedValueOnce({ entries: [mockEntry] });

    const { result } = renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useLedgerEntry(mockLedgerKey as any, { cacheTTL: 5000 }),
    );

    await waitFor(() => expect(result.current.data).toEqual(mockEntry));

    expect(vi.mocked(utils.setCache)).toHaveBeenCalledWith(
      expect.any(String),
      mockEntry,
      5000,
    );
  });

  it("includes network name in the cache key to prevent cross-network collisions", async () => {
    const utils = await import("../utils");
    mockGetLedgerEntries.mockResolvedValueOnce({ entries: [mockEntry] });

    const { result } = renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useLedgerEntry(mockLedgerKey as any),
    );

    await waitFor(() => expect(result.current.data).toEqual(mockEntry));

    const cacheKey = vi.mocked(utils.setCache).mock.calls[0]?.[0] as string;
    expect(cacheKey).toContain("testnet");
  });

  it("refetch() bypasses cache and calls RPC again", async () => {
    const utils = await import("../utils");
    mockGetLedgerEntries.mockResolvedValue({ entries: [mockEntry] });

    const { result } = renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useLedgerEntry(mockLedgerKey as any),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetLedgerEntries).toHaveBeenCalledTimes(1);

    vi.mocked(utils.getCache).mockReturnValue(mockEntry);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockGetLedgerEntries).toHaveBeenCalledTimes(2);
  });

  it("refetch() bypasses cache even when called within the TTL window", async () => {
    const utils = await import("../utils");
    mockGetLedgerEntries.mockResolvedValue({ entries: [mockEntry] });

    // First fetch populates the in-memory cache
    const { result } = renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useLedgerEntry(mockLedgerKey as any),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetLedgerEntries).toHaveBeenCalledTimes(1);
    expect(vi.mocked(utils.setCache)).toHaveBeenCalledTimes(1);

    // Simulate a warm cache — data is still within the TTL window
    vi.mocked(utils.getCache).mockReturnValue(mockEntry);

    // Calling refetch() must bypass the cache and hit the RPC server again,
    // regardless of the TTL.  If cache bypass is broken, getCache will
    // return the stale entry and getLedgerEntries won't be called a second time.
    await act(async () => {
      await result.current.refetch();
    });

    expect(
      mockGetLedgerEntries,
      "refetch() should bypass the in-memory cache and call RPC again",
    ).toHaveBeenCalledTimes(2);
  });

  it("polls RPC on the refetchInterval", async () => {
    vi.useFakeTimers();
    mockGetLedgerEntries.mockResolvedValue({ entries: [mockEntry] });

    renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useLedgerEntry(mockLedgerKey as any, { refetchInterval: 1000 }),
    );

    // Flush the initial mount effect and its async fetch
    await act(async () => { await Promise.resolve(); });
    expect(mockGetLedgerEntries).toHaveBeenCalledTimes(1);

    // Advance by one interval tick and flush pending microtasks
    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    expect(mockGetLedgerEntries.mock.calls.length).toBeGreaterThanOrEqual(2);

    vi.useRealTimers();
  });

  it("does not poll when refetchInterval is 0 (default)", async () => {
    vi.useFakeTimers();
    mockGetLedgerEntries.mockResolvedValue({ entries: [mockEntry] });

    renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useLedgerEntry(mockLedgerKey as any),
    );

    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    // Only the initial mount fetch — no extra interval calls
    expect(mockGetLedgerEntries.mock.calls.length).toBeLessThanOrEqual(1);

    vi.useRealTimers();
  });

  it("re-fetches when ledgerKey changes", async () => {
    const anotherKey = { toXDR: vi.fn().mockReturnValue("YW5vdGhlcmtleQ==") };
    mockGetLedgerEntries.mockResolvedValue({ entries: [mockEntry] });

    // Use a closure variable so rerender() picks up the new key
    let currentKey: typeof mockLedgerKey | typeof anotherKey = mockLedgerKey;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { rerender } = renderHook(() => useLedgerEntry(currentKey as any));

    await waitFor(() => expect(mockGetLedgerEntries).toHaveBeenCalledTimes(1));
    expect(mockGetLedgerEntries).toHaveBeenLastCalledWith(mockLedgerKey);

    currentKey = anotherKey;
    rerender();

    await waitFor(() => expect(mockGetLedgerEntries).toHaveBeenCalledTimes(2));
    expect(mockGetLedgerEntries).toHaveBeenLastCalledWith(anotherKey);
  });
});
