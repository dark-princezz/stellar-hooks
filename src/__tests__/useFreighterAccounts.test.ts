/**
 * @file useFreighterAccounts.test.ts
 * @description Unit tests for the multi-account useFreighterAccounts hook.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useFreighterAccounts } from "../hooks/useFreighterAccounts";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockRequestAccess = vi.hoisted(() => vi.fn());
const mockUseFreighter = vi.hoisted(() => vi.fn());

vi.mock("@stellar/freighter-api", async () => {
  const actual = await vi.importActual("@stellar/freighter-api") as Record<string, unknown>;
  return {
    ...actual,
    requestAccess: mockRequestAccess,
  };
});

vi.mock("../hooks/useFreighter", () => ({
  useFreighter: () => mockUseFreighter(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const KEY_A = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAR7M4";
const KEY_B = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBGQ";
const KEY_C = "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCO";

const STORAGE_KEY = "stellar-hooks:freighter-accounts";

function buildFreighterState(publicKey: string | null = null) {
  return {
    publicKey,
    network: null,
    networkPassphrase: null,
    isInstalled: true,
    isConnected: !!publicKey,
    isLoading: false,
    error: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    signTransaction: vi.fn(),
    signAuthEntry: vi.fn(),
    signBlob: vi.fn(),
    networkPassphraseMismatch: false,
    networkPassphraseWarning: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  mockUseFreighter.mockImplementation(() => buildFreighterState(null));
  mockRequestAccess.mockResolvedValue({ address: null, error: { message: "denied" } });
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useFreighterAccounts", () => {
  it("initialises with an empty known list when localStorage is empty", () => {
    const { result } = renderHook(() => useFreighterAccounts());
    expect(result.current.known).toEqual([]);
    expect(result.current.active).toBeNull();
    expect(result.current.isSwitching).toBe(false);
  });

  it("hydrates known accounts from localStorage on mount", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([KEY_A, KEY_B]));
    const { result } = renderHook(() => useFreighterAccounts());
    expect(result.current.known).toEqual([KEY_A, KEY_B]);
  });

  it("tolerates malformed localStorage payloads (returns [])", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not-json");
    const { result } = renderHook(() => useFreighterAccounts());
    expect(result.current.known).toEqual([]);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: "an array" }));
    const { result: r2 } = renderHook(() => useFreighterAccounts());
    expect(r2.current.known).toEqual([]);
  });

  it("prepends the active address to the known list when it changes", async () => {
    mockUseFreighter.mockImplementation(() => buildFreighterState(KEY_A));
    const { result, rerender } = renderHook(() => useFreighterAccounts());

    await waitFor(() => expect(result.current.active).toBe(KEY_A));
    expect(result.current.known[0]).toBe(KEY_A);

    mockUseFreighter.mockImplementation(() => buildFreighterState(KEY_B));
    rerender();

    await waitFor(() => expect(result.current.active).toBe(KEY_B));
    expect(result.current.known[0]).toBe(KEY_B);
    expect(result.current.known).toContain(KEY_A);
  });

  it("deduplicates the known list (the active address moves to the front, not the end)", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([KEY_C, KEY_B, KEY_A]),
    );
    mockUseFreighter.mockImplementation(() => buildFreighterState(KEY_A));
    const { result } = renderHook(() => useFreighterAccounts());

    await waitFor(() => expect(result.current.known[0]).toBe(KEY_A));
    expect(result.current.known).toEqual([KEY_A, KEY_C, KEY_B].slice(0, 3));
    // KEY_A must NOT appear twice.
    const occurrences = result.current.known.filter((k) => k === KEY_A).length;
    expect(occurrences).toBe(1);
  });

  it("caps the known list at maxHistory", () => {
    const many = Array.from({ length: 100 }, (_, i) => `G${String(i).padStart(55, "A")}`);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(many));

    const { result } = renderHook(() => useFreighterAccounts({ maxHistory: 5 }));
    expect(result.current.known).toHaveLength(5);
  });

  it("forget() removes a specific address and persists", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([KEY_A, KEY_B, KEY_C]));
    const { result } = renderHook(() => useFreighterAccounts());

    act(() => result.current.forget(KEY_B));
    expect(result.current.known).toEqual([KEY_A, KEY_C]);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual([KEY_A, KEY_C]);
  });

  it("clear() empties the list AND localStorage", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([KEY_A, KEY_B]));
    const { result } = renderHook(() => useFreighterAccounts());

    act(() => result.current.clear());
    expect(result.current.known).toEqual([]);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("[]");
  });

  it("remember() moves the supplied address to the front", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([KEY_C, KEY_B]));
    const { result } = renderHook(() => useFreighterAccounts());

    act(() => result.current.remember(KEY_A));
    expect(result.current.known[0]).toBe(KEY_A);
    expect(result.current.known).toContain(KEY_B);
    expect(result.current.known).toContain(KEY_C);
  });

  it("switchAccount() drives requestAccess, adds the new address, and returns it", async () => {
    mockRequestAccess.mockResolvedValue({ address: KEY_A, error: null });
    const { result } = renderHook(() => useFreighterAccounts());

    let switched: string | null = null;
    await act(async () => {
      switched = await result.current.switchAccount(KEY_A);
    });

    expect(switched).toBe(KEY_A);
    expect(mockRequestAccess).toHaveBeenCalledTimes(1);
    expect(result.current.known[0]).toBe(KEY_A);
    expect(result.current.isSwitching).toBe(false);
  });

  it("switchAccount() returns null on user rejection / error", async () => {
    mockRequestAccess.mockResolvedValue({ address: null, error: { message: "user denied" } });
    const { result } = renderHook(() => useFreighterAccounts());

    let switched: string | null = "sentinel";
    await act(async () => {
      switched = await result.current.switchAccount();
    });

    expect(switched).toBeNull();
    expect(result.current.isSwitching).toBe(false);
  });

  it("switchAccount() toggles isSwitching for the duration of the call", async () => {
    let resolveFn!: (value: { address: string | null; error: { message: string } | null }) => void;
    mockRequestAccess.mockImplementation(
      () =>
        new Promise<{ address: string | null; error: { message: string } | null }>((resolve) => {
          resolveFn = resolve;
        }),
    );

    const { result } = renderHook(() => useFreighterAccounts());

    let switchPromise: Promise<string | null> = Promise.resolve();
    act(() => {
      switchPromise = result.current.switchAccount();
    });

    expect(result.current.isSwitching).toBe(true);

    await act(async () => {
      resolveFn({ address: KEY_A, error: null });
      await switchPromise;
    });

    expect(result.current.isSwitching).toBe(false);
  });

  it("find() returns the target iff it's in the known list", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([KEY_A, KEY_B]));
    const { result } = renderHook(() => useFreighterAccounts());

    expect(result.current.find(KEY_A)).toBe(KEY_A);
    expect(result.current.find(KEY_C)).toBeNull();
    expect(result.current.find(null)).toBeNull();
  });

  it("honours a custom storageKey", () => {
    const customKey = "my-app:custom-freighter";
    window.localStorage.setItem(customKey, JSON.stringify([KEY_C]));
    const { result } = renderHook(() =>
      useFreighterAccounts({ storageKey: customKey }),
    );
    expect(result.current.known).toEqual([KEY_C]);
  });
});
