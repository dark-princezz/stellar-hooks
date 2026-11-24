/**
 * @file slippage.ts
 * @description Shared, validated slippage tolerance used by every swap-related hook.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useSyncExternalStore } from "react";

/** Slippage is expressed in basis points (100 bps = 1%). */
export const DEFAULT_SLIPPAGE_BPS = 50;
export const MIN_SLIPPAGE_BPS = 1;
export const MAX_SLIPPAGE_BPS = 5000;
const STORAGE_KEY = "stellar-hooks:slippage-bps";

/** True if `bps` is an integer within the allowed range. */
export function isValidSlippageBps(bps: unknown): bps is number {
  return (
    typeof bps === "number" &&
    Number.isInteger(bps) &&
    bps >= MIN_SLIPPAGE_BPS &&
    bps <= MAX_SLIPPAGE_BPS
  );
}

/** Throws a descriptive error for an invalid tolerance; returns it otherwise. */
export function assertSlippageBps(bps: number): number {
  if (!isValidSlippageBps(bps)) {
    throw new Error(
      `Slippage must be an integer between ${MIN_SLIPPAGE_BPS} and ${MAX_SLIPPAGE_BPS} bps (got ${bps}).`,
    );
  }
  return bps;
}

/** Minimum amount received for `amountOut` at the given tolerance (rounded down). */
export function minReceived(amountOut: bigint, slippageBps: number): bigint {
  assertSlippageBps(slippageBps);
  return (amountOut * BigInt(10_000 - slippageBps)) / 10_000n;
}

// ─── Shared store ────────────────────────────────────────────────────────────

let current = DEFAULT_SLIPPAGE_BPS;
const listeners = new Set<() => void>();

try {
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  if (stored !== null && isValidSlippageBps(Number(stored))) current = Number(stored);
} catch {
  /* storage unavailable: keep default */
}

export function getSlippageBps(): number {
  return current;
}

/** Validate, persist (best-effort) and broadcast a new tolerance. */
export function setSlippageBps(bps: number): void {
  current = assertSlippageBps(bps);
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, String(bps));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/**
 * Read and update the shared slippage tolerance (basis points). All swap hooks
 * default to this value, so changing it here changes it everywhere.
 *
 * @example
 * ```tsx
 * const { slippageBps, setSlippageBps } = useSlippageTolerance();
 * ```
 */
export function useSlippageTolerance() {
  const slippageBps = useSyncExternalStore(subscribe, getSlippageBps, () => DEFAULT_SLIPPAGE_BPS);
  const set = useCallback((bps: number) => setSlippageBps(bps), []);
  return { slippageBps, setSlippageBps: set };
}
