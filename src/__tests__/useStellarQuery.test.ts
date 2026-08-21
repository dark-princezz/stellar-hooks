/**
 * @file useStellarQuery.test.ts
 * @description Unit and regression tests for the useStellarQuery hook.
 *
 * Regression: inline literal initialData must NOT cause an infinite fetch loop.
 *
 * Root cause: the mount effect previously listed `initialData` as a dependency.
 * Any consuming hook that passed a fresh array/object literal on every render
 * (e.g. `initialData: []`) produced a new reference each time, causing the
 * effect to re-run → fetch → state update → re-render → new reference →
 * effect re-runs → … → ERR_WORKER_OUT_OF_MEMORY in the test process.
 *
 * Fix: `initialData` is now read through `initialDataRef` and intentionally
 * omitted from the effect's dependency array.  This file guards against
 * regression by asserting that the fetcher is called only once (on mount)
 * regardless of how many renders occur with a fresh inline literal.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useStellarQuery } from "../hooks/useStellarQuery";

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({ networkEpoch: 0 }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** A trivially stable fetcher that resolves to the supplied value. */
function makeFetcher<T>(value: T) {
  return vi.fn().mockResolvedValue(value);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useStellarQuery", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Basic functionality ────────────────────────────────────────────────────

  it("starts with data equal to initialData before the fetch resolves", () => {
    // Use a fetcher that never resolves so we can inspect the initial state.
    const fetcher = vi.fn().mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(
      () => useStellarQuery(fetcher, { initialData: ["seed"] }),
    );

    // Before the async fetcher resolves data should be the initialData seed.
    expect(result.current.data).toEqual(["seed"]);
    // isLoading is false and isRefetching is true because data is already present.
    expect(result.current.isRefetching).toBe(true);
  });

  it("resolves data and clears loading state after fetch completes", async () => {
    const fetcher = makeFetcher({ value: 42 });
    const { result } = renderHook(() => useStellarQuery(fetcher));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual({ value: 42 });
    expect(result.current.error).toBeNull();
    expect(result.current.lastFetchedAt).toBeInstanceOf(Date);
  });

  it("surfaces fetch errors and clears loading state", async () => {
    const boom = new Error("network error");
    const fetcher = vi.fn().mockRejectedValue(boom);
    const { result } = renderHook(() => useStellarQuery(fetcher));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error?.message).toBe(boom.message);
    expect(result.current.data).toBeNull();
  });

  it("does not fetch when enabled is false", () => {
    const fetcher = makeFetcher("hello");
    renderHook(() => useStellarQuery(fetcher, { enabled: false }));

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("resets state when enabled transitions from true to false", async () => {
    const fetcher = makeFetcher([1, 2, 3]);
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useStellarQuery(fetcher, { enabled, initialData: [] as number[] }),
      { initialProps: { enabled: true } }
    );

    await waitFor(() => expect(result.current.data).toEqual([1, 2, 3]));

    rerender({ enabled: false });

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("exposes a working refetch function", async () => {
    const fetcher = makeFetcher("data");
    const { result } = renderHook(() => useStellarQuery(fetcher));

    await waitFor(() => expect(result.current.data).toBe("data"));
    const countAfterMount = fetcher.mock.calls.length;

    await act(async () => {
      await result.current.refetch();
    });

    expect(fetcher).toHaveBeenCalledTimes(countAfterMount + 1);
  });

  // ── Polling (requires fake timers) ────────────────────────────────────────

  describe("polling", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("polls at refetchInterval and stops when the component unmounts", async () => {
      const fetcher = makeFetcher("ping");
      const { unmount } = renderHook(
        () => useStellarQuery(fetcher, { refetchInterval: 1000 }),
        );

      // Drain the initial fetch's microtasks so isFetchingRef is cleared.
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(fetcher).toHaveBeenCalledTimes(1);

      // Advance one interval tick and drain its promises.
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(fetcher).toHaveBeenCalledTimes(2);

      // Advance another interval tick and drain.
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(fetcher).toHaveBeenCalledTimes(3);

      unmount();

      // Timer should be cleared — no more calls after unmount.
      await act(async () => {
        vi.advanceTimersByTime(5000);
        await Promise.resolve();
      });

      expect(fetcher).toHaveBeenCalledTimes(3);
    });
  });

  // ── Regression: inline literal initialData must not cause infinite loop ───

  /**
   * REGRESSION TEST
   *
   * Simulates the exact scenario that caused ERR_WORKER_OUT_OF_MEMORY:
   * a consumer passes `initialData: []` (a fresh array literal created on
   * every render).  Before the fix, this re-triggered the mount effect on
   * every render because `[]` !== `[]` by reference, starting a new fetch,
   * which updated state, which caused a re-render, which created a new `[]`,
   * and so on indefinitely.
   *
   * After the fix the fetcher must be called exactly ONCE regardless of how
   * many renders happen.
   */
  it("does not re-run the mount effect when initialData is an inline array literal", async () => {
    // renderCount tracks how many times the hook body executes.
    let renderCount = 0;

    const fetcher = vi.fn().mockResolvedValue(["result"]);

    const { result } = renderHook(
      () => {
        renderCount++;
        // Deliberately construct a new array reference every render —
        // this is the pattern that previously caused the infinite loop.
        return useStellarQuery(fetcher, { initialData: [] as string[] });
      },
    );

    // Wait for the initial fetch to complete.
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Allow any micro-task / state-update cascade to settle.
    await act(async () => {
      await Promise.resolve();
    });

    // The fetcher must have been called exactly once (the initial mount fetch).
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Render count must be small and finite — definitely not in the hundreds.
    // We allow up to 10 to accommodate React's own double-invoking in StrictMode
    // and the two state transitions (FETCH_START → FETCH_SUCCESS).
    expect(renderCount).toBeLessThanOrEqual(10);
  });

  /**
   * Same regression check with an inline object literal as initialData —
   * another common pattern in consuming hooks.
   */
  it("does not re-run the mount effect when initialData is an inline object literal", async () => {
    let renderCount = 0;

    const fetcher = vi.fn().mockResolvedValue({ count: 1 });

    const { result } = renderHook(
      () => {
        renderCount++;
        // Fresh object reference on every render.
        return useStellarQuery(fetcher, {
          initialData: {} as Record<string, number>,
        });
      },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(renderCount).toBeLessThanOrEqual(10);
  });

  /**
   * Verify the fix holds even across multiple re-renders triggered externally
   * (e.g. parent state changes unrelated to the query).
   */
  it("fetcher call count stays bounded across forced external re-renders", async () => {
    const fetcher = vi.fn().mockResolvedValue(["a", "b"]);

    // externalState simulates a parent component re-rendering this hook
    // with fresh props while keeping initialData as an inline literal.
    let externalState = 0;
    const { result, rerender } = renderHook(
      () => {
        // Access externalState so re-renders with new values actually re-run the body.
        void externalState;
        return useStellarQuery(fetcher, { initialData: [] as string[] });
      },
    );

    await waitFor(() => expect(result.current.data).toEqual(["a", "b"]));

    const callsAfterMount = fetcher.mock.calls.length;

    // Trigger 5 external re-renders.
    for (let i = 1; i <= 5; i++) {
      externalState = i;
      rerender();
    }

    // Allow any pending effects to flush.
    await act(async () => {
      await Promise.resolve();
    });

    // The fetcher must NOT have been called again — only the single initial call.
    expect(fetcher).toHaveBeenCalledTimes(callsAfterMount);
  });
});
