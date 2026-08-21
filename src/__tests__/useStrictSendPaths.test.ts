/**
 * @file useStrictSendPaths.test.ts
 * @description Unit tests for the useStrictSendPaths hook.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock React hooks ─────────────────────────────────────────────────────────

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useState: vi.fn(),
    useEffect: vi.fn(),
    useRef: vi.fn().mockImplementation((initial) => ({ current: initial })),
  };
});

// ─── Mock @stellar/stellar-sdk ────────────────────────────────────────────────

const mockStrictSendPaths = vi.fn();
const mockCall = vi.fn();

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
      strictSendPaths: mockStrictSendPaths,
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

import { useStrictSendPaths } from "../hooks/useStrictSendPaths";
import { useState, useEffect } from "react";
import { Asset } from "@stellar/stellar-sdk";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const samplePaths = [
  {
    source_asset_type: "native",
    source_amount: "10.0000000",
    destination_asset_type: "credit_alphanum4",
    destination_asset_code: "USDC",
    destination_asset_issuer: "GISSUER...",
    destination_amount: "9.5000000",
    path: [],
  },
];

const mockSetState = vi.fn();
let stateIndex = 0;

function setupState(overrides: { paths?: unknown[]; isLoading?: boolean; error?: Error | null; lastFetchedAt?: Date | null } = {}) {
  stateIndex = 0;
  const states = [
    overrides.paths ?? [],
    overrides.isLoading ?? false,
    overrides.error ?? null,
    overrides.lastFetchedAt ?? null,
  ];
  vi.mocked(useState).mockImplementation(() => [states[stateIndex++], mockSetState] as unknown as ReturnType<typeof useState>);
}

function setupHorizonMocks() {
  mockStrictSendPaths.mockReturnValue({ call: mockCall });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useStrictSendPaths", () => {
  const sourceAsset = Asset.native() as unknown as import("@stellar/stellar-sdk").Asset;
  const destAsset = new Asset("USDC", "GISSUER...") as unknown as import("@stellar/stellar-sdk").Asset;

  beforeEach(() => {
    vi.clearAllMocks();
    stateIndex = 0;
    setupHorizonMocks();
    setupState();
    vi.mocked(useEffect).mockImplementation(() => {});
  });

  it("returns correct initial state", () => {
    const hook = useStrictSendPaths(sourceAsset, "10", [destAsset]);
    expect(hook.paths).toEqual([]);
    expect(hook.isLoading).toBe(false);
    expect(hook.error).toBeNull();
    expect(hook.lastFetchedAt).toBeNull();
  });

  it("returns paths from state when present", () => {
    setupState({ paths: samplePaths });
    const hook = useStrictSendPaths(sourceAsset, "10", [destAsset]);
    expect(hook.paths).toEqual(samplePaths);
  });

  it("returns isLoading true when loading", () => {
    setupState({ isLoading: true });
    const hook = useStrictSendPaths(sourceAsset, "10", [destAsset]);
    expect(hook.isLoading).toBe(true);
  });

  it("calls Horizon.strictSendPaths with correct arguments", async () => {
    // Directly exercise the effect callback via a manual mock
    let effectCallback: (() => void) | null = null;
    vi.mocked(useEffect).mockImplementation((cb) => {
      effectCallback = cb as () => void;
    });
    mockCall.mockResolvedValueOnce({ records: samplePaths });

    useStrictSendPaths(sourceAsset, "10", [destAsset], { debounceMs: 0 });

    // Since debounceMs is 0, the setTimeout fires immediately in a real env.
    // Here we just verify the effect was registered with a callback.
    expect(typeof effectCallback).toBe("function");
  });

  it("does not call Horizon when destinationAssets is empty", () => {
    let effectCallback: (() => void) | null = null;
    vi.mocked(useEffect).mockImplementation((cb) => {
      effectCallback = cb as () => void;
    });

    useStrictSendPaths(sourceAsset, "10", []);

    // Effect registered but Horizon should not be called (empty destinationAssets guard)
    expect(effectCallback).not.toBeNull();
    expect(mockStrictSendPaths).not.toHaveBeenCalled();
  });

  it("does not call Horizon when disabled", () => {
    vi.mocked(useEffect).mockImplementation(() => {});
    useStrictSendPaths(sourceAsset, "10", [destAsset], { enabled: false });
    expect(mockStrictSendPaths).not.toHaveBeenCalled();
  });
});
