/**
 * Tests for stellar-hooks utilities and type shapes.
 * Full hook tests require a React test renderer — add @testing-library/react
 * and mock @stellar/freighter-api + @stellar/stellar-sdk for integration tests.
 */

import { describe, it, expect } from "vitest";
import { parseAccountResponse } from "../utils";
import { NETWORK_CONFIGS } from "../types";
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
});
