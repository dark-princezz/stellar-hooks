/**
 * @file network.test.ts
 * @description Live Futurenet connectivity checks via the Stellar SDK + fetch.
 *
 * Opt-in only — see `npm run test:futurenet`.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { Horizon, Keypair, rpc } from "@stellar/stellar-sdk";
import {
  FUTURENET,
  FRIENDBOT_URL,
  assertFuturenetReachable,
  resetServers,
} from "./helpers";
import {
  getHorizonServer,
  getRpcServer,
} from "../../../src/utils/memoizedServers";
import { normalizeFeeStats } from "../../../src/hooks/useFeeStats";

describe("Futurenet live network (SDK)", () => {
  beforeAll(async () => {
    await assertFuturenetReachable();
  }, 30_000);

  beforeEach(() => {
    resetServers();
  });

  afterAll(() => {
    resetServers();
  });

  it("exposes the expected Futurenet NETWORK_CONFIGS endpoints", () => {
    expect(FUTURENET.network).toBe("futurenet");
    expect(FUTURENET.horizonUrl).toBe("https://horizon-futurenet.stellar.org");
    expect(FUTURENET.sorobanRpcUrl).toBe("https://rpc-futurenet.stellar.org");
    expect(FUTURENET.networkPassphrase).toBe(
      "Test SDF Future Network ; October 2022",
    );
  });

  it("Horizon.root() returns a healthy ledger on Futurenet", async () => {
    const server = new Horizon.Server(FUTURENET.horizonUrl);
    const root = await server.root();

    expect(root.history_latest_ledger).toBeGreaterThan(0);
    expect(root.network_passphrase).toBe(FUTURENET.networkPassphrase);
  });

  it("memoized getHorizonServer talks to live Futurenet", async () => {
    const server = getHorizonServer(FUTURENET.horizonUrl);
    const root = await server.root();
    expect(root.history_latest_ledger).toBeGreaterThan(0);
  });

  it("Soroban RPC getHealth() reports healthy on Futurenet", async () => {
    const server = new rpc.Server(FUTURENET.sorobanRpcUrl);
    const health = await server.getHealth();
    expect(health.status).toBe("healthy");
  });

  it("memoized getRpcServer talks to live Futurenet RPC", async () => {
    const server = getRpcServer(FUTURENET.sorobanRpcUrl);
    const health = await server.getHealth();
    expect(health.status).toBe("healthy");
  });

  it("Horizon /fee_stats normalizes into camelCase FeeStats", async () => {
    const url = `${FUTURENET.horizonUrl.replace(/\/$/, "")}/fee_stats`;
    const response = await fetch(url);
    expect(response.ok).toBe(true);

    const raw = await response.json();
    expect(raw).toHaveProperty("last_ledger");
    expect(raw).toHaveProperty("fee_charged");
    expect(raw).toHaveProperty("max_fee");

    const normalized = normalizeFeeStats(raw);
    expect(normalized.lastLedger).toBe(String(raw.last_ledger));
    expect(normalized.feeCharged).toEqual(raw.fee_charged);
    expect(normalized.maxFee).toEqual(raw.max_fee);
    expect(Number(normalized.maxFee.p50)).toBeGreaterThan(0);
  });

  it("Friendbot funds a new account that Horizon can load", async () => {
    const publicKey = Keypair.random().publicKey();
    const fundResponse = await fetch(
      `${FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`,
    );
    expect(fundResponse.ok).toBe(true);

    const server = getHorizonServer(FUTURENET.horizonUrl);
    // Friendbot submits asynchronously — poll Horizon briefly for propagation.
    let account: Horizon.AccountResponse | null = null;
    let lastError: unknown;
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        account = await server.loadAccount(publicKey);
        break;
      } catch (err) {
        lastError = err;
        await new Promise((r) => setTimeout(r, 1_000));
      }
    }
    if (!account) {
      throw lastError instanceof Error
        ? lastError
        : new Error(`Account ${publicKey} not found after Friendbot funding`);
    }

    expect(account.accountId()).toBe(publicKey);
    expect(account.balances.length).toBeGreaterThan(0);
  });
});
