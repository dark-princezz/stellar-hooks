/**
 * @file useEffects.test.ts
 * @description Unit tests for the useEffects hook.
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
    useReducer: vi.fn(),
    useEffect: vi.fn(),
    useRef: vi.fn().mockImplementation((initial) => ({ current: initial })),
  };
});

// ─── Mock @stellar/stellar-sdk ────────────────────────────────────────────────

const mockCall = vi.fn();
const mockStream = vi.fn();
const mockForAccount = vi.fn();
const mockEffects = vi.fn();
const mockClose = vi.fn();

vi.mock("@stellar/stellar-sdk", () => ({
  Horizon: {
    Server: vi.fn().mockImplementation(function MockHorizonServer() {
      return {
        effects: mockEffects,
      };
    }),
  },
}));

// ─── Mock context ─────────────────────────────────────────────────────────────

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
}));

// ─── Import AFTER mocks ───────────────────────────────────────────────────────

import { useEffects } from "../hooks/useEffects";
import { useReducer, useEffect } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockDispatch = vi.fn();

const sampleEffects = [
  {
    id: "effect-1",
    paging_token: "token-1",
    account: "GABC...",
    type: "account_created",
    type_i: 0,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "effect-2",
    paging_token: "token-2",
    account: "GABC...",
    type: "account_credited",
    type_i: 2,
    created_at: "2024-01-02T00:00:00Z",
  },
] as unknown as import("@stellar/stellar-sdk").Horizon.ServerApi.EffectRecord[];

function setupReducer(stateOverride = {}) {
  vi.mocked(useReducer).mockReturnValue([
    {
      effects: [],
      isLoading: false,
      isStreaming: false,
      error: null,
      lastFetchedAt: null,
      ...stateOverride,
    },
    mockDispatch,
  ] as unknown as ReturnType<typeof useReducer>);
}

function setupHorizonMocks() {
  mockEffects.mockReturnValue({
    forAccount: mockForAccount,
  });
  mockForAccount.mockReturnValue({
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    cursor: vi.fn().mockReturnThis(),
    call: mockCall,
    stream: mockStream,
  });
  mockStream.mockReturnValue(mockClose);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useEffects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupReducer();
    setupHorizonMocks();
    vi.mocked(useEffect).mockImplementation(() => {});
  });

  it("returns correct initial state", () => {
    const hook = useEffects("GABC...");

    expect(hook.effects).toEqual([]);
    expect(hook.isLoading).toBe(false);
    expect(hook.isStreaming).toBe(false);
    expect(hook.error).toBeNull();
    expect(hook.lastFetchedAt).toBeNull();
    expect(typeof hook.refetch).toBe("function");
    expect(typeof hook.stop).toBe("function");
    expect(typeof hook.start).toBe("function");
  });

  it("returns effects from state when present", () => {
    setupReducer({ effects: sampleEffects });
    const hook = useEffects("GABC...");

    expect(hook.effects).toEqual(sampleEffects);
  });

  it("returns isLoading true when state is loading", () => {
    setupReducer({ isLoading: true });
    const hook = useEffects("GABC...");

    expect(hook.isLoading).toBe(true);
  });

  it("returns isStreaming true when stream is active", () => {
    setupReducer({ isStreaming: true });
    const hook = useEffects("GABC...");

    expect(hook.isStreaming).toBe(true);
  });

  it("dispatches FETCH_START then FETCH_SUCCESS on refetch", async () => {
    mockCall.mockResolvedValueOnce({ records: sampleEffects });
    const hook = useEffects("GABC...");

    await hook.refetch();

    expect(mockDispatch).toHaveBeenCalledWith({ type: "FETCH_START" });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "FETCH_SUCCESS",
      payload: sampleEffects,
    });
  });

  it("dispatches FETCH_ERROR when call throws", async () => {
    mockCall.mockRejectedValueOnce(new Error("Horizon error"));
    const hook = useEffects("GABC...");

    await hook.refetch();

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "FETCH_ERROR",
      payload: expect.any(Error),
    });
  });

  it("passes forAccount, limit, and order to Horizon", async () => {
    mockCall.mockResolvedValueOnce({ records: [] });
    const hook = useEffects("GABC...", { limit: 50, order: "asc" });

    await hook.refetch();

    expect(mockEffects).toHaveBeenCalled();
    expect(mockForAccount).toHaveBeenCalledWith("GABC...");
    const builder = mockForAccount.mock.results[0]?.value;
    expect(builder?.limit).toHaveBeenCalledWith(50);
    expect(builder?.order).toHaveBeenCalledWith("asc");
  });

  it("starts Horizon SSE stream on start", () => {
    const hook = useEffects("GABC...");

    hook.start();

    expect(mockStream).toHaveBeenCalledWith(
      expect.objectContaining({
        onmessage: expect.any(Function),
        onerror: expect.any(Function),
      })
    );
    expect(mockDispatch).toHaveBeenCalledWith({ type: "STREAMING", payload: true });
  });

  it("closes stream on stop", () => {
    const hook = useEffects("GABC...");

    hook.start();
    hook.stop();

    expect(mockClose).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({ type: "STREAMING", payload: false });
  });

  it("does not refetch when publicKey is missing", async () => {
    const hook = useEffects(null);

    await hook.refetch();

    expect(mockCall).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
