/**
 * @file useTransactionCore.test.ts
 * @description Unit tests for the useTransactionCore hook covering both classic (Horizon)
 *              and soroban (RPC) submission modes.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ─── Mock @stellar/stellar-sdk ────────────────────────────────────────────────
// Horizon.Server is used in classic mode; TransactionBuilder.fromXDR is used in both modes.

const mockSubmitTransaction = vi.fn();

vi.mock("@stellar/stellar-sdk", () => ({
  Horizon: {
    Server: vi.fn().mockImplementation(() => ({
      submitTransaction: mockSubmitTransaction,
    })),
  },
  TransactionBuilder: {
    fromXDR: vi.fn().mockReturnValue({}),
  },
}));

// ─── Mock @stellar/stellar-sdk/rpc ────────────────────────────────────────────
// rpc.Server is used in soroban mode for sendTransaction + getTransaction polling.

const mockSendTransaction = vi.fn();
const mockGetTransaction = vi.fn();

vi.mock("@stellar/stellar-sdk/rpc", () => ({
  Server: vi.fn().mockImplementation(() => ({
    sendTransaction: mockSendTransaction,
    getTransaction: mockGetTransaction,
  })),
  Api: {
    GetTransactionStatus: {
      SUCCESS: "SUCCESS",
      FAILED: "FAILED",
      NOT_FOUND: "NOT_FOUND",
    },
  },
}));

// ─── Mock context ─────────────────────────────────────────────────────────────

vi.mock("../context", () => ({
  useStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
      sorobanRpcUrl: "https://soroban-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
}));

// ─── Mock utils: make sleep a no-op so polling tests complete instantly ──────

vi.mock("../utils", async () => {
  const actual = await vi.importActual<typeof import("../utils")>("../utils");
  return {
    ...actual,
    sleep: vi.fn().mockResolvedValue(undefined),
  };
});

// ─── Import AFTER mocks ───────────────────────────────────────────────────────

import { useTransactionCore } from "../hooks/useTransactionCore";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Valid 64-character hex hash that passes asTxHash validation */
const TX_HASH = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useTransactionCore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Classic mode (Horizon) ────────────────────────────────────────────────

  describe("classic mode", () => {
    const mode = "classic";

    it("returns correct initial state", () => {
      const { result } = renderHook(() => useTransactionCore({ mode }));

      expect(result.current.status).toBe("idle");
      expect(result.current.hash).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(typeof result.current.submit).toBe("function");
      expect(typeof result.current.reset).toBe("function");
    });

    it("submits successfully and updates state", async () => {
      mockSubmitTransaction.mockResolvedValue({ hash: TX_HASH });

      const { result } = renderHook(() => useTransactionCore({ mode }));

      await act(async () => {
        await result.current.submit("signed-xdr");
      });

      await waitFor(() => {
        expect(result.current.status).toBe("success");
      });

      expect(result.current.hash).toBe(TX_HASH);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("sets status to submitting while the transaction is in flight", async () => {
      let resolveSubmit!: (value: unknown) => void;
      mockSubmitTransaction.mockReturnValue(
        new Promise((resolve) => {
          resolveSubmit = resolve;
        }),
      );

      const { result } = renderHook(() => useTransactionCore({ mode }));

      // Start submission but don't let it resolve yet
      act(() => {
        result.current.submit("signed-xdr");
      });

      await waitFor(() => {
        expect(result.current.status).toBe("submitting");
      });
      expect(result.current.isLoading).toBe(true);

      // Now resolve
      await act(async () => {
        resolveSubmit({ hash: TX_HASH });
      });

      await waitFor(() => {
        expect(result.current.status).toBe("success");
      });
    });

    it("handles submission errors", async () => {
      const errorMsg = "Horizon submission failed";
      mockSubmitTransaction.mockRejectedValue(new Error(errorMsg));

      const { result } = renderHook(() => useTransactionCore({ mode }));

      await act(async () => {
        await result.current.submit("signed-xdr");
      });

      await waitFor(() => {
        expect(result.current.status).toBe("error");
      });

      expect(result.current.error?.message).toBe(`Unexpected error: ${errorMsg}`);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);
    });

    it("fires onSuccess callback when submission succeeds", async () => {
      const onSuccess = vi.fn();
      mockSubmitTransaction.mockResolvedValue({ hash: TX_HASH });

      const { result } = renderHook(() => useTransactionCore({ mode, onSuccess }));

      await act(async () => {
        await result.current.submit("signed-xdr");
      });

      await waitFor(() => {
        expect(result.current.status).toBe("success");
      });

      expect(onSuccess).toHaveBeenCalledWith(TX_HASH);
    });

    it("fires onError callback when submission fails", async () => {
      const onError = vi.fn();
      const errorMsg = "Horizon error";
      mockSubmitTransaction.mockRejectedValue(new Error(errorMsg));

      const { result } = renderHook(() => useTransactionCore({ mode, onError }));

      await act(async () => {
        await result.current.submit("signed-xdr");
      });

      await waitFor(() => {
        expect(result.current.status).toBe("error");
      });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: `Unexpected error: ${errorMsg}`, type: "network" })
      );
    });

    it("reset returns state to idle after an error", async () => {
      mockSubmitTransaction.mockRejectedValue(new Error("error"));

      const { result } = renderHook(() => useTransactionCore({ mode }));

      await act(async () => {
        await result.current.submit("signed-xdr");
      });

      await waitFor(() => {
        expect(result.current.status).toBe("error");
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe("idle");
      expect(result.current.hash).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });
  });

  // ── Soroban mode (RPC) ───────────────────────────────────────────────────

  describe("soroban mode", () => {
    const mode = "soroban";

    it("returns correct initial state", () => {
      const { result } = renderHook(() => useTransactionCore({ mode }));

      expect(result.current.status).toBe("idle");
      expect(result.current.hash).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(typeof result.current.submit).toBe("function");
      expect(typeof result.current.reset).toBe("function");
    });

    it("submits successfully when getTransaction immediately returns SUCCESS", async () => {
      mockSendTransaction.mockResolvedValue({ status: "PENDING", hash: TX_HASH });
      mockGetTransaction.mockResolvedValue({ status: "SUCCESS" });

      const { result } = renderHook(() => useTransactionCore({ mode }));

      await act(async () => {
        await result.current.submit("signed-xdr");
      });

      await waitFor(() => {
        expect(result.current.status).toBe("success");
      });

      expect(result.current.hash).toBe(TX_HASH);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("transitions through submitting and polling states during a successful flow", async () => {
      let resolveSend!: (value: unknown) => void;
      let resolveGetTx!: (value: unknown) => void;

      mockSendTransaction.mockReturnValue(
        new Promise((resolve) => {
          resolveSend = resolve;
        }),
      );
      mockGetTransaction.mockReturnValue(
        new Promise((resolve) => {
          resolveGetTx = resolve;
        }),
      );

      const { result } = renderHook(() => useTransactionCore({ mode }));

      act(() => {
        result.current.submit("signed-xdr");
      });

      await waitFor(() => {
        expect(result.current.status).toBe("submitting");
      });

      // Resolve sendTransaction -> transitions to polling
      await act(async () => {
        resolveSend({ status: "PENDING", hash: TX_HASH });
      });

      await waitFor(() => {
        expect(result.current.status).toBe("polling");
      });

      // Resolve getTransaction -> success
      await act(async () => {
        resolveGetTx({ status: "SUCCESS" });
      });

      await waitFor(() => {
        expect(result.current.status).toBe("success");
      });
    });

    it("polls multiple times before succeeding", async () => {
      mockSendTransaction.mockResolvedValue({ status: "PENDING", hash: TX_HASH });
      mockGetTransaction
        .mockResolvedValueOnce({ status: "NOT_FOUND" })
        .mockResolvedValueOnce({ status: "NOT_FOUND" })
        .mockResolvedValueOnce({ status: "SUCCESS" });

      const { result } = renderHook(() => useTransactionCore({ mode }));

      await act(async () => {
        await result.current.submit("signed-xdr");
      });

      await waitFor(() => {
        expect(result.current.status).toBe("success");
      });

      // Verify the polling loop ran multiple times
      expect(mockGetTransaction).toHaveBeenCalledTimes(3);
    });

    it("sets status to error when sendTransaction returns ERROR status", async () => {
      const errorResult = { result: { code: "tx_failed" } };
      mockSendTransaction.mockResolvedValue({ status: "ERROR", errorResult });

      const { result } = renderHook(() => useTransactionCore({ mode }));

      await act(async () => {
        await result.current.submit("signed-xdr");
      });

      await waitFor(() => {
        expect(result.current.status).toBe("error");
      });

      expect(result.current.error?.message).toContain("Submission failed");
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(true);
    });

    it("sets status to error when the transaction fails on-chain", async () => {
      mockSendTransaction.mockResolvedValue({ status: "PENDING", hash: TX_HASH });
      mockGetTransaction.mockResolvedValue({ status: "FAILED" });

      const { result } = renderHook(() => useTransactionCore({ mode }));

      await act(async () => {
        await result.current.submit("signed-xdr");
      });

      await waitFor(() => {
        expect(result.current.status).toBe("error");
      });

      expect(result.current.error?.message).toContain("Transaction failed on-chain");
    });

    it("sets status to error when polling times out", async () => {
      mockSendTransaction.mockResolvedValue({ status: "PENDING", hash: TX_HASH });
      mockGetTransaction.mockResolvedValue({ status: "NOT_FOUND" });

      const { result } = renderHook(() =>
        useTransactionCore({ mode, timeoutSeconds: 0.001 }),
      );

      await act(async () => {
        await result.current.submit("signed-xdr");
      });

      await waitFor(() => {
        expect(result.current.status).toBe("error");
      });

      expect(result.current.error?.message).toContain("polling timed out");
    });

    it("fires onSuccess callback on successful submission", async () => {
      const onSuccess = vi.fn();
      mockSendTransaction.mockResolvedValue({ status: "PENDING", hash: TX_HASH });
      mockGetTransaction.mockResolvedValue({ status: "SUCCESS" });

      const { result } = renderHook(() => useTransactionCore({ mode, onSuccess }));

      await act(async () => {
        await result.current.submit("signed-xdr");
      });

      await waitFor(() => {
        expect(result.current.status).toBe("success");
      });

      expect(onSuccess).toHaveBeenCalledWith(TX_HASH);
    });

    it("fires onError callback when submission fails", async () => {
      const onError = vi.fn();
      mockSendTransaction.mockResolvedValue({ status: "ERROR", errorResult: {} });

      const { result } = renderHook(() => useTransactionCore({ mode, onError }));

      await act(async () => {
        await result.current.submit("signed-xdr");
      });

      await waitFor(() => {
        expect(result.current.status).toBe("error");
      });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ type: "network", message: expect.stringContaining("Submission failed") })
      );
    });

    it("reset returns state to idle after an error", async () => {
      mockSendTransaction.mockResolvedValue({ status: "ERROR", errorResult: {} });

      const { result } = renderHook(() => useTransactionCore({ mode }));

      await act(async () => {
        await result.current.submit("signed-xdr");
      });

      await waitFor(() => {
        expect(result.current.status).toBe("error");
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe("idle");
      expect(result.current.hash).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });
  });
});
