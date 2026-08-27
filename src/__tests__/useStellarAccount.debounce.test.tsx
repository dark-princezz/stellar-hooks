/**
 * @file useStellarAccount.debounce.test.tsx
 * @description Tests for the debounceDelay option in useStellarAccount.
 *
 * Covers:
 *   - debounceDelay delays the initial fetch
 *   - debounce timer is cancelled on unmount (no fetch fires)
 *   - rapid publicKey changes within the window coalesce into one fetch
 *   - polling-interval ticks are NOT debounced
 *   - backward compat: omitting debounceDelay fires immediately
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStellarAccount } from "../hooks/useStellarAccount";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: { horizonUrl: "https://horizon-testnet.stellar.org" },
    networkEpoch: 0,
  }),
}));

const loadAccountMock = vi.fn();

vi.mock("../utils/memoizedServers", () => ({
  getHorizonServer: vi.fn().mockReturnValue({
    loadAccount: (pubKey: string) => loadAccountMock(pubKey),
  }),
  clearMemoizedServers: vi.fn(),
}));

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/stellar-sdk")>();
  return {
    ...actual,
    StrKey: {
      ...(actual as any).StrKey,
      isValidEd25519PublicKey: vi.fn().mockReturnValue(true),
    },
  };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_ACCOUNT_RESPONSE = {
  account_id: "GABC123",
  sequence: "1",
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
      balance: "100.0000000",
      buying_liabilities: "0.0000000",
      selling_liabilities: "0.0000000",
    },
  ],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useStellarAccount — debounceDelay option", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    loadAccountMock.mockClear();
    loadAccountMock.mockResolvedValue(MOCK_ACCOUNT_RESPONSE);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ── 1. Option is exposed and delays the fetch ──────────────────────────────

  it("does NOT call loadAccount immediately when debounceDelay > 0", () => {
    renderHook(() =>
      useStellarAccount("GABC123", { debounceDelay: 200 })
    );

    // Before the debounce window expires, no request should have fired.
    expect(loadAccountMock).not.toHaveBeenCalled();
  });

  it("calls loadAccount after debounceDelay ms have elapsed", async () => {
    renderHook(() =>
      useStellarAccount("GABC123", { debounceDelay: 200 })
    );

    expect(loadAccountMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadAccountMock).toHaveBeenCalledTimes(1);
    expect(loadAccountMock).toHaveBeenCalledWith("GABC123");
  });

  // ── 2. Timer cancelled on unmount ─────────────────────────────────────────

  it("cancels the debounce timer on unmount — no fetch fires after unmount", async () => {
    const { unmount } = renderHook(() =>
      useStellarAccount("GABC123", { debounceDelay: 300 })
    );

    // Unmount before the delay window closes.
    unmount();

    // Advance well past the delay.
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    expect(loadAccountMock).not.toHaveBeenCalled();
  });

  // ── 3. Rapid publicKey changes coalesce ───────────────────────────────────

  it("coalesces rapid publicKey changes — only the final key triggers a fetch", async () => {
    const { rerender } = renderHook(
      ({ publicKey }: { publicKey: string }) =>
        useStellarAccount(publicKey, { debounceDelay: 300 }),
      { initialProps: { publicKey: "GABC111" } }
    );

    // 150 ms in — still within first window.
    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(loadAccountMock).not.toHaveBeenCalled();

    // Change publicKey — timer resets to a fresh 300 ms window.
    rerender({ publicKey: "GABC222" });

    // Another 150 ms — 150 ms into new window.
    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(loadAccountMock).not.toHaveBeenCalled();

    // Complete the new 300 ms window.
    await act(async () => {
      vi.advanceTimersByTime(150);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Only the final key (GABC222) should have been fetched, exactly once.
    expect(loadAccountMock).toHaveBeenCalledTimes(1);
    expect(loadAccountMock).toHaveBeenCalledWith("GABC222");
  });

  // ── 4. Polling ticks are NOT debounced ────────────────────────────────────

  it("polling-interval ticks fire on schedule and are not debounced", async () => {
    renderHook(() =>
      useStellarAccount("GABC123", { debounceDelay: 100, refetchInterval: 500 })
    );

    // No call before debounce fires.
    expect(loadAccountMock).not.toHaveBeenCalled();

    // Fire the initial debounced fetch.
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadAccountMock).toHaveBeenCalledTimes(1);

    // Advance one polling interval — this must fire without debounce.
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadAccountMock).toHaveBeenCalledTimes(2);
  });

  // ── 5. Backward compat: no debounceDelay fires immediately ────────────────

  it("fires immediately (backward compat) when debounceDelay is omitted", async () => {
    renderHook(() => useStellarAccount("GABC123"));

    // No fake-timer advancement needed — the synchronous part of the effect
    // runs inline. Drain microtasks so the async fetch can kick off.
    await act(async () => {
      await Promise.resolve();
    });

    expect(loadAccountMock).toHaveBeenCalledTimes(1);
  });

  it("fires immediately (backward compat) when debounceDelay is 0", async () => {
    renderHook(() => useStellarAccount("GABC123", { debounceDelay: 0 }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadAccountMock).toHaveBeenCalledTimes(1);
  });
});
