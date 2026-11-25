import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { formatTokenAmount, parseTokenAmount } from "./tokenAmount";

/** Stellar token decimals range we generate across. */
const MAX_DECIMALS = 18;

/** Arbitrary integer token decimals value. */
const decimalsArb = fc.integer({ min: 0, max: MAX_DECIMALS });

/** Arbitrary raw base-unit amount, including zero, negatives and very large values. */
const rawAmountArb = fc.bigInt({ min: -(10n ** 40n), max: 10n ** 40n });

/**
 * Arbitrary canonical decimal string: no leading zeros, no trailing zeros in
 * the fraction, no `-0`, and at most `decimals` fractional digits.
 */
const canonicalAmountArb = decimalsArb.chain((decimals) =>
  fc
    .tuple(
      fc.bigInt({ min: 0n, max: 10n ** 40n }),
      fc.bigInt({ min: 0n, max: 10n ** BigInt(decimals) - 1n }),
      fc.boolean()
    )
    .map(([whole, fractionRaw, negative]) => {
      const wholeText = whole.toString();
      const fractionText =
        decimals === 0
          ? ""
          : fractionRaw
              .toString()
              .padStart(decimals, "0")
              .replace(/0+$/, "");
      const body = fractionText ? `${wholeText}.${fractionText}` : wholeText;
      const isZero = whole === 0n && fractionRaw === 0n;
      return {
        text: negative && !isZero ? `-${body}` : body,
        decimals,
      };
    })
);

describe("token amount conversion properties", () => {
  it("round-trips raw base units through formatTokenAmount and parseTokenAmount", () => {
    fc.assert(
      fc.property(rawAmountArb, decimalsArb, (raw, decimals) => {
        const formatted = formatTokenAmount(raw, decimals);
        expect(parseTokenAmount(formatted, decimals)).toBe(raw);
      }),
      { numRuns: 500 }
    );
  });

  it("round-trips canonical decimal strings through parseTokenAmount and formatTokenAmount", () => {
    fc.assert(
      fc.property(canonicalAmountArb, ({ text, decimals }) => {
        const parsed = parseTokenAmount(text, decimals);
        expect(formatTokenAmount(parsed, decimals)).toBe(text);
      }),
      { numRuns: 500 }
    );
  });

  it("never emits more fractional digits than the token supports", () => {
    fc.assert(
      fc.property(rawAmountArb, decimalsArb, (raw, decimals) => {
        const formatted = formatTokenAmount(raw, decimals);
        const fraction = formatted.split(".")[1] ?? "";
        expect(fraction.length).toBeLessThanOrEqual(decimals);
      }),
      { numRuns: 500 }
    );
  });

  it("emits canonical output with no trailing fractional zeros", () => {
    fc.assert(
      fc.property(rawAmountArb, decimalsArb, (raw, decimals) => {
        const formatted = formatTokenAmount(raw, decimals);
        expect(formatted).not.toMatch(/\.\d*0$/);
        expect(formatted).not.toMatch(/^-?\./);
        expect(formatted).not.toMatch(/^-0$/);
      }),
      { numRuns: 500 }
    );
  });

  it("preserves precision for amounts beyond Number.MAX_SAFE_INTEGER", () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: BigInt(Number.MAX_SAFE_INTEGER), max: 10n ** 40n }),
        decimalsArb,
        (raw, decimals) => {
          expect(parseTokenAmount(formatTokenAmount(raw, decimals), decimals)).toBe(raw);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("rejects one fractional digit more than the token supports", () => {
    fc.assert(
      fc.property(canonicalAmountArb, ({ text, decimals }) => {
        // Only meaningful when the canonical form already uses every allowed digit.
        const unsigned = text.replace("-", "");
        const [whole, fraction = ""] = unsigned.split(".");
        fc.pre(fraction.length === decimals);
        const sign = text.startsWith("-") ? "-" : "";
        expect(() => parseTokenAmount(`${sign}${whole}.${fraction}0`, decimals)).toThrow(
          RangeError
        );
      }),
      { numRuns: 200 }
    );
  });
});
