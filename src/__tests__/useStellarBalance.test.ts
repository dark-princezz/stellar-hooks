import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react-hooks";

const mockUseStellarAccount = vi.hoisted(() =>
  vi.fn(() => ({
    data: {
      accountId: "GABC123",
      balances: [
        {
          assetType: "native",
          assetCode: undefined,
          assetIssuer: undefined,
          balance: "100.0000000",
          balanceFloat: 100,
          buyingLiabilities: "0.0000000",
          sellingLiabilities: "0.0000000",
          isNative: true,
        },
      ],
      sequence: "1",
      subentryCount: 0,
      thresholds: { lowThreshold: 0, medThreshold: 0, highThreshold: 0 },
      flags: {
        authRequired: false,
        authRevocable: false,
        authImmutable: false,
        authClawbackEnabled: false,
      },
      raw: {} as unknown as import("@stellar/stellar-sdk").Horizon.AccountResponse,
    },
    isLoading: false,
    error: null,
    lastFetchedAt: new Date("2026-01-01T00:00:00.000Z"),
    refetch: vi.fn(),
  }))
);

vi.mock("../hooks/useStellarAccount", () => ({
  useStellarAccount: mockUseStellarAccount,
}));

import * as accountHook from "../hooks/useStellarAccount";
import { useStellarBalance } from "../hooks/useStellarBalance";

const mockRefetch = vi.fn();

describe("useStellarBalance", () => {
  it("exposes balances and the native XLM entry", () => {
    const { result } = renderHook(() => useStellarBalance("GABC123"));

    expect(result.current.balances).toHaveLength(1);
    expect(result.current.xlmBalance).toEqual(
      expect.objectContaining({ assetType: "native", balanceFloat: 100 })
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.refetch).toBe("function");
  });

  it("returns null xlmBalance when there is no native asset", () => {
    vi.mocked(accountHook.useStellarAccount).mockReturnValueOnce({
      data: {
        accountId: "GDEF456",
        balances: [
          {
            assetType: "credit_alphanum4",
            assetCode: "USDC",
            assetIssuer: "GISSUER",
            balance: "10.0000000",
            balanceFloat: 10,
            buyingLiabilities: "0.0000000",
            sellingLiabilities: "0.0000000",
            limit: "1000.0000000",
            isNative: false,
          },
        ],
        sequence: "1",
        subentryCount: 0,
        thresholds: { lowThreshold: 0, medThreshold: 0, highThreshold: 0 },
        flags: {
          authRequired: false,
          authRevocable: false,
          authImmutable: false,
          authClawbackEnabled: false,
        },
        raw: {} as unknown as import("@stellar/stellar-sdk").Horizon.AccountResponse,
      },
      isLoading: false,
      error: null,
      lastFetchedAt: new Date("2026-01-01T00:00:00.000Z"),
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useStellarBalance("GDEF456"));
    expect(result.current.balances).toHaveLength(1);
    expect(result.current.xlmBalance).toBeNull();
  });
});
