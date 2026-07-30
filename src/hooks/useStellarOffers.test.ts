import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStellarOffers } from "./useStellarOffers";

const mockCall = vi.hoisted(() => vi.fn());

vi.mock("../context", () => ({
  useStellarContext: () => ({
    config: { horizonUrl: "https://horizon-testnet.stellar.org" },
  }),
}));

vi.mock("@stellar/stellar-sdk", () => ({
  Horizon: {
    Server: vi.fn().mockImplementation(() => ({
      offers: vi.fn().mockReturnThis(),
      forAccount: vi.fn().mockReturnThis(),
      call: mockCall,
    })),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const mockPublicKey = "GCABC...XYZ";

describe("useStellarOffers", () => {
  it("should fetch and return offers for the given public key", async () => {
    const mockRecords = [
      { id: "1", selling: { code: "XLM" }, buying: { code: "USDC" } },
      { id: "2", selling: { code: "USDC" }, buying: { code: "XLM" } },
    ];
    mockCall.mockResolvedValue({ records: mockRecords });

    const { result } = renderHook(() => useStellarOffers(mockPublicKey));

    expect(result.current.isLoading).toBe(true);

    await act(async () => {});

    expect(result.current.isLoading).toBe(false);
    expect(result.current.offers).toEqual(mockRecords);
    expect(result.current.error).toBeNull();
    expect(mockCall).toHaveBeenCalledTimes(1);
  });

  it("should refetch on demand", async () => {
    const page1 = [{ id: "1" }];
    const page2 = [{ id: "2" }];
    mockCall.mockResolvedValueOnce({ records: page1 });
    mockCall.mockResolvedValueOnce({ records: page2 });

    const { result } = renderHook(() => useStellarOffers(mockPublicKey));

    await act(async () => {});
    expect(result.current.offers).toEqual(page1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.offers).toEqual(page2);
    expect(mockCall).toHaveBeenCalledTimes(2);
  });

  it("should set error when fetch fails", async () => {
    const error = new Error("Horizon unavailable");
    mockCall.mockRejectedValue(error);

    const { result } = renderHook(() => useStellarOffers(mockPublicKey));

    await act(async () => {});

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(error);
    expect(result.current.offers).toEqual([]);
  });

  it("should not fetch when publicKey is null", async () => {
    renderHook(() => useStellarOffers(null));

    await act(async () => {});

    expect(mockCall).not.toHaveBeenCalled();
  });

  it("should not fetch when enabled is false", async () => {
    renderHook(() => useStellarOffers(mockPublicKey, { enabled: false }));

    await act(async () => {});

    expect(mockCall).not.toHaveBeenCalled();
  });

  it("should update lastFetchedAt after a successful fetch", async () => {
    mockCall.mockResolvedValue({ records: [] });

    const { result } = renderHook(() => useStellarOffers(mockPublicKey));

    await act(async () => {});

    expect(result.current.lastFetchedAt).toBeInstanceOf(Date);
  });
});
