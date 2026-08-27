/**
 * @file useStellarQuery.cache.test.ts
 * @description Tests for the TTL request-caching layer in useStellarQuery.
 *   Covers: cache hit, cache miss, TTL expiry, multi-instance sharing, no-key path.
 * @package stellar-hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useStellarQuery } from "../hooks/useStellarQuery";
import { getCache, setCache, clearCache } from "../utils";

// ─── Mock context so the hook can render standalone ───────────────────────────

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({ networkEpoch: 0 }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Creates a vitest mock that resolves with `value` after an optional delay. */
function makeFetcher<T>(value: T, delayMs = 0) {
  return vi.fn().mockImplementation(
    () =>
      new Promise<T>((resolve) =>
        delayMs > 0 ? setTimeout(() => resolve(value), delayMs) : resolve(value),
      ),
  );
}

const TEST_KEY = "test:cache-key";
const TEST_DATA = { balance: "100.0000000" };
const TTL_MS = 5000;

// ─── Suite ────────────────────────────────────────────────────────────────────

describe("useStellarQuery — caching layer", () => {
  beforeEach(() => {
    // Start every test with a clean cache so entries don't bleed between tests.
    clearCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    clearCache();
  });

  // ── cache hit ──────────────────────────────────────────────────────────────

  describe("cache hit", () => {
    it("returns cached data immediately without calling the fetcher", async () => {
      // Pre-populate the cache.
      setCache(TEST_KEY, TEST_DATA, TTL_MS);

      const fetcher = makeFetcher({ balance: "999.0000000" });

      const { result } = renderHook(() =>
        useStellarQuery(fetcher, { cacheKey: TEST_KEY }),
      );

      // Drain microtasks (the dispatch of FETCH_SUCCESS is synchronous in the
      // cache-hit path, but React batches the state update into a microtask).
      await act(async () => {
        await Promise.resolve();
      });

      // Fetcher must NOT have been called — we served from cache.
      expect(fetcher).not.toHaveBeenCalled();

      // Data should be the pre-populated cached value, NOT the fetcher value.
      expect(result.current.data).toEqual(TEST_DATA);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("does not set isLoading when serving from cache", async () => {
      setCache(TEST_KEY, TEST_DATA, TTL_MS);
      const fetcher = makeFetcher({ balance: "0" });

      const { result } = renderHook(() =>
        useStellarQuery(fetcher, { cacheKey: TEST_KEY }),
      );

      // isLoading should never become true because we short-circuit before FETCH_START.
      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  // ── cache miss ────────────────────────────────────────────────────────────

  describe("cache miss", () => {
    it("calls the fetcher and populates the cache on success", async () => {
      // Cache is clean — guaranteed by beforeEach clearCache().
      const fetcher = makeFetcher(TEST_DATA);

      const { result } = renderHook(() =>
        useStellarQuery(fetcher, { cacheKey: TEST_KEY, cacheTtl: TTL_MS }),
      );

      await act(async () => {
        vi.runAllTimers();
        await Promise.resolve();
        await Promise.resolve();
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Fetcher was called exactly once.
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Data is returned.
      expect(result.current.data).toEqual(TEST_DATA);

      // Cache is now populated.
      const cached = getCache<typeof TEST_DATA>(TEST_KEY);
      expect(cached).toEqual(TEST_DATA);
    });

    it("uses the default TTL of 5000 ms when cacheTtl is not provided", async () => {
      const fetcher = makeFetcher(TEST_DATA);

      renderHook(() =>
        useStellarQuery(fetcher, { cacheKey: TEST_KEY }),
      );

      await act(async () => {
        vi.runAllTimers();
        await Promise.resolve();
        await Promise.resolve();
      });

      // Cache should be alive because 5 s hasn't passed yet.
      const cached = getCache<typeof TEST_DATA>(TEST_KEY);
      expect(cached).toEqual(TEST_DATA);

      // Advance just past the default 5000 ms TTL.
      vi.advanceTimersByTime(5001);

      // Cache entry should now be expired.
      const expired = getCache<typeof TEST_DATA>(TEST_KEY);
      expect(expired).toBeNull();
    });
  });

  // ── TTL expiry ────────────────────────────────────────────────────────────

  describe("TTL expiry", () => {
    it("treats an expired entry as a cache miss and re-fetches", async () => {
      // Seed the cache with a very short TTL and then advance time past it.
      setCache(TEST_KEY, { balance: "stale" }, 100);
      vi.advanceTimersByTime(101); // TTL expired

      const fetcher = makeFetcher(TEST_DATA);

      const { result } = renderHook(() =>
        useStellarQuery(fetcher, { cacheKey: TEST_KEY, cacheTtl: TTL_MS }),
      );

      await act(async () => {
        vi.runAllTimers();
        await Promise.resolve();
        await Promise.resolve();
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // A fresh network call was made.
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Fresh data from the fetcher is returned.
      expect(result.current.data).toEqual(TEST_DATA);
    });

    it("does NOT call the fetcher while the cached entry is still alive", async () => {
      setCache(TEST_KEY, TEST_DATA, 10_000); // 10 s TTL

      const fetcher = makeFetcher({ balance: "new" });

      const { result } = renderHook(() =>
        useStellarQuery(fetcher, { cacheKey: TEST_KEY, cacheTtl: 10_000 }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(fetcher).not.toHaveBeenCalled();
      expect(result.current.data).toEqual(TEST_DATA);
    });
  });

  // ── multi-instance sharing ────────────────────────────────────────────────

  describe("multi-instance sharing", () => {
    it("second instance gets cached data without calling the fetcher again", async () => {
      const fetcher1 = makeFetcher(TEST_DATA);
      const fetcher2 = makeFetcher({ balance: "999" });

      // Render first instance — this will miss and populate the cache.
      const { result: result1 } = renderHook(() =>
        useStellarQuery(fetcher1, { cacheKey: TEST_KEY, cacheTtl: TTL_MS }),
      );

      await act(async () => {
        vi.runAllTimers();
        await Promise.resolve();
        await Promise.resolve();
      });

      await waitFor(() => expect(result1.current.isLoading).toBe(false));

      expect(fetcher1).toHaveBeenCalledTimes(1);
      expect(getCache(TEST_KEY)).toEqual(TEST_DATA);

      // Render second instance — the cache is populated; fetcher2 should be skipped.
      const { result: result2 } = renderHook(() =>
        useStellarQuery(fetcher2, { cacheKey: TEST_KEY, cacheTtl: TTL_MS }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(fetcher2).not.toHaveBeenCalled();
      expect(result2.current.data).toEqual(TEST_DATA);
    });

    it("instances with different cacheKeys do not interfere", async () => {
      const KEY_A = "test:key-a";
      const KEY_B = "test:key-b";
      const DATA_A = { id: "A" };
      const DATA_B = { id: "B" };

      const fetcherA = makeFetcher(DATA_A);
      const fetcherB = makeFetcher(DATA_B);

      const { result: resultA } = renderHook(() =>
        useStellarQuery(fetcherA, { cacheKey: KEY_A, cacheTtl: TTL_MS }),
      );
      const { result: resultB } = renderHook(() =>
        useStellarQuery(fetcherB, { cacheKey: KEY_B, cacheTtl: TTL_MS }),
      );

      await act(async () => {
        vi.runAllTimers();
        await Promise.resolve();
        await Promise.resolve();
      });

      await waitFor(() => expect(resultA.current.isLoading).toBe(false));
      await waitFor(() => expect(resultB.current.isLoading).toBe(false));

      expect(resultA.current.data).toEqual(DATA_A);
      expect(resultB.current.data).toEqual(DATA_B);

      expect(getCache(KEY_A)).toEqual(DATA_A);
      expect(getCache(KEY_B)).toEqual(DATA_B);
    });
  });

  // ── no cacheKey (backward compatible) ────────────────────────────────────

  describe("no cacheKey — backward-compatible path", () => {
    it("always calls the fetcher when cacheKey is not provided", async () => {
      const fetcher = makeFetcher(TEST_DATA);

      const { result } = renderHook(() => useStellarQuery(fetcher));

      await act(async () => {
        vi.runAllTimers();
        await Promise.resolve();
        await Promise.resolve();
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual(TEST_DATA);
    });

    it("does NOT write to the cache when cacheKey is absent", async () => {
      const fetcher = makeFetcher(TEST_DATA);

      renderHook(() => useStellarQuery(fetcher));

      await act(async () => {
        vi.runAllTimers();
        await Promise.resolve();
        await Promise.resolve();
      });

      // Since no key was provided, nothing should have been written under TEST_KEY.
      expect(getCache(TEST_KEY)).toBeNull();
    });

    it("two no-key instances each call the fetcher independently", async () => {
      const fetcher1 = makeFetcher(TEST_DATA);
      const fetcher2 = makeFetcher(TEST_DATA);

      renderHook(() => useStellarQuery(fetcher1));
      renderHook(() => useStellarQuery(fetcher2));

      await act(async () => {
        vi.runAllTimers();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(fetcher1).toHaveBeenCalledTimes(1);
      expect(fetcher2).toHaveBeenCalledTimes(1);
    });
  });

  // ── clearCache utility ────────────────────────────────────────────────────

  describe("clearCache utility", () => {
    it("clears a specific key", () => {
      setCache("key-1", "value-1", TTL_MS);
      setCache("key-2", "value-2", TTL_MS);

      clearCache("key-1");

      expect(getCache("key-1")).toBeNull();
      expect(getCache("key-2")).toBe("value-2");
    });

    it("clears all keys when called with no argument", () => {
      setCache("key-1", "value-1", TTL_MS);
      setCache("key-2", "value-2", TTL_MS);

      clearCache();

      expect(getCache("key-1")).toBeNull();
      expect(getCache("key-2")).toBeNull();
    });

    it("is a no-op when the key does not exist", () => {
      // Should not throw.
      expect(() => clearCache("nonexistent-key")).not.toThrow();
    });
  });
});
