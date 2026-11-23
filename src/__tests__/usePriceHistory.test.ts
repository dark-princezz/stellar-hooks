import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { Asset } from "@stellar/stellar-sdk";

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: { horizonUrl: "https://horizon.example.com" },
  }),
}));

import { usePriceHistory } from "../hooks/usePriceHistory";

const native = { isNative: () => true, getCode: () => "XLM", getIssuer: () => "" } as unknown as Asset;
const counter = {
  isNative: () => false,
  getCode: () => "USDC",
  getIssuer: () => "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
} as unknown as Asset;

describe("usePriceHistory", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("normalizes Horizon aggregations into chart candles", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        _embedded: {
          records: [
            {
              timestamp: 1767225600000,
              trade_count: 12,
              base_volume: "100",
              counter_volume: "95",
              avg: "0.95",
              high: "0.99",
              low: "0.9",
              open: "0.91",
              close: "0.96",
            },
          ],
        },
      }),
    } as Response);

    const { result } = renderHook(() =>
      usePriceHistory({
        baseAsset: native,
        counterAsset: counter,
        resolution: 3_600_000,
        startTime: 1,
        endTime: 2,
      })
    );

    await waitFor(() => expect(result.current.candles).toHaveLength(1));
    expect(result.current.candles[0]).toEqual({
      timestamp: 1767225600000,
      open: 0.91,
      high: 0.99,
      low: 0.9,
      close: 0.96,
      average: 0.95,
      baseVolume: 100,
      counterVolume: 95,
      tradeCount: 12,
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/trade_aggregations?resolution=3600000"),
      expect.anything()
    );
  });
});
