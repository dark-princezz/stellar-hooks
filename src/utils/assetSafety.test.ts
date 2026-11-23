import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  WELL_KNOWN_ASSETS,
  normalizeAssetCode,
  checkAssetCodeSafety,
  isSuspiciousAssetCode,
  checkAssetBalanceSafety,
  useAssetSafety,
} from "./assetSafety";
import type { StellarBalance } from "../types";
import { unsafeAsAssetIssuer, unsafeAsWholeUnitAmount } from "../types";

// Confusable characters built from code points so the file stays ASCII-safe:
// Ѕ U+0405 → S, С U+0421 → C, Ο U+039F (Greek omicron) → O, Ε U+0395 → E
const CYRILLIC_S = "Ѕ";
const CYRILLIC_C = "С";
const GREEK_O = "Ο";
const GREEK_E = "Ε";
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

describe("normalizeAssetCode", () => {
  it("uppercases and trims plain codes", () => {
    expect(normalizeAssetCode("  usdc ")).toBe("USDC");
  });

  it("folds Cyrillic lookalikes to ASCII", () => {
    expect(normalizeAssetCode(`U${CYRILLIC_S}D${CYRILLIC_C}`)).toBe("USDC");
  });

  it("folds Greek lookalikes to ASCII", () => {
    expect(normalizeAssetCode(`${GREEK_E}URC`)).toBe("EURC");
    expect(normalizeAssetCode(`US${GREEK_O}C`)).toBe("USOC"); // Ο is not in USDC; stays different
  });
});

describe("checkAssetCodeSafety", () => {
  it("does not flag a well-known code", () => {
    const report = checkAssetCodeSafety("USDC");
    expect(report.flagged).toBe(false);
    expect(report.matches).toHaveLength(0);
  });

  it("does not flag the native XLM code", () => {
    expect(checkAssetCodeSafety("XLM").flagged).toBe(false);
  });

  it("does not flag an unrelated code", () => {
    expect(checkAssetCodeSafety("WXYZ").flagged).toBe(false);
    expect(checkAssetCodeSafety("").flagged).toBe(false);
  });

  it("flags a code that differs only by confusable characters", () => {
    const report = checkAssetCodeSafety(`U${CYRILLIC_S}D${CYRILLIC_C}`);
    expect(report.flagged).toBe(true);
    expect(report.normalizedCode).toBe("USDC");
    expect(report.matches[0].code).toBe("USDC");
    expect(report.matches[0].reasons).toContain("confusable-characters");
  });

  it("flags codes one edit away from a well-known code", () => {
    const report = checkAssetCodeSafety("USDO");
    expect(report.flagged).toBe(true);
    expect(report.matches.map((m) => m.code)).toContain("USDC");
    expect(report.matches[0].reasons).toContain("similar-code");
  });

  it("flags a well-known code issued by a non-canonical issuer", () => {
    const report = checkAssetCodeSafety(
      "USDC",
      "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
    );
    expect(report.flagged).toBe(true);
    expect(report.matches[0].reasons).toContain("issuer-mismatch");
  });

  it("does not flag a well-known code with its canonical issuer", () => {
    expect(checkAssetCodeSafety("USDC", USDC_ISSUER).flagged).toBe(false);
    expect(checkAssetCodeSafety("EURC", "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2").flagged).toBe(false);
  });

  it("does not flag a well-known code with no issuer info when issuer is unknown", () => {
    // USDT has no pinned canonical issuer → no issuer check possible.
    expect(checkAssetCodeSafety("USDT", "GANYISSUER").flagged).toBe(false);
  });

  it("treats case-only differences as safe", () => {
    expect(checkAssetCodeSafety("usdc").flagged).toBe(false);
  });

  it("supports a custom well-known asset list", () => {
    const custom = [{ code: "FOO" }];
    expect(checkAssetCodeSafety("FOO", undefined, custom).flagged).toBe(false);
    expect(checkAssetCodeSafety("FOO", undefined, WELL_KNOWN_ASSETS).flagged).toBe(false);
    const near = checkAssetCodeSafety("FOO", undefined, [{ code: "FOOD" }]);
    expect(near.flagged).toBe(true);
  });
});

describe("isSuspiciousAssetCode", () => {
  it("returns a boolean summary", () => {
    expect(isSuspiciousAssetCode(`U${CYRILLIC_S}D${CYRILLIC_C}`)).toBe(true);
    expect(isSuspiciousAssetCode("USDC")).toBe(false);
  });
});

describe("checkAssetBalanceSafety", () => {
  const baseBalance = {
    assetType: "credit_alphanum4",
    balance: unsafeAsWholeUnitAmount("10.0000000"),
    balanceFloat: 10,
    buyingLiabilities: unsafeAsWholeUnitAmount("0.0000000"),
    sellingLiabilities: unsafeAsWholeUnitAmount("0.0000000"),
    isNative: false,
  } as Omit<StellarBalance, "assetCode">;

  it("returns null for native balances", () => {
    const native = { ...baseBalance, isNative: true, assetCode: undefined } as StellarBalance;
    expect(checkAssetBalanceSafety(native)).toBeNull();
  });

  it("checks credit asset codes with their issuer", () => {
    const balance = {
      ...baseBalance,
      assetCode: "USDC",
      assetIssuer: unsafeAsAssetIssuer(USDC_ISSUER),
    } as StellarBalance;
    expect(checkAssetBalanceSafety(balance)?.flagged).toBe(false);
  });
});

describe("useAssetSafety", () => {
  it("returns a memoized checker that flags confusable codes", () => {
    const { result } = renderHook(() => useAssetSafety());
    expect(result.current(`U${CYRILLIC_S}D${CYRILLIC_C}`).flagged).toBe(true);
    expect(result.current("USDC").flagged).toBe(false);
  });
});
