import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useStellarBalance } from "../useStellarBalance";

const mockLoadAccount = vi.fn();

vi.mock("../context/StellarContext", () => ({
  useStellarContext: () => ({
    server: { loadAccount: mockLoadAccount },
    sorobanServer: null,
    network: "testnet",
  }),
}));

beforeEach(() => vi.clearAllMocks());

const mockResponse = {
  balances: [
    { asset_type: "native", balance: "250.0000000" },
    {
      asset_type: "credit_alphanum4",
      balance: "10.0000000",
      asset_code: "USDC",
      asset_issuer: "GISSUER",
    },
  ],
  sequenceNumber: () => "99",
};

describe("useStellarBalance", () => {
  it("exposes xlmBalance from native balance", async () => {
    mockLoadAccount.mockResolvedValue(mockResponse);

    const { result } = renderHook(() =>
      useStellarBalance("GABC123")
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.xlmBalance?.balance).toBe("250.0000000");
    expect(result.current.xlmBalance?.asset_type).toBe("native");
  });

  it("exposes all balances including tokens", async () => {
    mockLoadAccount.mockResolvedValue(mockResponse);

    const { result } = renderHook(() =>
      useStellarBalance("GABC123")
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.balances).toHaveLength(2);
  });

  it("returns null xlmBalance on error", async () => {
    mockLoadAccount.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() =>
      useStellarBalance("GABC123")
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.xlmBalance).toBeNull();
    expect(result.current.error).toBeTruthy();
  });
});