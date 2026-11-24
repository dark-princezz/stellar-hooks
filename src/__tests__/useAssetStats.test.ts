import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: { horizonUrl: "https://horizon.example.com" },
  }),
}));

import { useAssetStats } from "../hooks/useAssetStats";

const issuer = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

describe("useAssetStats", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("combines asset supply, holders, and recent trading activity", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          _embedded: {
            records: [
              {
                asset_code: "USDC",
                asset_issuer: issuer,
                amount: "1000000",
                num_accounts: 42,
                accounts: { authorized: 40 },
                claimable_balances_amount: "100",
                liquidity_pools_amount: "200",
                contracts_amount: "300",
              },
            ],
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          _embedded: { records: [{ price: { n: 101, d: 100 } }] },
        }),
      } as Response);

    const { result } = renderHook(() =>
      useAssetStats({ assetCode: "USDC", assetIssuer: issuer })
    );

    await waitFor(() => expect(result.current.stats).not.toBeNull());
    expect(result.current.stats).toMatchObject({
      assetCode: "USDC",
      totalSupply: "1000000",
      holders: 42,
      authorizedHolders: 40,
      tradeCount: null,
      recentTradePrice: 1.01,
    });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/assets?"), expect.anything());
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/trades?"), expect.anything());
  });
});
