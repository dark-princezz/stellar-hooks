/**
 * @file useOrderBook.test.ts
 * @description Unit tests for the useOrderBook hook.
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

const mockOrderbook = vi.fn();
const mockCall = vi.fn();
const mockLimit = vi.fn();

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
      orderbook: mockOrderbook,
    })),
  },
}));

// ─── Mock context ─────────────────────────────────────────────────────────────

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: { horizonUrl: "https://horizon-testnet.stellar.org" },
  }),
}));

// ─── Import AFTER mocks ───────────────────────────────────────────────────────

import { useOrderBook } from "../hooks/useOrderBook";
import { useState, useEffect } from "react";
import { Asset } from "@stellar/stellar-sdk";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sampleOrderBook = {
  bids: [{ price_r: { n: 1, d: 1 }, price: "1.0000000", amount: "100.0000000" }],
  asks: [{ price_r: { n: 1, d: 1 }, price: "1.0100000", amount: "50.0000000" }],
  base: { asset_type: "native" },
  counter: { asset_type: "credit_alphanum4", asset_code: "USDC", asset_issuer: "GISSUER..." },
};

const mockSetState = vi.fn();
let stateIndex = 0;

function setupState(overrides: { raw?: unknown; isLoading?: boolean; error?: Error | null; lastFetchedAt?: Date | null } = {}) {
  stateIndex = 0;
  const states = [
    overrides.raw ?? null,
    overrides.isLoading ?? false,
    overrides.error ?? null,
    overrides.lastFetchedAt ?? null,
  ];
  vi.mocked(useState).mockImplementation(() => [states[stateIndex++], mockSetState] as unknown as ReturnType<typeof useState>);
}

function setupHorizonMocks() {
  mockLimit.mockReturnValue({ call: mockCall });
  mockOrderbook.mockReturnValue({ limit: mockLimit });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useOrderBook", () => {
  const selling = Asset.native() as unknown as import("@stellar/stellar-sdk").Asset;
  const buying = new Asset("USDC", "GISSUER...") as unknown as import("@stellar/stellar-sdk").Asset;

  beforeEach(() => {
    vi.clearAllMocks();
    stateIndex = 0;
    setupHorizonMocks();
    setupState();
    vi.mocked(useEffect).mockImplementation(() => {});
  });

  it("returns correct initial state when raw is null", () => {
    const hook = useOrderBook(selling, buying);
    expect(hook.bids).toEqual([]);
    expect(hook.asks).toEqual([]);
    expect(hook.raw).toBeNull();
    expect(hook.isLoading).toBe(false);
    expect(hook.error).toBeNull();
    expect(hook.lastFetchedAt).toBeNull();
    expect(typeof hook.refetch).toBe("function");
  });

  it("returns bids and asks from raw when present", () => {
    setupState({ raw: sampleOrderBook });
    const hook = useOrderBook(selling, buying);
    expect(hook.bids).toEqual(sampleOrderBook.bids);
    expect(hook.asks).toEqual(sampleOrderBook.asks);
    expect(hook.raw).toEqual(sampleOrderBook);
  });

  it("returns isLoading true when state is loading", () => {
    setupState({ isLoading: true });
    const hook = useOrderBook(selling, buying);
    expect(hook.isLoading).toBe(true);
  });

  it("calls Horizon.orderbook with the selling and buying assets", async () => {
    mockCall.mockResolvedValueOnce(sampleOrderBook);
    const hook = useOrderBook(selling, buying);
    await hook.refetch();
    expect(mockOrderbook).toHaveBeenCalledWith(selling, buying);
  });

  it("applies the limit option to the orderbook query", async () => {
    mockCall.mockResolvedValueOnce(sampleOrderBook);
    const hook = useOrderBook(selling, buying, { limit: 5 });
    await hook.refetch();
    expect(mockLimit).toHaveBeenCalledWith(5);
  });

  it("sets error state on Horizon failure", async () => {
    mockCall.mockRejectedValueOnce(new Error("network error"));
    const hook = useOrderBook(selling, buying);
    await hook.refetch();
    expect(mockSetState).toHaveBeenCalledWith(expect.any(Error));
  });
});
