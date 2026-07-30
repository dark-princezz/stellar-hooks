import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockPoolResponse = {
  id: "pool123abc",
  fee_bp: 30,
  type: "constant_product",
  total_trustlines: "100",
  total_shares: "50000.0000000",
  reserves: [
    { asset: "native", amount: "1000.0000000" },
    { asset: "USDC:GISSUER", amount: "5000.0000000" },
  ],
  last_modified_ledger: 12345,
  last_modified_time: "2024-01-01T00:00:00Z",
};

const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve(mockPoolResponse),
});

vi.stubGlobal("fetch", mockFetch);

vi.mock("../context", () => ({
  useStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
  useOptionalStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
  useOptionalStellarHookDebugContext: () => null,
}));

vi.mock("../hooks/useFreighter", () => ({
  useFreighter: () => ({
    publicKey: "GPUBLICKEY",
    isConnected: true,
    signTransaction: vi.fn().mockResolvedValue("signed-xdr"),
  }),
}));

vi.mock("../hooks/useTransactionCore", () => ({
  useTransactionCore: () => ({
    submit: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn(),
    status: "idle",
    hash: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  }),
}));

import { useLiquidityPool } from "../hooks/useLiquidityPool";

describe("useLiquidityPool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPoolResponse),
    });
  });

  it("fetches pool data and returns reserves", async () => {
    const { result } = renderHook(() => useLiquidityPool("pool123abc"));

    await vi.waitFor(() => {
      expect(result.current.pool).not.toBeNull();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://horizon-testnet.stellar.org/liquidity_pools/pool123abc",
      expect.any(Object)
    );
    expect(result.current.pool).toEqual(mockPoolResponse);
    expect(result.current.pool!.reserves).toHaveLength(2);
    expect(result.current.pool!.total_shares).toBe("50000.0000000");
    expect(result.current.pool!.fee_bp).toBe(30);
    expect(result.current.error).toBeNull();
  });

  it("returns null pool when poolId is null", () => {
    const { result } = renderHook(() => useLiquidityPool(null));

    expect(result.current.pool).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns null pool when poolId is undefined", () => {
    const { result } = renderHook(() => useLiquidityPool(undefined));

    expect(result.current.pool).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns error when fetch fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const { result } = renderHook(() => useLiquidityPool("bad-pool-id"));

    await vi.waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error!.message).toBe(
      "Failed to fetch liquidity pool: 404"
    );
    expect(result.current.pool).toBeNull();
  });

  it("does not fetch when enabled is false", () => {
    const { result } = renderHook(() =>
      useLiquidityPool("pool123abc", { enabled: false })
    );

    expect(result.current.pool).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("exposes refetch function", async () => {
    const { result } = renderHook(() => useLiquidityPool("pool123abc"));

    await vi.waitFor(() => {
      expect(result.current.pool).not.toBeNull();
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ ...mockPoolResponse, total_shares: "60000.0000000" }),
    });

    await result.current.refetch();

    await vi.waitFor(() => {
      expect(result.current.pool!.total_shares).toBe("60000.0000000");
    });
  });

  it("exposes deposit and withdraw functions", () => {
    const { result } = renderHook(() => useLiquidityPool("pool123abc"));

    expect(typeof result.current.deposit).toBe("function");
    expect(typeof result.current.withdraw).toBe("function");
    expect(result.current.depositStatus).toBe("idle");
    expect(result.current.withdrawStatus).toBe("idle");
    expect(result.current.isDepositLoading).toBe(false);
    expect(result.current.isWithdrawLoading).toBe(false);
  });
});
