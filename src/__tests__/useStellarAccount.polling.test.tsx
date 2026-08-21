/**
 * @file useStellarAccount.polling.test.tsx
 * @description Unit tests for the polling behavior of useStellarAccount.
 * @package stellar-hooks
 * @license MIT
 */

import React, { useEffect } from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useStellarAccount } from "../hooks/useStellarAccount";

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: { horizonUrl: "https://horizon-testnet.stellar.org" },
    network: "testnet",
  }),
}));

const loadAccountMock = vi.fn();

vi.mock("@stellar/stellar-sdk", () => ({
  Horizon: {
    Server: vi.fn().mockImplementation(() => ({
      loadAccount: loadAccountMock,
    })),
  },
  StrKey: { isValidEd25519PublicKey: vi.fn().mockReturnValue(true) },
}));

const MOCK_ACCOUNT = { account_id: "GTEST", sequence: "1", balances: [] };
const NEVER_RESOLVE = () => new Promise<typeof MOCK_ACCOUNT>(() => { /* never resolves */ });

function HookHarness({
  publicKey,
  refetchInterval,
  deduplicate,
}: {
  publicKey: string;
  refetchInterval: number;
  deduplicate?: boolean;
}) {
  const { refetch } = useStellarAccount(publicKey, { refetchInterval, deduplicate });

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return null;
}

describe("useStellarAccount polling cleanup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    loadAccountMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clears polling interval on unmount when refetchInterval > 0", async () => {
    loadAccountMock.mockResolvedValue(MOCK_ACCOUNT);

    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <HookHarness publicKey="GABC" refetchInterval={10} />
      );
    });

    const callsBeforeUnmount = loadAccountMock.mock.calls.length;

    await act(async () => {
      renderer!.unmount();
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(loadAccountMock.mock.calls.length).toBe(callsBeforeUnmount);
  });

  it("deduplicates: skips poll ticks while a fetch is in-flight (deduplicate: true)", async () => {
    loadAccountMock.mockImplementation(NEVER_RESOLVE);

    await act(async () => {
      TestRenderer.create(
        <HookHarness publicKey="GABC" refetchInterval={50} deduplicate={true} />
      );
    });

    const callsAfterMount = loadAccountMock.mock.calls.length;

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // All poll ticks skipped — first fetch still in-flight
    expect(loadAccountMock.mock.calls.length).toBe(callsAfterMount);
  });

  it("allows overlapping requests when deduplicate: false", async () => {
    loadAccountMock.mockImplementation(NEVER_RESOLVE);

    await act(async () => {
      TestRenderer.create(
        <HookHarness publicKey="GABC" refetchInterval={50} deduplicate={false} />
      );
    });

    const callsAfterMount = loadAccountMock.mock.calls.length;

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Poll ticks fire new requests even while one is in-flight
    expect(loadAccountMock.mock.calls.length).toBeGreaterThan(callsAfterMount);
  });
});
