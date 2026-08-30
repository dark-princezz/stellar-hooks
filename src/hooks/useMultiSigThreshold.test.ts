/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useMultiSigThreshold } from "./useMultiSigThreshold";

const mockLoadAccount = vi.hoisted(() => vi.fn());

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
      sorobanRpcUrl: "https://soroban-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
}));

vi.mock("../utils/memoizedServers", () => ({
  getHorizonServer: vi.fn().mockReturnValue({ loadAccount: mockLoadAccount }),
}));

const PUBLIC_KEY = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const ALICE = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWCO";
const BOB = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWQ";

function accountData(overrides: any = {}) {
  return {
    signers: [
      { key: ALICE, type: "ed25519_public_key", weight: 1 },
      { key: BOB, type: "ed25519_public_key", weight: 2 },
    ],
    thresholds: { low_threshold: 0, med_threshold: 2, high_threshold: 3 },
    ...overrides,
  };
}

describe("useMultiSigThreshold", () => {
  beforeEach(() => {
    mockLoadAccount.mockReset();
  });

  it("loads signers and thresholds from the account", async () => {
    mockLoadAccount.mockResolvedValue(accountData());

    const { result } = renderHook(() => useMultiSigThreshold(PUBLIC_KEY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.signers).toHaveLength(2);
    expect(result.current.signers[0]).toMatchObject({ key: ALICE, weight: 1 });
    expect(result.current.thresholds).toEqual({ low: 0, medium: 2, high: 3 });
  });

  it("exposes the required weight for each threshold level", async () => {
    mockLoadAccount.mockResolvedValue(accountData());

    const { result } = renderHook(() => useMultiSigThreshold(PUBLIC_KEY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.thresholdFor("low")).toBe(0);
    expect(result.current.thresholdFor("medium")).toBe(2);
    expect(result.current.thresholdFor("high")).toBe(3);
  });

  it("weightOf sums the weights of only known signers", async () => {
    mockLoadAccount.mockResolvedValue(accountData());

    const { result } = renderHook(() => useMultiSigThreshold(PUBLIC_KEY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.weightOf([ALICE])).toBe(1);
    expect(result.current.weightOf([ALICE, BOB])).toBe(3);
    expect(result.current.weightOf([PUBLIC_KEY])).toBe(0);
  });

  it("meetsThreshold evaluates against the requested level", async () => {
    mockLoadAccount.mockResolvedValue(accountData());

    const { result } = renderHook(() => useMultiSigThreshold(PUBLIC_KEY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.meetsThreshold([BOB])).toBe(true);
    expect(result.current.meetsThreshold([ALICE])).toBe(false);
    expect(result.current.meetsThreshold([BOB], "high")).toBe(false);
    expect(result.current.meetsThreshold([ALICE, BOB], "high")).toBe(true);
  });

  it("reports empty signers and null thresholds when the account has none", async () => {
    mockLoadAccount.mockResolvedValue(accountData({ signers: [], thresholds: undefined }));

    const { result } = renderHook(() => useMultiSigThreshold(PUBLIC_KEY));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.signers).toEqual([]);
    expect(result.current.thresholds).toBeNull();
    expect(result.current.meetsThreshold([ALICE])).toBe(false);
    expect(result.current.weightOf([ALICE])).toBe(0);
  });
});