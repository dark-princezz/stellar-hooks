/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTransactionStatus } from "./useTransactionStatus";

const { mockGetTransaction } = vi.hoisted(() => ({
  mockGetTransaction: vi.fn(),
}));

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: {
      sorobanRpcUrl: "https://rpc.example.com",
      horizonUrl: "https://horizon.example.com",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
}));

vi.mock("@stellar/stellar-sdk/rpc", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    Server: vi.fn().mockImplementation(() => ({
      getTransaction: mockGetTransaction,
    })),
  };
});

const SUCCESS = "SUCCESS";
const FAILED = "FAILED";
const NOT_FOUND = "NOT_FOUND";

function txResult(xdrB64: string) {
  return { toXDR: () => xdrB64 };
}

describe("useTransactionStatus", () => {
  beforeEach(() => {
    mockGetTransaction.mockReset();
  });

  it("returns idle until polling completes", () => {
    const { result } = renderHook(() =>
      useTransactionStatus("a".repeat(64), { enabled: false }),
    );
    expect(result.current.status).toBe("idle");
    expect(result.current.isComplete).toBe(false);
  });

  it("returns success with ledger and resultXdr once confirmed", async () => {
    mockGetTransaction.mockResolvedValue({
      status: SUCCESS,
      ledger: 1234,
      resultXdr: txResult("result-base64"),
    });

    const { result } = renderHook(() =>
      useTransactionStatus("a".repeat(64), { refetchInterval: 0 }),
    );
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.ledger).toBe(1234);
    expect(result.current.resultXdr).toBe("result-base64");
    expect(result.current.isComplete).toBe(true);
    expect(result.current.hash).toBe("a".repeat(64));
  });

  it("reports failure when the transaction failed on-chain", async () => {
    mockGetTransaction.mockResolvedValue({
      status: FAILED,
      ledger: 1240,
      resultXdr: txResult("failed-result"),
    });

    const { result } = renderHook(() =>
      useTransactionStatus("b".repeat(64), { refetchInterval: 0 }),
    );
    await waitFor(() => expect(result.current.status).toBe("failed"));
    expect(result.current.isComplete).toBe(true);
    expect(result.current.resultXdr).toBe("failed-result");
  });

  it("polls repeatedly while status is pending", async () => {
    mockGetTransaction
      .mockResolvedValueOnce({ status: NOT_FOUND })
      .mockResolvedValueOnce({ status: NOT_FOUND })
      .mockResolvedValue({ status: SUCCESS, ledger: 5, resultXdr: txResult("final") });

    const { result } = renderHook(() =>
      useTransactionStatus("c".repeat(64), { refetchInterval: 10 }),
    );
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(mockGetTransaction).toHaveBeenCalledTimes(3);
  });

  it("captures polling errors on the error field", async () => {
    mockGetTransaction.mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() =>
      useTransactionStatus("d".repeat(64), { refetchInterval: 0 }),
    );
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toContain("network down");
  });

  it("does not poll without a hash", () => {
    renderHook(() => useTransactionStatus(null, { refetchInterval: 0 }));
    expect(mockGetTransaction).not.toHaveBeenCalled();
  });
});
