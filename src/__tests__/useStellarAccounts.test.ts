/**
 * @file useStellarAccounts.test.ts
 * @description Unit tests for the multi-account useStellarAccounts hook.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useStellarAccounts } from "../hooks/useStellarAccounts";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockLoadAccount = vi.hoisted(() => vi.fn());

vi.mock("../utils/memoizedServers", () => ({
  getHorizonServer: vi.fn().mockReturnValue({ loadAccount: mockLoadAccount }),
  getRpcServer: vi.fn(),
  clearMemoizedServers: vi.fn(),
}));

vi.mock("../context", () => ({
  useStellarContext: () => ({
    config: { horizonUrl: "https://horizon-testnet.stellar.org" },
  }),
}));

vi.mock("@stellar/stellar-sdk", () => ({
  StrKey: {
    isValidEd25519PublicKey: vi.fn((k: unknown) => typeof k === "string" && k.startsWith("G")),
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeResponse(pk: string) {
  return {
    account_id: pk,
    sequence: "1",
    subentry_count: 0,
    thresholds: { low_threshold: 0, med_threshold: 0, high_threshold: 0 },
    flags: {
      auth_required: false,
      auth_revocable: false,
      auth_immutable: false,
      auth_clawback_enabled: false,
    },
    balances: [
      {
        asset_type: "native",
        balance: "100.0000000",
        buying_liabilities: "0.0000000",
        selling_liabilities: "0.0000000",
      },
    ],
  };
}

const KEYS = ["GA", "GB", "GC"];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useStellarAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty accounts when given an empty list", () => {
    const { result } = renderHook(() => useStellarAccounts([]));

    expect(result.current.accounts).toEqual({});
    expect(result.current.isLoading).toBe(false);
    expect(mockLoadAccount).not.toHaveBeenCalled();
  });

  it("fetches all keys in parallel via loadAccount and returns a map by key", async () => {
    mockLoadAccount.mockImplementation(async (pk: string) => makeResponse(pk));

    const { result } = renderHook(() => useStellarAccounts(KEYS));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockLoadAccount).toHaveBeenCalledTimes(3);
    expect(result.current.accounts.GA?.accountId).toBe("GA");
    expect(result.current.accounts.GB?.accountId).toBe("GB");
    expect(result.current.accounts.GC?.accountId).toBe("GC");
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("skips null entries without breaking the batch", async () => {
    mockLoadAccount.mockImplementation(async (pk: string) => makeResponse(pk));

    const { result } = renderHook(() =>
      useStellarAccounts(["GA", null, "GC" as unknown as never]),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockLoadAccount).toHaveBeenCalledTimes(2);
    expect(result.current.accounts.GA?.accountId).toBe("GA");
    expect(result.current.accounts.GC?.accountId).toBe("GC");
    expect(result.current.errors.GA).toBeNull();
    expect(result.current.errors.GC).toBeNull();
  });

  it("captures per-key errors and surfaces them individually + as aggregate", async () => {
    mockLoadAccount.mockImplementation(async (pk: string) => {
      if (pk === "GB") throw new Error("not found");
      return makeResponse(pk);
    });

    const { result } = renderHook(() => useStellarAccounts(["GA", "GB", "GC"]));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.accounts.GA?.accountId).toBe("GA");
    expect(result.current.accounts.GB).toBeNull();
    expect(result.current.accounts.GC?.accountId).toBe("GC");

    expect(result.current.errors.GA).toBeNull();
    expect(result.current.errors.GB?.message).toBe("not found");
    expect(result.current.errors.GC).toBeNull();

    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe("not found");
  });

  it("deduplicates repeated keys before issuing RPC calls", async () => {
    mockLoadAccount.mockImplementation(async (pk: string) => makeResponse(pk));

    const { result } = renderHook(() => useStellarAccounts(["GA", "GA", "GB"]));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockLoadAccount).toHaveBeenCalledTimes(2);
    expect(result.current.accounts.GA?.accountId).toBe("GA");
    expect(result.current.accounts.GB?.accountId).toBe("GB");
  });

  it("treats reordering as no-op (fetchKey is order-independent)", async () => {
    mockLoadAccount.mockImplementation(async (pk: string) => makeResponse(pk));

    const { result, rerender } = renderHook(
      ({ keys }: { keys: string[] }) => useStellarAccounts(keys),
      { initialProps: { keys: ["GA", "GB"] } },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockLoadAccount).toHaveBeenCalledTimes(2);

    rerender({ keys: ["GB", "GA"] });

    // fetchKey is sorted; reorder shouldn't restart the fetch.
    expect(mockLoadAccount).toHaveBeenCalledTimes(2);
  });

  it("does not fetch when enabled is false", () => {
    const { result } = renderHook(() =>
      useStellarAccounts(["GA"], { enabled: false }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(mockLoadAccount).not.toHaveBeenCalled();
  });

  it("polls all keys on the refetchInterval", async () => {
    vi.useFakeTimers();
    mockLoadAccount.mockImplementation(async (pk: string) => makeResponse(pk));

    renderHook(() => useStellarAccounts(KEYS, { refetchInterval: 30 }));

    // Drain the initial mount fetch.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mockLoadAccount).toHaveBeenCalledTimes(3);

    // Advance past one interval tick.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31);
    });
    expect(mockLoadAccount.mock.calls.length).toBeGreaterThan(3);
  });

  it("exposes refetch that re-issues all RPC calls", async () => {
    mockLoadAccount.mockImplementation(async (pk: string) => makeResponse(pk));

    const { result } = renderHook(() => useStellarAccounts(KEYS));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockLoadAccount).toHaveBeenCalledTimes(3);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockLoadAccount).toHaveBeenCalledTimes(6); // 3 + 3
  });
});
