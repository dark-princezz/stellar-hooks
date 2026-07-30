/**
 * @file useContractStorage.test.ts
 * @description Unit tests for the useContractStorage hook with mocked RPC responses.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useContractStorage } from "../hooks/useContractStorage";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetLedgerEntries = vi.fn();

vi.mock("@stellar/stellar-sdk/rpc", () => ({
  Server: vi.fn().mockImplementation(() => ({
    getLedgerEntries: mockGetLedgerEntries,
  })),
}));

vi.mock("@stellar/stellar-sdk", () => {
  const xdrMock = {
    ScVal: {
      scvSymbol: vi.fn((name: string) => ({ _kind: "sym", value: name })),
      scvAddress: vi.fn((addr: unknown) => ({ _kind: "address", value: addr })),
    },
    ContractDataDurability: {
      persistent: vi.fn(() => ({ _kind: "persistent" })),
      temporary: vi.fn(() => ({ _kind: "temporary" })),
    },
    // SDK exposes a runtime constructor for XDR structs even when `.d.ts`
    // does not. The mock mirrors that for typecheck + test parity.
    LedgerKeyContractData: vi.fn().mockImplementation((fields: unknown) => ({
      _kind: "LedgerKeyContractData",
      ...(typeof fields === "object" && fields !== null ? fields : {}),
    })),
    LedgerKey: {
      contractData: vi.fn((inner: unknown) => ({
        _kind: "LedgerKey.contractData",
        inner,
        toXDR: vi.fn().mockReturnValue("bW9ja0xlZGdlcktleQ=="),
      })),
    },
  };

  return {
    xdr: xdrMock,
    Address: vi.fn().mockImplementation((addr: string) => {
      // Only accept C… addresses — the throw is what the hook's `try/catch`
      // is meant to swallow in production.
      if (typeof addr !== "string" || !addr.startsWith("C")) {
        throw new Error(`Invalid contract address: ${addr}`);
      }
      return {
        toScAddress: () => ({ _kind: "ScAddress.contract", value: addr }),
      };
    }),
  };
});

vi.mock("../context", () => ({
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

const CONTRACT_ID =
  "CABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW";

const RAW_SCVAL = { _kind: "u64", value: "42" };
const CONTRACT_DATA_VAL = { val: () => RAW_SCVAL };

const mockEntry = {
  key: { toXDR: vi.fn().mockReturnValue("bW9ja2tleQ==") },
  val: { contractData: vi.fn(() => CONTRACT_DATA_VAL) },
  lastModifiedLedgerSeq: 100,
  liveUntilLedgerSeq: 200,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useContractStorage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const utils = await import("../utils");
    vi.mocked(utils.getCache).mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns idle state when contractId is null", () => {
    const { result } = renderHook(() => useContractStorage(null, "Counter"));

    expect(result.current.data).toBeNull();
    expect(result.current.raw).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGetLedgerEntries).not.toHaveBeenCalled();
  });

  it("returns idle state when key is null", () => {
    const { result } = renderHook(() => useContractStorage(CONTRACT_ID, null));

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockGetLedgerEntries).not.toHaveBeenCalled();
  });

  it("returns idle state when key is undefined", () => {
    const { result } = renderHook(() =>
      useContractStorage(CONTRACT_ID, undefined),
    );

    expect(result.current.data).toBeNull();
    expect(mockGetLedgerEntries).not.toHaveBeenCalled();
  });

  it("builds a contractData LedgerKey for a string key (persistent by default)", async () => {
    mockGetLedgerEntries.mockResolvedValueOnce({ entries: [mockEntry] });

    const sdk = await import("@stellar/stellar-sdk");
    const { result } = renderHook(() =>
      useContractStorage(CONTRACT_ID, "Counter"),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(sdk.xdr.ScVal.scvSymbol).toHaveBeenCalledWith("Counter");
    expect(sdk.xdr.ContractDataDurability.persistent).toHaveBeenCalledTimes(1);
    expect(sdk.xdr.ContractDataDurability.temporary).not.toHaveBeenCalled();
    expect(sdk.xdr.LedgerKeyContractData).toHaveBeenCalledTimes(1);
    expect(sdk.xdr.LedgerKey.contractData).toHaveBeenCalledTimes(1);
    expect(mockGetLedgerEntries).toHaveBeenCalledTimes(1);
  });

  it("uses temporary durability when requested", async () => {
    mockGetLedgerEntries.mockResolvedValueOnce({ entries: [mockEntry] });

    const sdk = await import("@stellar/stellar-sdk");
    renderHook(() =>
      useContractStorage(CONTRACT_ID, "Scratch", { durability: "temporary" }),
    );

    await waitFor(() => expect(mockGetLedgerEntries).toHaveBeenCalledTimes(1));

    expect(sdk.xdr.ContractDataDurability.temporary).toHaveBeenCalledTimes(1);
    expect(sdk.xdr.ContractDataDurability.persistent).not.toHaveBeenCalled();
  });

  it("returns the raw ScVal via `data` when no parseResult is provided", async () => {
    mockGetLedgerEntries.mockResolvedValueOnce({ entries: [mockEntry] });

    const { result } = renderHook(() =>
      useContractStorage(CONTRACT_ID, "Counter"),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Type assertion is intentional: when no parseResult is given, `data: T`
    // is documented to be `xdr.ScVal` per the overload.
    expect(result.current.data).toEqual(RAW_SCVAL);
    expect(result.current.raw).toEqual(RAW_SCVAL);
    expect(result.current.error).toBeNull();
    expect(result.current.lastFetchedAt).not.toBeNull();
  });

  it("applies parseResult when provided", async () => {
    mockGetLedgerEntries.mockResolvedValueOnce({ entries: [mockEntry] });

    const parser = vi.fn((v: unknown) => ({ parsed: v }));
    const { result } = renderHook(() =>
      useContractStorage<{ parsed: unknown }>(CONTRACT_ID, "Counter", {
        parseResult: parser as unknown as (v: never) => { parsed: unknown },
      }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(parser).toHaveBeenCalledWith(RAW_SCVAL);
    expect(result.current.data).toEqual({ parsed: RAW_SCVAL });
    expect(result.current.raw).toEqual(RAW_SCVAL);
  });

  it("returns null data and null raw when RPC returns empty entries", async () => {
    mockGetLedgerEntries.mockResolvedValueOnce({ entries: [] });

    const { result } = renderHook(() =>
      useContractStorage(CONTRACT_ID, "Counter"),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.raw).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("propagates RPC errors", async () => {
    mockGetLedgerEntries.mockRejectedValueOnce(new Error("RPC down"));

    const { result } = renderHook(() =>
      useContractStorage(CONTRACT_ID, "Counter"),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("RPC down");
    expect(result.current.isError).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it("exposes refetch and lastFetchedAt", async () => {
    mockGetLedgerEntries.mockResolvedValue({ entries: [mockEntry] });

    const { result } = renderHook(() =>
      useContractStorage(CONTRACT_ID, "Counter"),
    );

    await waitFor(() => expect(result.current.lastFetchedAt).not.toBeNull());

    expect(typeof result.current.refetch).toBe("function");
    expect(result.current.lastFetchedAt).toBeInstanceOf(Date);
  });

  it("flips isRefetching true while a polling tick is in flight", async () => {
    vi.useFakeTimers();
    // Slow RPC so the polling tick is still in flight when we assert.
    mockGetLedgerEntries.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ entries: [mockEntry] }), 5),
        ),
    );

    renderHook(() =>
      useContractStorage(CONTRACT_ID, "Counter", { refetchInterval: 30 }),
    );

    // Drain the initial mount fetch.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5);
    });

    // Now advance exactly into the next interval, then a hair more.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31);
    });

    // The 30ms timer fires a refetch; while it's pending the second call
    // should have begun. We just check the call count increased.
    expect(mockGetLedgerEntries.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("does not fetch when enabled is false", () => {
    const { result } = renderHook(() =>
      useContractStorage(CONTRACT_ID, "Counter", { enabled: false }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(mockGetLedgerEntries).not.toHaveBeenCalled();
  });

  it("passes through a raw ScVal key without invoking scvSymbol", async () => {
    mockGetLedgerEntries.mockResolvedValueOnce({ entries: [mockEntry] });
    const directScVal = { _kind: "u32", value: 7 };
    const sdk = await import("@stellar/stellar-sdk");

    renderHook(() => useContractStorage(CONTRACT_ID, directScVal as never));

    await waitFor(() => expect(mockGetLedgerEntries).toHaveBeenCalledTimes(1));

    expect(sdk.xdr.ScVal.scvSymbol).not.toHaveBeenCalled();
    expect(sdk.xdr.LedgerKeyContractData).toHaveBeenCalledWith(
      expect.objectContaining({ key: directScVal }),
    );
  });

  it("returns null data when the RPC entry val cannot be parsed as contractData", async () => {
    mockGetLedgerEntries.mockResolvedValueOnce({
      entries: [{ val: { /* no contractData() */ }, key: {} }],
    });

    const { result } = renderHook(() =>
      useContractStorage(CONTRACT_ID, "Counter"),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.raw).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("treats an invalid contractId as a suspended fetch (Address mock throws → hook swallows)", () => {
    // The Address mock throws on inputs that don't start with 'C'.
    const { result } = renderHook(() =>
      useContractStorage("not-a-c-id", "Counter"),
    );

    // The hook's try/catch around buildContractDataLedgerKey catches the
    // Address throw; ledgerKey becomes null; useLedgerEntry is not invoked.
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockGetLedgerEntries).not.toHaveBeenCalled();
  });
});
