import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTransactionHistory } from "./useTransactionHistory";

const mockCall = vi.hoisted(() => vi.fn());

vi.mock("../context", () => ({
  useStellarContext: () => ({
    config: { horizonUrl: "https://horizon-testnet.stellar.org" },
  }),
}));

vi.mock("../utils/memoizedServers", () => ({
  getHorizonServer: vi.fn().mockReturnValue({
    transactions: vi.fn().mockReturnThis(),
    forAccount: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    cursor: vi.fn().mockReturnThis(),
    includeFailed: vi.fn().mockReturnThis(),
    call: mockCall,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const mockPublicKey = "GCABC...XYZ";

describe("useTransactionHistory", () => {
  it("should fetch the initial page of transactions", async () => {
    const mockRecords = [
      { id: "1", paging_token: "1" },
      { id: "2", paging_token: "2" },
    ];
    mockCall.mockResolvedValue({ records: mockRecords });

    const { result } = renderHook(() =>
      useTransactionHistory(mockPublicKey, { limit: 2 })
    );

    expect(result.current.isLoading).toBe(true);

    await act(async () => {});

    expect(result.current.isLoading).toBe(false);
    expect(result.current.transactions).toEqual(mockRecords);
    expect(result.current.hasNext).toBe(true);
    expect(mockCall).toHaveBeenCalledTimes(1);
  });

  it("should fetch the next page when fetchNextPage is called", async () => {
    const firstPage = [{ id: "1", paging_token: "100" }];
    const secondPage = [{ id: "2", paging_token: "200" }];
    mockCall
      .mockResolvedValueOnce({ records: firstPage })
      .mockResolvedValueOnce({ records: secondPage });

    const { result } = renderHook(() =>
      useTransactionHistory(mockPublicKey, { limit: 1 })
    );

    await act(async () => {});

    expect(result.current.transactions).toEqual(firstPage);
    expect(result.current.hasNext).toBe(true);

    await act(async () => {
      result.current.fetchNextPage();
    });

    expect(result.current.transactions).toEqual([...firstPage, ...secondPage]);
    expect(mockCall).toHaveBeenCalledTimes(2);
  });

  it("should set hasNext to false when the last page is fetched", async () => {
    const mockRecords = [{ id: "1", paging_token: "1" }];
    mockCall.mockResolvedValue({ records: mockRecords });

    const { result } = renderHook(() =>
      useTransactionHistory(mockPublicKey, { limit: 5 })
    );

    await act(async () => {});

    expect(result.current.transactions).toEqual(mockRecords);
    expect(result.current.hasNext).toBe(false);
  });

  it("should handle errors gracefully", async () => {
    const error = new Error("Network failure");
    mockCall.mockRejectedValue(error);

    const { result } = renderHook(() => useTransactionHistory(mockPublicKey));

    await act(async () => {});

    expect(result.current.error).toBe(error);
    expect(result.current.transactions).toEqual([]);
  });

  it("should fetch previous page when fetchPreviousPage is called", async () => {
    const firstPage = [{ id: "1", paging_token: "100" }];
    const secondPage = [{ id: "2", paging_token: "200" }];
    const thirdPage = [{ id: "3", paging_token: "300" }];
    mockCall
      .mockResolvedValueOnce({ records: firstPage })
      .mockResolvedValueOnce({ records: secondPage });

    const { result } = renderHook(() =>
      useTransactionHistory(mockPublicKey, { limit: 1 })
    );

    await act(async () => {});

    expect(result.current.transactions).toEqual(firstPage);

    await act(async () => {
      result.current.fetchNextPage();
    });

    expect(result.current.transactions).toEqual([...firstPage, ...secondPage]);
    expect(result.current.hasPrevious).toBe(true);

    // Now go back — the prev direction flips order and uses first record's cursor
    // It returns newly prepended records (different from what we already have)
    mockCall.mockResolvedValueOnce({ records: thirdPage });
    await act(async () => {
      result.current.fetchPreviousPage();
    });

    expect(result.current.transactions).toEqual([
      ...thirdPage,
      ...firstPage,
      ...secondPage,
    ]);
  });

  it("should pass includeFailed option to the Horizon call", async () => {
    mockCall.mockResolvedValue({ records: [] });

    const { getHorizonServer } = await import("../utils/memoizedServers");

    renderHook(() =>
      useTransactionHistory(mockPublicKey, { includeFailed: true })
    );

    await act(async () => {});

    const mockServer = getHorizonServer();
    expect(mockServer.includeFailed).toHaveBeenCalledWith(true);
  });

  it("should not call fetchPreviousPage when hasPrevious is false", async () => {
    mockCall.mockResolvedValue({ records: [] });

    const { result } = renderHook(() => useTransactionHistory(mockPublicKey));

    await act(async () => {});

    expect(result.current.hasPrevious).toBe(false);

    await act(async () => {
      result.current.fetchPreviousPage();
    });

    expect(mockCall).toHaveBeenCalledTimes(1);
  });

  it("should not call fetchNextPage when hasNext is false", async () => {
    mockCall.mockResolvedValue({ records: [] });

    const { result } = renderHook(() => useTransactionHistory(mockPublicKey));

    await act(async () => {});

    expect(result.current.hasNext).toBe(false);

    await act(async () => {
      result.current.fetchNextPage();
    });

    expect(mockCall).toHaveBeenCalledTimes(1);
  });
});
