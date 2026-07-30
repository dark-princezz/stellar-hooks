import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useNetworkStatus } from "./useNetworkStatus";

const mockRoot = vi.hoisted(() => vi.fn());
const mockGetHealth = vi.hoisted(() => vi.fn());

vi.mock("../context", () => ({
  useStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
      sorobanRpcUrl: "https://soroban-testnet.stellar.org",
    },
  }),
}));

vi.mock("../utils/memoizedServers", () => ({
  getHorizonServer: vi.fn().mockReturnValue({ root: mockRoot }),
  getRpcServer: vi.fn().mockReturnValue({ getHealth: mockGetHealth }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("useNetworkStatus", () => {
  it("returns healthy status and latency when both endpoints respond", async () => {
    mockRoot.mockResolvedValue({ history_latest_ledger: 12345 });
    mockGetHealth.mockResolvedValue({ status: "healthy" });

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isHorizonHealthy).toBe(true);
    expect(result.current.isRpcHealthy).toBe(true);
    expect(result.current.ledger).toBe(12345);
    expect(result.current.horizonLatency).not.toBe(Infinity);
    expect(result.current.rpcLatency).not.toBe(Infinity);
  });

  it("handles a Horizon failure without affecting RPC status", async () => {
    mockRoot.mockRejectedValue(new Error("Network error"));
    mockGetHealth.mockResolvedValue({ status: "healthy" });

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isHorizonHealthy).toBe(false);
    expect(result.current.horizonLatency).toBe(Infinity);
    expect(result.current.ledger).toBe(0); // stays at initial value
    expect(result.current.isRpcHealthy).toBe(true);
  });

  it("handles a Soroban RPC failure without affecting Horizon status", async () => {
    mockRoot.mockResolvedValue({ history_latest_ledger: 12345 });
    mockGetHealth.mockRejectedValue(new Error("RPC timeout"));

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isRpcHealthy).toBe(false);
    expect(result.current.rpcLatency).toBe(Infinity);
    expect(result.current.isHorizonHealthy).toBe(true);
    expect(result.current.ledger).toBe(12345);
  });

  it("refetches on demand via the returned refetch function", async () => {
    mockRoot.mockResolvedValueOnce({ history_latest_ledger: 100 });
    mockGetHealth.mockResolvedValue({ status: "healthy" });

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => expect(result.current.ledger).toBe(100));
    expect(mockRoot).toHaveBeenCalledTimes(1);

    mockRoot.mockResolvedValueOnce({ history_latest_ledger: 101 });

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => expect(result.current.ledger).toBe(101));
    expect(mockRoot).toHaveBeenCalledTimes(2);
  });
});
