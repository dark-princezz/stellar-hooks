/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { Address, StrKey, xdr } from "@stellar/stellar-sdk";
import { useContractStorageEntry } from "./useContractStorageEntry";
import { useLedgerEntry } from "./useLedgerEntry";

// ─── Mocks ──────────────────────────────────────────────────────────────────────

const { mockUseLedgerEntry } = vi.hoisted(() => ({
  mockUseLedgerEntry: vi.fn(),
}));

vi.mock("./useLedgerEntry", () => ({
  useLedgerEntry: (...args: unknown[]) => mockUseLedgerEntry(...args),
}));

const CONTRACT = StrKey.encodeContract(Buffer.alloc(32, 9));
const LEDGER_STATE = {
  data: null as { val: { contractData: () => { val: () => xdr.ScVal } } } | null,
  isLoading: false,
  isRefetching: false,
  error: null,
  lastFetchedAt: new Date(1234),
  refetch: vi.fn().mockResolvedValue(undefined),
};

describe("useContractStorageEntry", () => {
  beforeEach(() => {
    mockUseLedgerEntry.mockReset();
    mockUseLedgerEntry.mockReturnValue({ ...LEDGER_STATE });
  });

  it("builds a persistent contract-data ledger key for string keys", () => {
    renderHook(() => useContractStorageEntry(CONTRACT, "Counter"));

    const [key, options] = mockUseLedgerEntry.mock.calls[0] as [
      xdr.LedgerKey,
      { refetchInterval?: number },
    ];
    expect(key).toBeInstanceOf(xdr.LedgerKey);
    const data = key.contractData();
    expect(data.key()).toEqual(xdr.ScVal.scvSymbol("Counter"));
    expect(data.durability()).toEqual(xdr.ContractDataDurability.persistent());
    expect(data.contract()).toEqual(new Address(CONTRACT).toScAddress());
    expect(options).toEqual({});
  });

  it("supports temporary durability and a raw ScVal key", () => {
    const scValKey = xdr.ScVal.scvU32(99);
    renderHook(() =>
      useContractStorageEntry(CONTRACT, scValKey, { durability: "temporary" }),
    );

    const [key] = mockUseLedgerEntry.mock.calls[0] as [xdr.LedgerKey];
    expect(key.contractData().key()).toEqual(scValKey);
    expect(key.contractData().durability()).toEqual(xdr.ContractDataDurability.temporary());
  });

  it("returns null data while loading / when no entry exists", () => {
    const { result } = renderHook(() => useContractStorageEntry(CONTRACT, "Counter"));
    expect(result.current.data).toBeNull();
    expect(result.current.raw).toBeNull();
    expect(result.current.entry).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("applies parseResult to the raw value", () => {
    const stored = xdr.ScVal.scvU32(42);
    mockUseLedgerEntry.mockReturnValue({
      ...LEDGER_STATE,
      data: { val: { contractData: () => ({ val: () => stored }) } } as any,
    });

    const { result } = renderHook(() =>
      useContractStorageEntry(CONTRACT, "Counter", {
        parseResult: (val) => (val as any).u32(),
      }),
    );
    expect(result.current.data).toBe(42);
    expect(result.current.raw).toBe(stored);
  });

  it("exposes the structured entry", () => {
    const stored = xdr.ScVal.scvU32(7);
    mockUseLedgerEntry.mockReturnValue({
      ...LEDGER_STATE,
      data: { val: { contractData: () => ({ val: () => stored }) } } as any,
    });

    const { result } = renderHook(() => useContractStorageEntry(CONTRACT, "Counter"));
    expect(result.current.entry).toEqual({
      key: xdr.ScVal.scvSymbol("Counter"),
      val: stored,
      contract: CONTRACT,
      durability: "persistent",
    });
  });
});