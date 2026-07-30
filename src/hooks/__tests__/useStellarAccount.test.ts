import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useStellarAccount } from "../useStellarAccount";

const mockLoadAccount = vi.fn();

vi.mock("../context/StellarContext", () => ({
  useStellarContext: () => ({
    server: {
      loadAccount: mockLoadAccount,
    },
    sorobanServer: null,
    network: "testnet",
  }),
}));

const MOCK_PUBLIC_KEY = "GABC1234567890";

const mockAccountResponse = {
  balances: [
    { asset_type: "native", balance: "100.0000000" },
    {
      asset_type: "credit_alphanum4",
      balance: "50.0000000",
      asset_code: "USDC",
      asset_issuer: "GISSUER",
    },
  ],
  sequenceNumber: () => "12345",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

describe("useStellarAccount", () => {
  it("fetches account data on mount", async () => {
    mockLoadAccount.mockResolvedValue(mockAccountResponse);

    const { result } = renderHook(() =>
      useStellarAccount(MOCK_PUBLIC_KEY)
    );

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.balances).toHaveLength(2);
    expect(result.current.data?.sequence).toBe("12345");
    expect(result.current.lastFetchedAt).toBeInstanceOf(Date);
  });

  it("returns null data and sets error when fetch fails", async () => {
    mockLoadAccount.mockRejectedValue(new Error("Account not found"));

    const { result } = renderHook(() =>
      useStellarAccount(MOCK_PUBLIC_KEY)
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error?.message).toBe("Account not found");
  });

  it("does not fetch when enabled is false", () => {
    const { result } = renderHook(() =>
      useStellarAccount(MOCK_PUBLIC_KEY, { enabled: false })
    );
    expect(mockLoadAccount).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it("does not fetch when publicKey is null", () => {
    renderHook(() => useStellarAccount(null));
    expect(mockLoadAccount).not.toHaveBeenCalled();
  });

  it("refetch() triggers a new network call", async () => {
    mockLoadAccount.mockResolvedValue(mockAccountResponse);

    const { result } = renderHook(() =>
      useStellarAccount(MOCK_PUBLIC_KEY)
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockLoadAccount).toHaveBeenCalledTimes(1);

    await result.current.refetch();
    expect(mockLoadAccount).toHaveBeenCalledTimes(2);
  });

  it("polls at refetchInterval", async () => {
    mockLoadAccount.mockResolvedValue(mockAccountResponse);

    const { result } = renderHook(() =>
      useStellarAccount(MOCK_PUBLIC_KEY, { refetchInterval: 3000 })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockLoadAccount).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(3000);
    await waitFor(() => expect(mockLoadAccount).toHaveBeenCalledTimes(2));

    vi.advanceTimersByTime(3000);
    await waitFor(() => expect(mockLoadAccount).toHaveBeenCalledTimes(3));
  });
});