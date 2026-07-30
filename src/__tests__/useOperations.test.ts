/**
 * @file useOperations.test.ts
 * @description Unit tests for the useOperations hook.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock React hooks ─────────────────────────────────────────────────────────

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useCallback: (fn: unknown) => fn,
    useState: vi.fn(),
    useEffect: vi.fn(),
    useRef: vi.fn().mockImplementation((initial) => ({ current: initial })),
  };
});

// ─── Mock @stellar/stellar-sdk ────────────────────────────────────────────────

const mockIncludeFailed = vi.fn().mockReturnThis();
const mockForAccount = vi.fn().mockReturnThis();
const mockForTransaction = vi.fn().mockReturnThis();
const mockCursor = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockReturnThis();
const mockLimit = vi.fn().mockReturnThis();
const mockCall = vi.fn();
const mockOperations = vi.fn();

vi.mock("@stellar/stellar-sdk", () => ({
  Horizon: {
    Server: vi.fn().mockImplementation(() => ({
      operations: mockOperations,
    })),
  },
}));

// ─── Mock context ─────────────────────────────────────────────────────────────

vi.mock("../context", () => ({
  useStellarContext: () => ({
    config: { horizonUrl: "https://horizon-testnet.stellar.org" },
  }),
}));

// ─── Import AFTER mocks ───────────────────────────────────────────────────────

import { useOperations } from "../hooks/useOperations";
import { useState, useEffect } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sampleOperations = [
  {
    id: "op-1",
    paging_token: "token-1",
    type: "payment",
    type_i: 1,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "op-2",
    paging_token: "token-2",
    type: "create_account",
    type_i: 0,
    created_at: "2024-01-02T00:00:00Z",
  },
] as unknown as import("@stellar/stellar-sdk").Horizon.ServerApi.OperationRecord[];

const mockSetState = vi.fn();
let stateIndex = 0;
const stateValues: unknown[] = [[], false, null, null];

function setupHorizonMocks() {
  mockOperations.mockReturnValue({
    order: mockOrder,
    limit: mockLimit,
    includeFailed: mockIncludeFailed,
    cursor: mockCursor,
    forAccount: mockForAccount,
    forTransaction: mockForTransaction,
    call: mockCall,
  });

  mockOrder.mockReturnValue({
    limit: mockLimit,
    includeFailed: mockIncludeFailed,
    cursor: mockCursor,
    forAccount: mockForAccount,
    forTransaction: mockForTransaction,
    call: mockCall,
  });

  mockLimit.mockReturnValue({
    includeFailed: mockIncludeFailed,
    cursor: mockCursor,
    forAccount: mockForAccount,
    forTransaction: mockForTransaction,
    call: mockCall,
  });

  mockIncludeFailed.mockReturnValue({
    cursor: mockCursor,
    forAccount: mockForAccount,
    forTransaction: mockForTransaction,
    call: mockCall,
  });

  mockCursor.mockReturnValue({
    forAccount: mockForAccount,
    forTransaction: mockForTransaction,
    call: mockCall,
  });

  mockForAccount.mockReturnValue({ call: mockCall });
  mockForTransaction.mockReturnValue({ call: mockCall });
}

function setupState(stateOverride: { operations?: unknown[]; isLoading?: boolean; error?: Error | null; lastFetchedAt?: Date | null } = {}) {
  stateIndex = 0;
  const states = [
    stateOverride.operations ?? [],
    stateOverride.isLoading ?? false,
    stateOverride.error ?? null,
    stateOverride.lastFetchedAt ?? null,
  ];
  vi.mocked(useState).mockImplementation(() => [states[stateIndex++], mockSetState] as unknown as ReturnType<typeof useState>);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useOperations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stateIndex = 0;
    setupHorizonMocks();
    setupState();
    vi.mocked(useEffect).mockImplementation(() => {});
  });

  it("returns correct initial state", () => {
    const hook = useOperations({ accountId: "GABC..." });
    expect(hook.operations).toEqual([]);
    expect(hook.isLoading).toBe(false);
    expect(hook.error).toBeNull();
    expect(hook.lastFetchedAt).toBeNull();
    expect(typeof hook.refetch).toBe("function");
  });

  it("returns operations from state when present", () => {
    setupState({ operations: sampleOperations });
    const hook = useOperations({ accountId: "GABC..." });
    expect(hook.operations).toEqual(sampleOperations);
  });

  it("returns isLoading true when state is loading", () => {
    setupState({ isLoading: true });
    const hook = useOperations({ accountId: "GABC..." });
    expect(hook.isLoading).toBe(true);
  });

  it("does not refetch when neither accountId nor transactionHash provided", async () => {
    const hook = useOperations({});
    await hook.refetch();
    expect(mockCall).not.toHaveBeenCalled();
  });

  it("calls forAccount when accountId is provided", async () => {
    mockCall.mockResolvedValueOnce({ records: sampleOperations });
    const hook = useOperations({ accountId: "GABC..." });
    await hook.refetch();
    expect(mockForAccount).toHaveBeenCalledWith("GABC...");
  });

  it("calls forTransaction when transactionHash is provided", async () => {
    mockCall.mockResolvedValueOnce({ records: sampleOperations });
    const hook = useOperations({ transactionHash: "abc123" });
    await hook.refetch();
    expect(mockForTransaction).toHaveBeenCalledWith("abc123");
  });

  it("passes includeFailed=true to the query", async () => {
    mockCall.mockResolvedValueOnce({ records: [] });
    const hook = useOperations({ accountId: "GABC...", includeFailed: true });
    await hook.refetch();
    expect(mockIncludeFailed).toHaveBeenCalledWith(true);
  });

  it("passes includeFailed=false by default", async () => {
    mockCall.mockResolvedValueOnce({ records: [] });
    const hook = useOperations({ accountId: "GABC..." });
    await hook.refetch();
    expect(mockIncludeFailed).toHaveBeenCalledWith(false);
  });

  it("applies cursor when provided", async () => {
    mockCall.mockResolvedValueOnce({ records: [] });
    const hook = useOperations({ accountId: "GABC...", cursor: "tok123" });
    await hook.refetch();
    expect(mockCursor).toHaveBeenCalledWith("tok123");
  });

  it("dispatches FETCH_ERROR state on Horizon error", async () => {
    mockCall.mockRejectedValueOnce(new Error("Horizon error"));
    const hook = useOperations({ accountId: "GABC..." });
    await hook.refetch();
    // error setter should have been called
    expect(mockSetState).toHaveBeenCalledWith(expect.any(Error));
  });

  it("sets limit and order on the query", async () => {
    mockCall.mockResolvedValueOnce({ records: [] });
    const hook = useOperations({ accountId: "GABC...", limit: 50, order: "asc" });
    await hook.refetch();
    expect(mockOrder).toHaveBeenCalledWith("asc");
    expect(mockLimit).toHaveBeenCalledWith(50);
  });
});
