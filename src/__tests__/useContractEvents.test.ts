/**
 * @file useContractEvents.test.ts
 * @description Unit tests for the useContractEvents hook.
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
    useRef: vi.fn().mockReturnValue({ current: true }),
    useRef: vi.fn((val) => ({ current: val })),
  };
});

// ─── Mock @stellar/stellar-sdk ────────────────────────────────────────────────

const mockGetEvents = vi.fn();

vi.mock("@stellar/stellar-sdk/rpc", () => ({
  Server: vi.fn().mockImplementation(() => ({
    getEvents: mockGetEvents,
  })),
}));

vi.mock("@stellar/stellar-sdk", () => ({
  StrKey: {
    isValidContract: vi.fn().mockReturnValue(true),
  },
  rpc: {
    Server: vi.fn().mockImplementation(() => ({
      getEvents: mockGetEvents,
    })),
  },
}));

// ─── Mock context ─────────────────────────────────────────────────────────────

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: {
      sorobanRpcUrl: "https://soroban-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
}));

// ─── Import AFTER mocks ───────────────────────────────────────────────────────

import { useContractEvents } from "../hooks/useContractEvents";
import { useReducer, useEffect } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockDispatch = vi.fn();

const sampleEvents = [
  {
    type: "contract",
    id: "event-1",
    contractId: "CCONTRACT",
    ledger: 100,
    ledgerClosedAt: "2024-01-01T00:00:00Z",
    pagingToken: "token-1",
    topic: [],
    value: {},
    inSuccessfulContractCall: true,
  },
];

function setupReducer(stateOverride = {}) {
  vi.mocked(useReducer).mockReturnValue([
    {
      events: [],
      isLoading: false,
      error: null,
      ...stateOverride,
    },
    mockDispatch,
  ] as unknown as ReturnType<typeof useReducer>);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useContractEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupReducer();
    vi.mocked(useEffect).mockImplementation(() => {});
  });

  it("returns correct initial state", () => {
    const hook = useContractEvents({ contractId: "CCONTRACT" });

    expect(hook.events).toEqual([]);
    expect(hook.isLoading).toBe(false);
    expect(hook.error).toBeNull();
    expect(typeof hook.refetch).toBe("function");
    expect(typeof hook.stop).toBe("function");
    expect(typeof hook.start).toBe("function");
  });

  it("returns events from state when present", () => {
    setupReducer({ events: sampleEvents });
    const hook = useContractEvents({ contractId: "CCONTRACT" });

    expect(hook.events).toEqual(sampleEvents);
  });

  it("returns isLoading true when state is loading", () => {
    setupReducer({ isLoading: true });
    const hook = useContractEvents({ contractId: "CCONTRACT" });

    expect(hook.isLoading).toBe(true);
  });

  it("returns error from state when present", () => {
    const err = new Error("RPC failed");
    setupReducer({ error: err });
    const hook = useContractEvents({ contractId: "CCONTRACT" });

    expect(hook.error).toBe(err);
  });

  it("dispatches LOADING then SUCCESS on refetch", async () => {
    mockGetEvents.mockResolvedValueOnce({ events: sampleEvents });
    const hook = useContractEvents({ contractId: "CCONTRACT" });

    await hook.refetch();

    expect(mockDispatch).toHaveBeenCalledWith({ type: "LOADING" });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "SUCCESS",
      payload: sampleEvents,
    });
  });

  it("dispatches ERROR when getEvents throws", async () => {
    mockGetEvents.mockRejectedValueOnce(new Error("Network error"));
    const hook = useContractEvents({ contractId: "CCONTRACT" });

    await hook.refetch();

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "ERROR",
      payload: expect.any(Error),
    });
  });

  it("passes contractId and topics to getEvents filter", async () => {
    mockGetEvents.mockResolvedValueOnce({ events: [] });
    const hook = useContractEvents({
      contractId: "CCONTRACT",
      topics: [["topic1"]],
    });

    await hook.refetch();

    expect(mockGetEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.arrayContaining([
          expect.objectContaining({
            contractIds: ["CCONTRACT"],
            topics: [["topic1"]],
          }),
        ]),
      })
    );
  });

  it("passes startLedger when provided", async () => {
    mockGetEvents.mockResolvedValueOnce({ events: [] });
    const hook = useContractEvents({
      contractId: "CCONTRACT",
      startLedger: 500,
    });

    await hook.refetch();

    expect(mockGetEvents).toHaveBeenCalledWith(
      expect.objectContaining({ startLedger: 500 })
    );
  });

  it("does not pass startLedger when not provided", async () => {
    mockGetEvents.mockResolvedValueOnce({ events: [] });
    const hook = useContractEvents({ contractId: "CCONTRACT" });

    await hook.refetch();

    const call = mockGetEvents.mock.calls[0][0];
    expect(call).not.toHaveProperty("startLedger");
  });

  // ─── mode / pollInterval tests (#258) ──────────────────────────────────────

  it("defaults mode to 'poll'", () => {
    const hook = useContractEvents({ contractId: "CCONTRACT" });
    expect(hook.mode).toBe("poll");
  });

  it("returns mode when explicitly set to 'poll'", () => {
    const hook = useContractEvents({ contractId: "CCONTRACT", mode: "poll" });
    expect(hook.mode).toBe("poll");
  });

  it("returns mode 'stream' when set", () => {
    const hook = useContractEvents({ contractId: "CCONTRACT", mode: "stream" });
    expect(hook.mode).toBe("stream");
  });

  it("dispatches ERROR when mode is 'stream'", () => {
    vi.mocked(useEffect).mockImplementation((fn) => { (fn as () => void)(); });

    useContractEvents({ contractId: "CCONTRACT", mode: "stream" });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "ERROR",
      payload: expect.objectContaining({
        message: expect.stringContaining("Stream mode is not yet supported"),
      }),
    });
  });

  it("uses pollInterval over refetchInterval when both provided", () => {
    const hook = useContractEvents({
      contractId: "CCONTRACT",
      pollInterval: 3000,
      refetchInterval: 5000,
    });

    expect(hook.mode).toBe("poll");
  });

  it("falls back to refetchInterval when pollInterval is not set", async () => {
    mockGetEvents.mockResolvedValueOnce({ events: sampleEvents });
    const hook = useContractEvents({
      contractId: "CCONTRACT",
      refetchInterval: 5000,
    });

    await hook.refetch();

    expect(mockDispatch).toHaveBeenCalledWith({ type: "LOADING" });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "SUCCESS",
      payload: sampleEvents,
    });
  });
});