/**
 * @file provider.test.ts
 * @description Live Futurenet smoke coverage for provider config + useFeeStats
 * fetcher normalization without jsdom XHR hangs.
 *
 * Opt-in — see `npm run test:futurenet`.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  FUTURENET,
  assertFuturenetReachable,
} from "./helpers";
import { normalizeFeeStats } from "../../../src/hooks/useFeeStats";
import { NETWORK_CONFIGS } from "../../../src/types";

describe("Futurenet live provider/config surface", () => {
  beforeAll(async () => {
    await assertFuturenetReachable();
  }, 30_000);

  it("NETWORK_CONFIGS.futurenet matches the published Futurenet endpoints", () => {
    expect(NETWORK_CONFIGS.futurenet).toEqual(FUTURENET);
    expect(NETWORK_CONFIGS.futurenet.horizonUrl).toContain("futurenet");
    expect(NETWORK_CONFIGS.futurenet.sorobanRpcUrl).toContain("futurenet");
  });

  it("useFeeStats normalizeFeeStats accepts a live Horizon fee_stats payload", async () => {
    const response = await fetch(
      `${FUTURENET.horizonUrl.replace(/\/$/, "")}/fee_stats`,
    );
    expect(response.ok).toBe(true);
    const recommended = normalizeFeeStats(await response.json());
    expect(Number(recommended.maxFee.p80)).toBeGreaterThan(0);
    expect(recommended.lastLedgerBaseFee).toBeTruthy();
  });
});
