/**
 * @file useSorobanTokenBalance.test.ts
 * @description Unit tests for the useSorobanTokenBalance hook.
 * @package stellar-hooks
 * @license MIT
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSorobanTokenBalance } from "../hooks/useSorobanTokenBalance";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSimulateTransaction = vi.fn();
const mockGetAccount = vi.fn();

vi.mock("@stellar/stellar-sdk/rpc", () => ({
  Server: vi.fn().mockImplementation(() => ({
    simulateTransaction: mockSimulateTransaction,
    getAccount: mockGetAccount,
  })),
  Api: {
    isSimulationError: (r: any) => typeof r.error === "string",
    isSimulationSuccess: (r: any) => !r.error && r.result !== undefined,
  },
}));

vi.mock("@stellar/stellar-sdk", () => {
  const addOperation = vi.fn().mockReturnThis();
  const setTimeout = vi.fn().mockReturnThis();
  const build = vi.fn().mockReturnValue({});

  return {
    StrKey: {
      isValidEd25519PublicKey: vi.fn().mockReturnValue(true),
      isValidContract: vi.fn().mockReturnValue(true),
    },
    rpc: {
      Server: vi.fn().mockImplementation(() => ({
        simulateTransaction: mockSimulateTransaction,
        getAccount: mockGetAccount,
      })),
      Api: {
        isSimulationError: (r: any) => typeof r.error === "string",
        isSimulationSuccess: (r: any) => !r.error && r.result !== undefined,
      },
    },
    Address: vi.fn().mockImplementation((addr: string) => ({
      toScVal: () => ({ type: "address", value: addr }),
    })),
    Contract: vi.fn().mockImplementation(() => ({
      call: vi.fn().mockReturnValue("mock_operation"),
    })),
    TransactionBuilder: vi.fn().mockImplementation(() => ({
      addOperation,
      setTimeout,
      build,
    })),
    scValToNative: vi.fn(),
  };
});

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: {
      network: "testnet",
      sorobanRpcUrl: "https://soroban-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
}));

vi.mock("../utils", () => ({
  getCache: vi.fn().mockReturnValue(null),
  setCache: vi.fn(),
  validateContractId: vi.fn(),
  validatePublicKey: vi.fn(),
}));

const CONTRACT_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const ACCOUNT = "GABC123XYZ";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSimSuccess(retval: any) {
  return { result: { retval }, latestLedger: 100 };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useSorobanTokenBalance", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-establish default return values after clearAllMocks resets implementations
    const utils = await import("../utils");
    vi.mocked(utils.getCache).mockReturnValue(null);
    mockGetAccount.mockResolvedValue({ accountId: ACCOUNT, sequence: "1" });
  });

  it("returns loading state initially", () => {
    mockSimulateTransaction.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() =>
      useSorobanTokenBalance(CONTRACT_ID, ACCOUNT),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.balance).toBeNull();
    expect(result.current.formatted).toBeNull();
  });

  it("returns balance and formatted string on success", async () => {
    const { scValToNative } = await import("@stellar/stellar-sdk");
    vi.mocked(scValToNative).mockReturnValue(BigInt("5000000000")); // 500.0000000
    mockSimulateTransaction.mockResolvedValue(makeSimSuccess({}));

    const { result } = renderHook(() =>
      useSorobanTokenBalance(CONTRACT_ID, ACCOUNT),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.balance).toBe(BigInt("5000000000"));
    expect(result.current.formatted).toBe("500.0000000");
    expect(result.current.error).toBeNull();
  });

  it("formats balance with custom decimals", async () => {
    const { scValToNative } = await import("@stellar/stellar-sdk");
    vi.mocked(scValToNative).mockReturnValue(BigInt("100000000")); // 1.00000000 with 8 decimals
    mockSimulateTransaction.mockResolvedValue(makeSimSuccess({}));

    const { result } = renderHook(() =>
      useSorobanTokenBalance(CONTRACT_ID, ACCOUNT, { decimals: 8 }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.formatted).toBe("1.00000000");
  });

  it("handles simulation error", async () => {
    mockSimulateTransaction.mockResolvedValue({ error: "contract error: balance not found" });

    const { result } = renderHook(() =>
      useSorobanTokenBalance(CONTRACT_ID, ACCOUNT),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("contract error: balance not found");
    expect(result.current.balance).toBeNull();
  });

  it("handles network/RPC error", async () => {
    mockSimulateTransaction.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() =>
      useSorobanTokenBalance(CONTRACT_ID, ACCOUNT),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Network error");
  });

  it("does not fetch when contractId is null", () => {
    const { result } = renderHook(() =>
      useSorobanTokenBalance(null, ACCOUNT),
    );

    expect(result.current.isLoading).toBe(false);
    expect(mockSimulateTransaction).not.toHaveBeenCalled();
  });

  it("does not fetch when accountAddress is null", () => {
    const { result } = renderHook(() =>
      useSorobanTokenBalance(CONTRACT_ID, null),
    );

    expect(result.current.isLoading).toBe(false);
    expect(mockSimulateTransaction).not.toHaveBeenCalled();
  });

  it("does not fetch when enabled is false", () => {
    const { result } = renderHook(() =>
      useSorobanTokenBalance(CONTRACT_ID, ACCOUNT, { enabled: false }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(mockSimulateTransaction).not.toHaveBeenCalled();
  });

  it("returns cached value without fetching", async () => {
    const { getCache } = await import("../utils");
    vi.mocked(getCache).mockReturnValue(BigInt("10000000") as any); // 1.0000000

    const { result } = renderHook(() =>
      useSorobanTokenBalance(CONTRACT_ID, ACCOUNT),
    );

    await waitFor(() => expect(result.current.balance).toBe(BigInt("10000000")));

    expect(mockSimulateTransaction).not.toHaveBeenCalled();
    expect(result.current.formatted).toBe("1.0000000");
  });

  it("exposes refetch function that forces a fresh fetch", async () => {
    const { scValToNative } = await import("@stellar/stellar-sdk");
    vi.mocked(scValToNative).mockReturnValue(BigInt("0"));
    mockSimulateTransaction.mockResolvedValue(makeSimSuccess({}));

    const { result } = renderHook(() =>
      useSorobanTokenBalance(CONTRACT_ID, ACCOUNT),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockSimulateTransaction).toHaveBeenCalledTimes(1);

    vi.mocked(scValToNative).mockReturnValue(BigInt("7000000"));
    await result.current.refetch();

    expect(mockSimulateTransaction).toHaveBeenCalledTimes(2);
  });

  it("handles zero balance", async () => {
    const { scValToNative } = await import("@stellar/stellar-sdk");
    vi.mocked(scValToNative).mockReturnValue(BigInt(0));
    mockSimulateTransaction.mockResolvedValue(makeSimSuccess({}));

    const { result } = renderHook(() =>
      useSorobanTokenBalance(CONTRACT_ID, ACCOUNT),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.balance).toBe(BigInt(0));
    expect(result.current.formatted).toBe("0.0000000");
    expect(result.current.error).toBeNull();
  });
});
