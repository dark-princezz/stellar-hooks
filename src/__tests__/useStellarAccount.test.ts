/**
 * @file useStellarAccount.test.ts
 * @description Unit tests for the useStellarAccount hook.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useStellarAccount } from "../hooks/useStellarAccount";
import { Horizon } from "@stellar/stellar-sdk";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const actualMockLoadAccount = vi.fn();

vi.mock("../utils/memoizedServers", () => {
  return {
    getHorizonServer: vi.fn().mockReturnValue({
      loadAccount: (pubKey: string) => actualMockLoadAccount(pubKey),
    }),
    clearMemoizedServers: vi.fn(),
  };
});

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    StrKey: {
      ...(actual.StrKey as object),
      isValidEd25519PublicKey: vi.fn().mockImplementation((val: unknown) => {
        if (!val || val === "invalid-key") return false;
        return true;
      }),
    },
  };
});

vi.mock("../context", () => ({
  useStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
    },
  }),
}));

const mockLoadAccount = actualMockLoadAccount;

const XLM_ONLY_RESPONSE = {
  account_id: "GABC...",
  sequence: "123",
  subentry_count: 0,
  thresholds: { low_threshold: 0, med_threshold: 0, high_threshold: 0 },
  flags: { auth_required: false, auth_revocable: false, auth_immutable: false, auth_clawback_enabled: false },
  balances: [
    { asset_type: "native", balance: "100.0000000", buying_liabilities: "0.0000000", selling_liabilities: "0.0000000" },
  ],
} as unknown as Horizon.AccountResponse;

const MULTI_ASSET_RESPONSE = {
  account_id: "GABC...",
  sequence: "123",
  subentry_count: 2,
  thresholds: { low_threshold: 0, med_threshold: 0, high_threshold: 0 },
  flags: { auth_required: false, auth_revocable: false, auth_immutable: false, auth_clawback_enabled: false },
  balances: [
    { asset_type: "native", balance: "100.0000000", buying_liabilities: "0.0000000", selling_liabilities: "0.0000000" },
    { asset_type: "credit_alphanum4", asset_code: "USDC", asset_issuer: "GABC...", balance: "50.0000000", buying_liabilities: "0.0000000", selling_liabilities: "0.0000000", limit: "1000.0000000" },
    { asset_type: "credit_alphanum12", asset_code: "STELLAR", asset_issuer: "GXYZ...", balance: "10.0000000", buying_liabilities: "0.0000000", selling_liabilities: "0.0000000", limit: "1000.0000000" },
  ],
} as unknown as Horizon.AccountResponse;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useStellarAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles account with no trustlines (XLM only)", async () => {
    mockLoadAccount.mockResolvedValueOnce(XLM_ONLY_RESPONSE);

    const { result } = renderHook(() => useStellarAccount("GABC..."));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.balances).toHaveLength(1);
    expect(result.current.data?.balances[0].isNative).toBe(true);
    expect(result.current.data?.balances[0].balance).toBe("100.0000000");
  });

  it("handles account with multiple custom assets", async () => {
    mockLoadAccount.mockResolvedValueOnce(MULTI_ASSET_RESPONSE);

    const { result } = renderHook(() => useStellarAccount("GABC..."));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.balances).toHaveLength(3);
    expect(result.current.data?.balances.find(b => b.assetCode === "USDC")).toBeDefined();
    expect(result.current.data?.balances.find(b => b.assetCode === "STELLAR")).toBeDefined();
  });

  it("handles null publicKey by resetting state", async () => {
    const { result } = renderHook(() => useStellarAccount(null));

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockLoadAccount).not.toHaveBeenCalled();
  });

  it("respects the disabled state (enabled: false)", async () => {
    const { result } = renderHook(() => useStellarAccount("GABC...", { enabled: false }));

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockLoadAccount).not.toHaveBeenCalled();
  });

  it("handles fetch errors correctly", async () => {
    const error = new Error("Account not found");
    mockLoadAccount.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useStellarAccount("GABC..."));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe(error);
    expect(result.current.data).toBeNull();
  });
});
