import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { Asset } from "@stellar/stellar-sdk";

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: { horizonUrl: "https://horizon.example.com/" },
  }),
}));

import { useTradeHistory } from "../hooks/useTradeHistory";

const native = { isNative: () => true, getCode: () => "XLM", getIssuer: () => "" } as unknown as Asset;
const counter = {
  isNative: () => false,
  getCode: () => "USDC",
  getIssuer: () => "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
} as unknown as Asset;

describe("useTradeHistory", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("normalizes trades and omits counterparty accounts", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        _embedded: {
          records: [
            {
              id: "trade-1",
              paging_token: "cursor-1",
              ledger_close_time: "2026-01-01T00:00:00Z",
              trade_type: "orderbook",
              base_amount: "10",
              base_asset_type: "native",
              counter_amount: "9.5",
              counter_asset_type: "credit_alphanum4",
              counter_asset_code: "USDC",
              price: { n: 95, d: 100 },
              base_account: "GBASE",
              counter_account: "GCOUNTER",
            },
          ],
        },
        _links: { next: { href: "https://horizon.example.com/trades?cursor=cursor-2" } },
      }),
    } as Response);

    const { result } = renderHook(() =>
      useTradeHistory({ baseAsset: native, counterAsset: counter, limit: 5 })
    );

    await waitFor(() => expect(result.current.trades).toHaveLength(1));
    expect(result.current.trades[0]).toMatchObject({
      id: "trade-1",
      price: 0.95,
      baseAssetCode: "XLM",
      counterAssetCode: "USDC",
      baseAssetIssuer: null,
    });
    expect(result.current.nextCursor).toBe("cursor-2");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("base_asset_type=native"),
      expect.objectContaining({ signal: expect.anything() })
    );
  });
});
