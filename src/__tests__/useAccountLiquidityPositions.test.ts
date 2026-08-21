import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockPositions = [
  {
    id: "pool1",
    fee_bp: 30,
    type: "constant_product",
    total_trustlines: "50",
    total_shares: "10000.0000000",
    reserves: [
      { asset: "native", amount: "500.0000000" },
      { asset: "USDC:GISSUER", amount: "2500.0000000" },
    ],
    last_modified_ledger: 1000,
    last_modified_time: "2024-01-01T00:00:00Z",
  },
  {
    id: "pool2",
    fee_bp: 30,
    type: "constant_product",
    total_trustlines: "20",
    total_shares: "5000.0000000",
    reserves: [
      { asset: "native", amount: "200.0000000" },
      { asset: "BTC:GISSUER2", amount: "0.5000000" },
    ],
    last_modified_ledger: 1001,
    last_modified_time: "2024-01-02T00:00:00Z",
  },
];

const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ _embedded: { records: mockPositions } }),
});

vi.stubGlobal("fetch", mockFetch);

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
}));

vi.mock("../utils", () => ({
  validatePublicKey: vi.fn(),
}));

import { useAccountLiquidityPositions } from "../hooks/useAccountLiquidityPositions";

describe("useAccountLiquidityPositions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ _embedded: { records: mockPositions } }),
    });
  });

  it("fetches positions for a public key", async () => {
    const { result } = renderHook(() =>
      useAccountLiquidityPositions("GABC..." as any)
    );

    await vi.waitFor(() => {
      expect(result.current.positions).toHaveLength(2);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://horizon-testnet.stellar.org/liquidity_pools?account=GABC...&limit=200",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result.current.positions[0].id).toBe("pool1");
    expect(result.current.positions[1].id).toBe("pool2");
    expect(result.current.error).toBeNull();
  });

  it("returns empty positions when publicKey is null", () => {
    const { result } = renderHook(() =>
      useAccountLiquidityPositions(null)
    );

    expect(result.current.positions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns empty positions when publicKey is undefined", () => {
    const { result } = renderHook(() =>
      useAccountLiquidityPositions(undefined)
    );

    expect(result.current.positions).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns error when fetch fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() =>
      useAccountLiquidityPositions("GABC..." as any)
    );

    await vi.waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error!.message).toBe(
      "Failed to fetch liquidity positions: 500"
    );
    expect(result.current.positions).toEqual([]);
  });

  it("handles empty pool list", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ _embedded: { records: [] } }),
    });

    const { result } = renderHook(() =>
      useAccountLiquidityPositions("GABC..." as any)
    );

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.positions).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("does not fetch when enabled is false", () => {
    const { result } = renderHook(() =>
      useAccountLiquidityPositions("GABC..." as any, { enabled: false })
    );

    expect(result.current.positions).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("exposes refetch function", async () => {
    const { result } = renderHook(() =>
      useAccountLiquidityPositions("GABC..." as any)
    );

    await vi.waitFor(() => {
      expect(result.current.positions).toHaveLength(2);
    });

    expect(typeof result.current.refetch).toBe("function");
  });
});
