import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react-hooks";
import { waitFor } from "@testing-library/react";
const mockLoadAccount = vi.fn();

vi.mock("../context", () => ({
  useStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
}));

vi.mock("@stellar/stellar-sdk", () => ({
  Horizon: {
    Server: vi.fn(() => ({
      loadAccount: mockLoadAccount,
    })),
  },
}));

import { useStellarAccount } from "../hooks/useStellarAccount";

const mockRawAccount = {
  account_id: "GABC123",
  sequence: "1234567890",
  subentry_count: 0,
  thresholds: { low_threshold: 0, med_threshold: 0, high_threshold: 0 },
  flags: {
    auth_required: false,
    auth_revocable: false,
    auth_immutable: false,
    auth_clawback_enabled: false,
  },
  balances: [
    {
      asset_type: "native",
      balance: "42.0000000",
      buying_liabilities: "0.0000000",
      selling_liabilities: "0.0000000",
    },
  ],
};

describe("useStellarAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadAccount.mockResolvedValue(mockRawAccount);
  });

  it("fetches account data on mount and exposes parsed result", async () => {
    const { result } = renderHook(() => useStellarAccount("GABC123"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockLoadAccount).toHaveBeenCalledWith("GABC123");
    expect(result.current.data?.accountId).toBe("GABC123");
    expect(result.current.data?.balances).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("returns reset state when publicKey is null", () => {
    const { result } = renderHook(() => useStellarAccount(null));

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("calls refetch again when refetch() is invoked", async () => {
    const { result } = renderHook(() => useStellarAccount("GABC123"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockLoadAccount).toHaveBeenCalledTimes(2);
  });
});
