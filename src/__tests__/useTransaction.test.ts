import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react-hooks";

const mockSendTransaction = vi.fn();
const mockGetTransaction = vi.fn();
const mockSubmitTransaction = vi.fn();

vi.mock("../context", () => ({
  useStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
      sorobanRpcUrl: "https://soroban-testnet.example.com",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
}));

vi.mock("../utils", () => ({
  sleep: vi.fn(() => Promise.resolve()),
  backoff: vi.fn(() => 0),
}));

vi.mock("@stellar/stellar-sdk", () => ({
  rpc: {
    Server: vi.fn(() => ({
      sendTransaction: mockSendTransaction,
      getTransaction: mockGetTransaction,
    })),
    Api: {
      GetTransactionStatus: {
        SUCCESS: "SUCCESS",
        FAILED: "FAILED",
      },
    },
  },
  Horizon: {
    Server: vi.fn(() => ({
      submitTransaction: mockSubmitTransaction,
    })),
  },
  TransactionBuilder: {
    fromXDR: vi.fn(() => ({ toXDR: () => "xdr" })),
  },
}));

import { useTransaction } from "../hooks/useTransaction";

describe("useTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits a Soroban transaction and updates to success when polling passes", async () => {
    mockSendTransaction.mockResolvedValue({ status: "PENDING", hash: "SORO-123" });
    mockGetTransaction.mockResolvedValue({ status: "SUCCESS" });

    const { result } = renderHook(() => useTransaction({ mode: "soroban", timeoutSeconds: 1 }));

    await act(async () => {
      await result.current.submit("signed-xdr");
    });

    expect(mockSendTransaction).toHaveBeenCalled();
    expect(result.current.status).toBe("success");
    expect(result.current.hash).toBe("SORO-123");
    expect(result.current.isSuccess).toBe(true);
  });

  it("submits a classic Horizon transaction and updates state on success", async () => {
    mockSubmitTransaction.mockResolvedValue({ hash: "CLASSIC-456" });

    const { result } = renderHook(() => useTransaction({ mode: "classic" }));

    await act(async () => {
      await result.current.submit("signed-xdr");
    });

    expect(mockSubmitTransaction).toHaveBeenCalled();
    expect(result.current.status).toBe("success");
    expect(result.current.hash).toBe("CLASSIC-456");
  });

  it("sets error state when Soroban transaction fails on-chain", async () => {
    mockSendTransaction.mockResolvedValue({ status: "PENDING", hash: "SORO-789" });
    mockGetTransaction.mockResolvedValue({ status: "FAILED" });

    const { result } = renderHook(() => useTransaction({ mode: "soroban", timeoutSeconds: 1 }));

    await act(async () => {
      await result.current.submit("signed-xdr");
    });

    expect(result.current.status).toBe("error");
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
