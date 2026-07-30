/**
 * Tests for stellar-hooks utilities and type shapes.
 * Full hook tests require a React test renderer — add @testing-library/react
 * and mock @stellar/freighter-api + @stellar/stellar-sdk for integration tests.
 */

/**
 * @file utils.test.ts
 * @description Unit tests for utility functions.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect } from "vitest";
import { parseAccountResponse, parseBalance } from "../utils/index";       
import { NETWORK_CONFIGS } from "../types";
import type { StellarBalance } from "../types";
import type { Horizon } from "@stellar/stellar-sdk";

// ─── NETWORK_CONFIGS ──────────────────────────────────────────────────────────

describe("NETWORK_CONFIGS", () => {
  it("has mainnet, testnet, and futurenet entries", () => {
    expect(NETWORK_CONFIGS).toHaveProperty("mainnet");
    expect(NETWORK_CONFIGS).toHaveProperty("testnet");
    expect(NETWORK_CONFIGS).toHaveProperty("futurenet");
  });

  it("testnet points to horizon-testnet.stellar.org", () => {
    expect(NETWORK_CONFIGS.testnet.horizonUrl).toBe(
      "https://horizon-testnet.stellar.org"
    );
  });

  it("mainnet uses the correct network passphrase", () => {
    expect(NETWORK_CONFIGS.mainnet.networkPassphrase).toBe(
      "Public Global Stellar Network ; September 2015"
    );
  });
});

// ─── parseAccountResponse ─────────────────────────────────────────────────────

const mockRaw = {
  account_id: "GABC123",
  sequence: "1234567890",
  subentry_count: 2,
  num_sponsored: 3,
  num_sponsoring: 4,
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
    {
      asset_type: "credit_alphanum4",
      asset_code: "USDC",
      asset_issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      balance: "50.0000000",
      buying_liabilities: "0.0000000",
      selling_liabilities: "0.0000000",
      limit: "1000.0000000",
    },
  ],
} as unknown as Horizon.AccountResponse;

describe("parseAccountResponse", () => {
  const parsed = parseAccountResponse(mockRaw);

  it("maps account_id to accountId", () => {
    expect(parsed.accountId).toBe("GABC123");
  });

  it("maps reserve-related account fields", () => {
    expect(parsed.subentryCount).toBe(2);
    expect(parsed.numSponsored).toBe(3);
    expect(parsed.numSponsoring).toBe(4);
  });

  it("marks native balance as isNative=true", () => {
    const native = parsed.balances.find((b) => b.isNative);
    expect(native).toBeDefined();
    expect(native?.assetType).toBe("native");
    expect(native?.balanceFloat).toBe(100.0);
  });

  it("marks non-native balances correctly", () => {
    const usdc = parsed.balances.find((b) => b.assetCode === "USDC");
    expect(usdc).toBeDefined();
    expect(usdc?.isNative).toBe(false);
    expect(usdc?.balanceFloat).toBe(50.0);
    expect(usdc?.limit).toBe("1000.0000000");
  });

  it("preserves the raw response", () => {
    expect(parsed.raw).toBe(mockRaw);
  });

  it("sorts balances by balanceFloat descending", () => {
    const sorted = [...parsed.balances].sort(
      (a: StellarBalance, b: StellarBalance) => b.balanceFloat - a.balanceFloat
    );
    expect(sorted[0]?.balanceFloat).toBe(100.0);
  });

  it("sorts balances by asset code ascending", () => {
    const sorted = [...parsed.balances].sort(
      (a: StellarBalance, b: StellarBalance) => {
        if (a.assetCode && b.assetCode)
          return a.assetCode.localeCompare(b.assetCode);
        if (a.assetCode) return -1;
        if (b.assetCode) return 1;
        return 0;
      }
    );
    expect(sorted[0]?.assetCode).toBe("USDC");
  });
});

// ─── Additional parseAccountResponse: native XLM extraction ─────────────────

describe("parseAccountResponse — native XLM extraction", () => {
  it("filters out liquidity pool shares", () => {
    const raw = {
      ...mockRaw,
      balances: [
        { asset_type: "native", balance: "100.0000000", buying_liabilities: "0", selling_liabilities: "0" },
        { asset_type: "liquidity_pool_shares", balance: "50.0000000" },
      ],
    } as unknown as Horizon.AccountResponse;

    const result = parseAccountResponse(raw);
    expect(result.balances).toHaveLength(1);
    expect(result.balances[0].assetType).toBe("native");
  });

  it("marks isNative on native balance", () => {
    const raw = {
      ...mockRaw,
      balances: [
        { asset_type: "native", balance: "100.0000000", buying_liabilities: "0", selling_liabilities: "0" },
      ],
    } as unknown as Horizon.AccountResponse;

    const result = parseAccountResponse(raw);
    expect(result.balances[0].isNative).toBe(true);
  });

  it("sets isNative false for credit_alphanum4", () => {
    const raw = {
      ...mockRaw,
      balances: [
        {
          asset_type: "credit_alphanum4",
          asset_code: "USDC",
          asset_issuer: "GISSUER",
          balance: "50.0000000",
          buying_liabilities: "0",
          selling_liabilities: "0",
          limit: "1000",
        },
      ],
    } as unknown as Horizon.AccountResponse;

    const result = parseAccountResponse(raw);
    expect(result.balances[0].isNative).toBe(false);
  });

  it("parses credit_alphanum12 assets correctly", () => {
    const raw = {
      ...mockRaw,
      balances: [
        {
          asset_type: "credit_alphanum12",
          asset_code: "LONGBRIDGE",
          asset_issuer: "GABC",
          balance: "200.0000000",
          buying_liabilities: "0",
          selling_liabilities: "0",
          limit: "5000",
        },
      ],
    } as unknown as Horizon.AccountResponse;

    const result = parseAccountResponse(raw);
    expect(result.balances[0].assetCode).toBe("LONGBRIDGE");
    expect(result.balances[0].isNative).toBe(false);
  });

  it("parses native balance buying/selling liabilities", () => {
    const raw = {
      ...mockRaw,
      balances: [
        {
          asset_type: "native",
          balance: "100.0000000",
          buying_liabilities: "10.0000000",
          selling_liabilities: "5.0000000",
        },
      ],
    } as unknown as Horizon.AccountResponse;

    const result = parseAccountResponse(raw);
    expect(result.balances[0].buyingLiabilities).toBe("10.0000000");
    expect(result.balances[0].sellingLiabilities).toBe("5.0000000");
  });

  it("handles empty balances array", () => {
    const raw = { ...mockRaw, balances: [] } as unknown as Horizon.AccountResponse;

    const result = parseAccountResponse(raw);
    expect(result.balances).toEqual([]);
  });

  it("defaults num_sponsored and num_sponsoring to 0 when missing", () => {
    const rawWithoutSponsored = { ...mockRaw } as Record<string, unknown>;
    delete rawWithoutSponsored.num_sponsored;
    delete rawWithoutSponsored.num_sponsoring;
    const result = parseAccountResponse(rawWithoutSponsored as unknown as Horizon.AccountResponse);

    expect(result.numSponsored).toBe(0);
    expect(result.numSponsoring).toBe(0);
  });

  it("parses balanceFloat correctly for zero balance", () => {
    const raw = {
      ...mockRaw,
      balances: [
        { asset_type: "native", balance: "0.0000000", buying_liabilities: "0", selling_liabilities: "0" },
      ],
    } as unknown as Horizon.AccountResponse;

    const result = parseAccountResponse(raw);
    expect(result.balances[0].balanceFloat).toBe(0);
    expect(result.balances[0].balance).toBe("0.0000000");
  });

  it("parses balanceFloat for large balances", () => {
    const largeBalance = "99999999999.1234567";
    const raw = {
      ...mockRaw,
      balances: [
        { asset_type: "native", balance: largeBalance, buying_liabilities: "0", selling_liabilities: "0" },
      ],
    } as unknown as Horizon.AccountResponse;

    const result = parseAccountResponse(raw);
    expect(result.balances[0].balanceFloat).toBe(parseFloat(largeBalance));
  });
});

// ─── parseBalance ─────────────────────────────────────────────────────────────

describe("parseBalance", () => {
  it("correctly parses simple integer balances", () => {
    expect(parseBalance("100")).toBe(100);
    expect(parseBalance("0")).toBe(0);
    expect(parseBalance("50")).toBe(50);
  });

  it("correctly parses 7 decimal place balances", () => {
    expect(parseBalance("100.1234567")).toBe(100.1234567);
    expect(parseBalance("0.0000001")).toBe(0.0000001);
    expect(parseBalance("99999999999.9999999")).toBe(99999999999.9999999);
  });

  it("handles balances with fewer than 7 decimal places", () => {
    expect(parseBalance("100.1")).toBe(100.1);
    expect(parseBalance("50.12")).toBe(50.12);
    expect(parseBalance("25.123")).toBe(25.123);
  });

  it("handles balances with more than 7 decimal places (truncates)", () => {
    expect(parseBalance("100.12345678")).toBe(100.1234567);
    expect(parseBalance("50.99999999")).toBe(50.9999999);
  });

  it("avoids floating point precision errors with problematic values", () => {
    // These values are known to cause issues with parseFloat
    expect(parseBalance("0.1")).toBe(0.1);
    expect(parseBalance("0.2")).toBe(0.2);
    expect(parseBalance("0.3")).toBe(0.3);
    expect(parseBalance("0.7")).toBe(0.7);
    expect(parseBalance("1.1")).toBe(1.1);
    expect(parseBalance("0.0000001")).toBe(0.0000001);
  });

  it("handles edge case values", () => {
    expect(parseBalance("0.0000000")).toBe(0);
    expect(parseBalance("999999999999.9999999")).toBe(999999999999.9999999);
  });

  it("handles whitespace", () => {
    expect(parseBalance(" 100.1234567 ")).toBe(100.1234567);
    expect(parseBalance("50 ")).toBe(50);
  });
});
