import { describe, it, expect } from "vitest";
import {
  DEFAULT_SLIPPAGE_BPS,
  getSlippageBps,
  isValidSlippageBps,
  minReceived,
  setSlippageBps,
} from "./slippage";
import { computePriceImpactBps, parseRouterQuote } from "../hooks/useSwapQuote";

describe("slippage", () => {
  it("validates range and integers", () => {
    expect(isValidSlippageBps(50)).toBe(true);
    expect(isValidSlippageBps(0)).toBe(false);
    expect(isValidSlippageBps(5001)).toBe(false);
    expect(isValidSlippageBps(1.5)).toBe(false);
  });
  it("computes minimum received rounding down", () => {
    expect(minReceived(10_000n, 50)).toBe(9_950n);
    expect(minReceived(99n, 100)).toBe(98n);
    expect(() => minReceived(1n, 0)).toThrow();
  });
  it("rejects invalid updates and keeps the old value", () => {
    setSlippageBps(100);
    expect(() => setSlippageBps(0)).toThrow();
    expect(getSlippageBps()).toBe(100);
    setSlippageBps(DEFAULT_SLIPPAGE_BPS);
  });
});

describe("quote helpers", () => {
  it("computes price impact", () => {
    expect(computePriceImpactBps(95n, 100n)).toBe(500);
    expect(computePriceImpactBps(100n, 100n)).toBe(0);
    expect(computePriceImpactBps(1n, 0n)).toBeNull();
  });
  it("maps router output including route and impact", () => {
    expect(
      parseRouterQuote({ amount_out: 90n, route: ["CA", "CB"], reference_out: 100n }),
    ).toEqual({ amountOut: 90n, route: ["CA", "CB"], priceImpactBps: 1000 });
  });
});
