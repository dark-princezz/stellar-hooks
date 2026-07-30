import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockFeeStats = {
  lastLedger: "100",
  lastLedgerBaseFee: "100",
  ledgerCapacityUsage: "0.5",
  feeCharged: {
    max: "1000",
    min: "100",
    mode: "100",
    p10: "100",
    p20: "100",
    p30: "100",
    p40: "100",
    p50: "100",
    p60: "200",
    p70: "300",
    p80: "400",
    p90: "500",
    p95: "700",
    p99: "900",
  },
  maxFee: {
    max: "5000",
    min: "100",
    mode: "200",
    p10: "100",
    p20: "150",
    p30: "200",
    p40: "250",
    p50: "300",
    p60: "400",
    p70: "500",
    p80: "600",
    p90: "800",
    p95: "1000",
    p99: "2000",
  },
};

const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve(mockFeeStats),
});

vi.stubGlobal("fetch", mockFetch);

vi.mock("../context", () => ({
  useStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
  useOptionalStellarHookDebugContext: () => null,
}));

import { useFeeStats } from "../hooks/useFeeStats";

describe("useFeeStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockFeeStats),
    });
  });

  it("fetches fee stats and returns default 75th percentile recommendation", async () => {
    const { result } = renderHook(() => useFeeStats());

    await vi.waitFor(() => {
      expect(result.current.feeStats).not.toBeNull();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://horizon-testnet.stellar.org/fee_stats",
    );
    expect(result.current.feeStats).toEqual(mockFeeStats);
    expect(result.current.recommendedFee).toBe("600");
    expect(result.current.error).toBeNull();
  });

  it("normalizes Horizon snake_case fee_stats into camelCase FeeStats", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          last_ledger: "24999",
          last_ledger_base_fee: "100",
          ledger_capacity_usage: "0.1",
          fee_charged: mockFeeStats.feeCharged,
          max_fee: mockFeeStats.maxFee,
        }),
    });

    const { result } = renderHook(() => useFeeStats({ percentile: 95 }));

    await vi.waitFor(() => {
      expect(result.current.feeStats).not.toBeNull();
    });

    expect(result.current.feeStats).toEqual({
      lastLedger: "24999",
      lastLedgerBaseFee: "100",
      ledgerCapacityUsage: "0.1",
      feeCharged: mockFeeStats.feeCharged,
      maxFee: mockFeeStats.maxFee,
    });
    expect(result.current.recommendedFee).toBe("1000");
  });

  it("returns 50th percentile when configured", async () => {
    const { result } = renderHook(() =>
      useFeeStats({ percentile: 50 })
    );

    await vi.waitFor(() => {
      expect(result.current.feeStats).not.toBeNull();
    });

    expect(result.current.recommendedFee).toBe("300");
  });

  it("returns 95th percentile when configured", async () => {
    const { result } = renderHook(() =>
      useFeeStats({ percentile: 95 })
    );

    await vi.waitFor(() => {
      expect(result.current.feeStats).not.toBeNull();
    });

    expect(result.current.recommendedFee).toBe("1000");
  });

  it("returns 99th percentile when configured", async () => {
    const { result } = renderHook(() =>
      useFeeStats({ percentile: 99 })
    );

    await vi.waitFor(() => {
      expect(result.current.feeStats).not.toBeNull();
    });

    expect(result.current.recommendedFee).toBe("2000");
  });

  it("returns error when fetch fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useFeeStats());

    await vi.waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error!.message).toBe(
      "Failed to fetch fee stats: 500"
    );
    expect(result.current.feeStats).toBeNull();
    expect(result.current.recommendedFee).toBeNull();
  });

  it("does not fetch when enabled is false", () => {
    const { result } = renderHook(() =>
      useFeeStats({ enabled: false })
    );

    expect(result.current.feeStats).toBeNull();
    expect(result.current.recommendedFee).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("polls fee stats at the given refetchInterval", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useFeeStats({ refetchInterval: 3000 })
    );

    await vi.waitFor(() => {
      expect(result.current.feeStats).not.toBeNull();
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(3000);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(3000);
    expect(mockFetch).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });

  it("does not poll when refetchInterval is 0", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useFeeStats({ refetchInterval: 0 })
    );

    await vi.waitFor(() => {
      expect(result.current.feeStats).not.toBeNull();
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10000);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("stops polling when unmounted", async () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() =>
      useFeeStats({ refetchInterval: 2000 })
    );

    await vi.waitFor(() => {
      expect(result.current.feeStats).not.toBeNull();
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    unmount();
    await vi.advanceTimersByTimeAsync(6000);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
