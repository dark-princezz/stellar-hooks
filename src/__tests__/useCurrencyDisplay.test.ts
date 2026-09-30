/**
 * @file useCurrencyDisplay.test.ts
 * @description Tests for the locale-aware native and fiat display hook (#948).
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCurrencyDisplay } from "../hooks/useCurrencyDisplay";

describe("useCurrencyDisplay (#948)", () => {
  it("renders the native amount with its asset code", () => {
    const { result } = renderHook(() =>
      useCurrencyDisplay({
        amount: "12.5",
        assetCode: "XLM",
        locale: "en-US",
      }),
    );

    expect(result.current.assetText).toBe("12.5 XLM");
    expect(result.current.fiatText).toBeNull();
    expect(result.current.fiatValue).toBeNull();
    expect(result.current.combinedText).toBe("12.5 XLM");
  });

  it("converts to a fiat figure when a rate is supplied", () => {
    const { result } = renderHook(() =>
      useCurrencyDisplay({
        amount: "12.5",
        assetCode: "XLM",
        fiatRate: 0.114,
        fiatCurrency: "USD",
        locale: "en-US",
      }),
    );

    expect(result.current.fiatText).toBe("$1.43");
    expect(result.current.fiatValue).toBeCloseTo(1.425, 6);
    expect(result.current.combinedText).toBe("12.5 XLM (~$1.43)");
  });

  it("groups thousands and keeps the locale's separators", () => {
    const { result } = renderHook(() =>
      useCurrencyDisplay({
        amount: "1234567.89",
        assetCode: "USDC",
        locale: "de-DE",
      }),
    );

    // German grouping is a dot and the decimal separator is a comma.
    expect(result.current.assetText).toBe("1.234.567,89 USDC");
  });

  it("treats a non-finite rate or amount as unknown rather than zero", () => {
    const badRate = renderHook(() =>
      useCurrencyDisplay({
        amount: "10",
        assetCode: "XLM",
        fiatRate: Number.NaN,
        fiatCurrency: "USD",
        locale: "en-US",
      }),
    );
    expect(badRate.result.current.fiatText).toBeNull();
    expect(badRate.result.current.combinedText).toBe("10 XLM");

    const badAmount = renderHook(() =>
      useCurrencyDisplay({
        amount: "not a number",
        assetCode: "XLM",
        fiatRate: 1,
        fiatCurrency: "USD",
        locale: "en-US",
      }),
    );
    // The helper falls back to its own default for the native figure, and no
    // fiat figure is invented from an unreadable amount.
    expect(badAmount.result.current.fiatText).toBeNull();
  });

  it("honours a caller-supplied currency and digit count", () => {
    const { result } = renderHook(() =>
      useCurrencyDisplay({
        amount: 1000,
        assetCode: "XLM",
        fiatRate: 0.5,
        fiatCurrency: "EUR",
        locale: "en-US",
        fiatDigits: 0,
      }),
    );

    expect(result.current.fiatText).toBe("€500");
    expect(result.current.fiatValue).toBe(500);
  });

  it("omits the asset code when none is given", () => {
    const { result } = renderHook(() =>
      useCurrencyDisplay({ amount: "3", locale: "en-US" }),
    );

    expect(result.current.assetText).toBe("3");
  });

  it("forwards formatting overrides to the amount helper", () => {
    const { result } = renderHook(() =>
      useCurrencyDisplay({
        amount: "100.5000000",
        assetCode: "XLM",
        locale: "en-US",
        formatOptions: { maximumFractionDigits: 7 },
      }),
    );

    // The hook adds no precision of its own; the helper's default formatting
    // stands unless the caller overrides a specific option.
    expect(result.current.assetText).toBe("100.5 XLM");
  });
});
