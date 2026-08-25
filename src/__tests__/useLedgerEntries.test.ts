/**
 * @file useLedgerEntries.test.ts
 * @description Unit tests for the useLedgerEntries hook.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useLedgerEntries } from "../hooks/useLedgerEntries";

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

const mockLedgerKey1 = {
  toXDR: vi.fn().mockReturnValue("key1Base64"),
};

const mockLedgerKey2 = {
  toXDR: vi.fn().mockReturnValue("key2Base64"),
};

const mockEntry1 = {
  key: mockLedgerKey1,
  val: { type: "contractData", value: "test1" },
  lastModifiedLedgerSeq: 100,
};

const mockEntry2 = {
  key: mockLedgerKey2,
  val: { type: "contractData", value: "test2" },
  lastModifiedLedgerSeq: 101,
};

describe("useLedgerEntries", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const utils = await import("../utils");
    vi.mocked(utils.getCache).mockReturnValue(null);
  });

  it("returns idle state when ledgerKeys is null or empty", () => {
    const { result } = renderHook(() => useLedgerEntries(null));
    expect(result.current.data).toBeNull();
    expect(result.current.entries).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockGetLedgerEntries).not.toHaveBeenCalled();

    const { result: emptyResult } = renderHook(() => useLedgerEntries([]));
    expect(emptyResult.current.data).toBeNull();
    expect(emptyResult.current.entries).toBeNull();
    expect(emptyResult.current.isLoading).toBe(false);
    expect(mockGetLedgerEntries).not.toHaveBeenCalled();
  });

  it("fetches ledger entries on mount and returns data on success", async () => {
    mockGetLedgerEntries.mockResolvedValueOnce({ entries: [mockEntry1, mockEntry2] });

    const { result } = renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useLedgerEntries([mockLedgerKey1, mockLedgerKey2] as any),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([mockEntry1, mockEntry2]);
    expect(result.current.entries).toEqual([mockEntry1, mockEntry2]);
    expect(result.current.error).toBeNull();
    expect(mockGetLedgerEntries).toHaveBeenCalledTimes(1);
    expect(mockGetLedgerEntries).toHaveBeenCalledWith(mockLedgerKey1, mockLedgerKey2);
  });

  it("sets lastFetchedAt timestamp after a successful fetch", async () => {
    const before = new Date();
    mockGetLedgerEntries.mockResolvedValueOnce({ entries: [mockEntry1] });

    const { result } = renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useLedgerEntries([mockLedgerKey1] as any),
    );

    await waitFor(() => expect(result.current.lastFetchedAt).not.toBeNull());

    expect(result.current.lastFetchedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it("handles RPC errors gracefully", async () => {
    mockGetLedgerEntries.mockRejectedValueOnce(new Error("Soroban RPC error"));

    const { result } = renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useLedgerEntries([mockLedgerKey1] as any),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Soroban RPC error");
    expect(result.current.data).toBeNull();
  });

  it("refetch() bypasses cache and fetches again", async () => {
    mockGetLedgerEntries.mockResolvedValue({ entries: [mockEntry1, mockEntry2] });

    const { result } = renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useLedgerEntries([mockLedgerKey1, mockLedgerKey2] as any),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetLedgerEntries).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockGetLedgerEntries).toHaveBeenCalledTimes(2);
  });
});
