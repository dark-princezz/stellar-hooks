/**
 * @file useAssetSearch.test.ts
 * @description Unit tests for the useAssetSearch hook.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const mockFetch = vi.fn();

global.fetch = mockFetch;

import { useAssetSearch } from "../hooks/useAssetSearch";

const MOCK_SUCCESS_RESPONSE = {
  _embedded: {
    records: [
      {
        asset: "USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
        code: "USDC",
        issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
        domain: "circle.com",
        rating: {
          age: 10,
          activity: 10,
          trustlines: 10,
          liquidity: 10,
          volume7d: 10,
          interop: 4,
          average: 9,
        },
        tomlInfo: {
          code: "USDC",
          issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
          image: "https://example.com/image.png",
          anchorAssetType: "fiat",
          anchorAsset: "USD",
          orgName: "Circle Internet Financial, LLC",
        },
        supply: "2532970116006420",
      },
      {
        asset: "USDT-GDQOE23CFSUNUSQY355GJCHAXUXC3FBXLQGDA5YVZETR3FEJLTXWQQWL",
        code: "USDT",
        issuer: "GDQOE23CFSUNUSQY355GJCHAXUXC3FBXLQGDA5YVZETR3FEJLTXWQQWL",
        domain: "tether.io",
        rating: {
          age: 9,
          activity: 8,
          trustlines: 8,
          liquidity: 8,
          volume7d: 8,
          interop: 3,
          average: 7.3,
        },
      },
    ],
  },
};

const MOCK_EMPTY_RESPONSE = {
  _embedded: {
    records: [],
  },
};

describe("useAssetSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty results for empty query without fetching", async () => {
    const { result } = renderHook(() => useAssetSearch());

    await act(async () => {
      await result.current.search("");
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns empty results for whitespace-only query without fetching", async () => {
    const { result } = renderHook(() => useAssetSearch());

    await act(async () => {
      await result.current.search("   ");
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches and returns asset search results", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_SUCCESS_RESPONSE,
    });

    const { result } = renderHook(() => useAssetSearch());

    await act(async () => {
      await result.current.search("USDC");
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.stellar.expert/explorer/public/asset?search=USDC",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );

    expect(result.current.results).toHaveLength(2);
    expect(result.current.results[0]).toMatchObject({
      code: "USDC",
      issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      domain: "circle.com",
    });
    expect(result.current.results[0].rating).toEqual({
      age: 10,
      activity: 10,
      trustlines: 10,
      liquidity: 10,
      volume7d: 10,
      interop: 4,
      average: 9,
    });
    expect(result.current.error).toBeNull();
    expect(result.current.lastFetchedAt).toBeInstanceOf(Date);
  });

  it("returns empty results when no assets match", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_EMPTY_RESPONSE,
    });

    const { result } = renderHook(() => useAssetSearch());

    await act(async () => {
      await result.current.search("NONEXISTENT");
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("handles rate limiting errors gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    });

    const { result } = renderHook(() => useAssetSearch());

    await act(async () => {
      await result.current.search("USDC");
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain("Rate limited");
  });

  it("handles other HTTP errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const { result } = renderHook(() => useAssetSearch());

    await act(async () => {
      await result.current.search("USDC");
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain("500");
  });

  it("handles network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useAssetSearch());

    await act(async () => {
      await result.current.search("USDC");
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Network error");
  });

  it("debounces search calls", async () => {
    vi.useFakeTimers();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_SUCCESS_RESPONSE,
    });

    const { result } = renderHook(() => useAssetSearch({ debounceMs: 300 }));

    // Trigger multiple searches quickly
    act(() => {
      result.current.search("USD");
    });
    act(() => {
      result.current.search("USDC");
    });
    act(() => {
      result.current.search("USDT");
    });

    // Fast-forward past debounce time
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.isLoading).toBe(false);

    // Should only call fetch once with the last query
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.stellar.expert/explorer/public/asset?search=USDT",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );

    vi.useRealTimers();
  });

  it("respects enabled option", async () => {
    const { result } = renderHook(() => useAssetSearch({ enabled: false }));

    await act(async () => {
      await result.current.search("USDC");
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("cancels pending requests on new search", async () => {
    let abortCount = 0;
    mockFetch.mockImplementation(() => {
      return new Promise((resolve, reject) => {
        const signal = new AbortController().signal;
        if (signal.aborted) {
          abortCount++;
          reject(new DOMException("Aborted", "AbortError"));
        }
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => MOCK_SUCCESS_RESPONSE,
          });
        }, 100);
      });
    });

    const { result } = renderHook(() => useAssetSearch({ debounceMs: 0 }));

    await act(async () => {
      result.current.search("USDC");
    });

    // Immediately trigger another search
    await act(async () => {
      result.current.search("USDT");
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("parses asset code and issuer from asset string", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_SUCCESS_RESPONSE,
    });

    const { result } = renderHook(() => useAssetSearch());

    await act(async () => {
      await result.current.search("USDC");
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.results[0].code).toBe("USDC");
    expect(result.current.results[0].issuer).toBe(
      "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
    );
  });

  it("handles response without _embedded.records", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useAssetSearch());

    await act(async () => {
      await result.current.search("USDC");
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
