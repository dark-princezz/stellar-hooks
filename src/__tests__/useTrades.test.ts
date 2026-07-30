/**
 * @file useTrades.test.ts
 * @description Unit tests for the useTrades hook.
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

const mockForAccount = vi.fn().mockReturnThis();
const mockForAssetPair = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockReturnThis();
const mockLimit = vi.fn().mockReturnThis();
const mockCursor = vi.fn().mockReturnThis();
const mockCall = vi.fn();
const mockTrades = vi.fn();

vi.mock("@stellar/stellar-sdk", () => ({
  Asset: Object.assign(
    vi.fn().mockImplementation((code: string, issuer: string) => ({
      toString: () => `${code}:${issuer}`,
    })),
    {
      native: vi.fn().mockReturnValue({ toString: () => "native" }),
    }
  ),
  Horizon: {
    Server: vi.fn().mockImplementation(() => ({
      trades: mockTrades,
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

import { useTrades } from "../hooks/useTrades";
import { useState, useEffect } from "react";
import { Asset } from "@stellar/stellar-sdk";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sampleTrades = [
  {
    id: "trade-1",
    paging_token: "tok-1",
    ledger_close_time: "2024-01-01T00:00:00Z",
    trade_type: "orderbook",
    base_amount: "10.0000000",
    base_asset_type: "native",
    counter_amount: "9.5000000",
    counter_asset_type: "credit_alphanum4",
    counter_asset_code: "USDC",
    counter_asset_issuer: "GISSUER...",
    base_is_seller: true,
  },
];

const mockSetState = vi.fn();
let stateIndex = 0;

function setupState(overrides: { trades?: unknown[]; isLoading?: boolean; error?: Error | null; lastFetchedAt?: Date | null } = {}) {
  stateIndex = 0;
  const states = [
    overrides.trades ?? [],
    overrides.isLoading ?? false,
    overrides.error ?? null,
    overrides.lastFetchedAt ?? null,
  ];
  vi.mocked(useState).mockImplementation(() => [states[stateIndex++], mockSetState] as unknown as ReturnType<typeof useState>);
}

function setupHorizonMocks() {
  const chainable = {
    forAccount: mockForAccount,
    forAssetPair: mockForAssetPair,
    order: mockOrder,
    limit: mockLimit,
    cursor: mockCursor,
    call: mockCall,
  };

  mockTrades.mockReturnValue(chainable);
  mockForAccount.mockReturnValue(chainable);
  mockForAssetPair.mockReturnValue(chainable);
  mockOrder.mockReturnValue(chainable);
  mockLimit.mockReturnValue(chainable);
  mockCursor.mockReturnValue(chainable);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useTrades", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stateIndex = 0;
    setupHorizonMocks();
    setupState();
    vi.mocked(useEffect).mockImplementation(() => {});
  });

  it("returns correct initial state", () => {
    const hook = useTrades("GABC...");
    expect(hook.trades).toEqual([]);
    expect(hook.isLoading).toBe(false);
    expect(hook.error).toBeNull();
    expect(hook.lastFetchedAt).toBeNull();
    expect(typeof hook.refetch).toBe("function");
  });

  it("returns trades when present in state", () => {
    setupState({ trades: sampleTrades });
    const hook = useTrades("GABC...");
    expect(hook.trades).toEqual(sampleTrades);
  });

  it("returns isLoading true when loading", () => {
    setupState({ isLoading: true });
    const hook = useTrades("GABC...");
    expect(hook.isLoading).toBe(true);
  });

  it("does not refetch when publicKey is null", async () => {
    const hook = useTrades(null);
    await hook.refetch();
    expect(mockCall).not.toHaveBeenCalled();
  });

  it("calls forAccount with the provided publicKey", async () => {
    mockCall.mockResolvedValueOnce({ records: sampleTrades });
    const hook = useTrades("GABC...");
    await hook.refetch();
    expect(mockForAccount).toHaveBeenCalledWith("GABC...");
  });

  it("applies order and limit options", async () => {
    mockCall.mockResolvedValueOnce({ records: [] });
    const hook = useTrades("GABC...", { limit: 25, order: "asc" });
    await hook.refetch();
    expect(mockOrder).toHaveBeenCalledWith("asc");
    expect(mockLimit).toHaveBeenCalledWith(25);
  });

  it("applies cursor when provided", async () => {
    mockCall.mockResolvedValueOnce({ records: [] });
    const hook = useTrades("GABC...", { cursor: "tok123" });
    await hook.refetch();
    expect(mockCursor).toHaveBeenCalledWith("tok123");
  });

  it("calls forAssetPair when baseAsset is provided", async () => {
    mockCall.mockResolvedValueOnce({ records: [] });
    const base = Asset.native();
    const counter = new Asset("USDC", "GISSUER...");
    const hook = useTrades("GABC...", { baseAsset: base as unknown as import("@stellar/stellar-sdk").Asset, counterAsset: counter as unknown as import("@stellar/stellar-sdk").Asset });
    await hook.refetch();
    expect(mockForAssetPair).toHaveBeenCalled();
  });

  it("sets error state on Horizon failure", async () => {
    mockCall.mockRejectedValueOnce(new Error("network error"));
    const hook = useTrades("GABC...");
    await hook.refetch();
    expect(mockSetState).toHaveBeenCalledWith(expect.any(Error));
  });
});
