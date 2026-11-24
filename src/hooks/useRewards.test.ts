import { describe, it, expect } from "vitest";
import { formatUnits } from "./useRewards";
import { parseBridgeQuote } from "./useBridgeQuote";

describe("formatUnits", () => {
  it("formats base units without float math", () => {
    expect(formatUnits(125_000_000n, 7)).toBe("12.5");
    expect(formatUnits(1n, 7)).toBe("0.0000001");
    expect(formatUnits(0n, 7)).toBe("0");
    expect(formatUnits(-5_000_000n, 7)).toBe("-0.5");
  });
});

describe("parseBridgeQuote", () => {
  it("maps a valid response", () => {
    expect(parseBridgeQuote({ fee: 1, outputAmount: "99", estimatedSeconds: 60 })).toEqual({
      fee: "1",
      outputAmount: "99",
      estimatedSeconds: 60,
      quoteId: undefined,
    });
  });
  it("rejects malformed responses", () => {
    expect(() => parseBridgeQuote({})).toThrow();
  });
});
