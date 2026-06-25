import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ── Hoisted mocks (safe to use in vi.mock factories) ─────────────────────────

const {
  mockGetAccount,
  mockSimulate,
  mockAssemble,
  mockSendTransaction,
  mockGetTransaction,
  MockTransactionBuilder,
} = vi.hoisted(() => {
  const mockInstance = {
    addOperation: vi.fn().mockReturnThis(),
    setTimeout: vi.fn().mockReturnThis(),
    build: vi.fn().mockReturnValue({ toXDR: () => "builtXDR==" }),
  };
  const ctor = vi.fn().mockImplementation(() => mockInstance);
  (ctor as unknown as Record<string, unknown>).fromXDR = vi.fn().mockReturnValue({ toXDR: () => "signedXDR==" });
  return {
    mockGetAccount: vi.fn(),
    mockSimulate: vi.fn(),
    mockAssemble: vi.fn(),
    mockSendTransaction: vi.fn(),
    mockGetTransaction: vi.fn(),
    MockTransactionBuilder: ctor,
  };
});

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../context", () => ({
  useStellarContext: () => ({
    config: {
      sorobanRpcUrl: "https://soroban-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
}));

vi.mock("../hooks/useFreighter", () => ({
  useFreighter: () => ({
    publicKey: "GPUBLICKEY123",
    networkPassphrase: "Test SDF Network ; September 2015",
    signTransaction: vi.fn().mockResolvedValue("signedXDR=="),
  }),
}));

vi.mock("../utils/validation", () => ({
  validateContractId: vi.fn(),
  validatePublicKey: vi.fn(),
  validateOptionalPublicKey: vi.fn(),
  validateOptionalContractId: vi.fn(),
  ValidationError: class ValidationError extends Error {},
}));

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    Contract: vi.fn().mockImplementation(() => ({
      call: vi.fn().mockReturnValue({ type: "invokeHostFunction" }),
    })),
    TransactionBuilder: MockTransactionBuilder,
    rpc: {
      Server: vi.fn().mockImplementation(() => ({
        getAccount: mockGetAccount,
        simulateTransaction: mockSimulate,
        sendTransaction: mockSendTransaction,
        getTransaction: mockGetTransaction,
      })),
      Api: {
        isSimulationError: vi.fn().mockReturnValue(false),
        GetTransactionStatus: { SUCCESS: "SUCCESS", FAILED: "FAILED", NOT_FOUND: "NOT_FOUND" },
      },
      assembleTransaction: mockAssemble,
    },
    nativeToScVal: vi.fn().mockReturnValue({}),
    BASE_FEE: "100",
    xdr: (actual.xdr as object),
  };
});

// ── Helpers ──────────────────────────────────────────────────────────────────

import { useSorobanContract } from "../hooks/useSorobanContract";

const CONTRACT_ID = "CABC1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890AB";
const defaultOptions = { method: "increment", args: [] };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useSorobanContract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccount.mockResolvedValue({ id: "GPUBLICKEY123", sequence: "1" });
    mockAssemble.mockReturnValue({ build: vi.fn().mockReturnValue({ toXDR: () => "preparedXDR==" }) });
    mockSendTransaction.mockResolvedValue({ hash: "abc123hash", status: "PENDING" });
    mockGetTransaction.mockResolvedValue({ status: "SUCCESS", resultMetaXdr: null });
  });

  it("starts in idle status", () => {
    const { result } = renderHook(() => useSorobanContract(CONTRACT_ID, defaultOptions));
    expect(result.current.status).toBe("idle");
    expect(result.current.result).toBeNull();
    expect(result.current.hash).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("transitions to success after a full call lifecycle", async () => {
    mockSimulate.mockResolvedValueOnce({ results: [{ xdr: "AAAA" }] });

    const { result } = renderHook(() => useSorobanContract(CONTRACT_ID, defaultOptions));

    await act(async () => {
      await result.current.call();
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.hash).toBe("abc123hash");
  });

  it("sets status to error when simulation fails", async () => {
    mockSimulate.mockRejectedValueOnce(new Error("Simulation failed"));

    const { result } = renderHook(() => useSorobanContract(CONTRACT_ID, defaultOptions));

    await act(async () => {
      await result.current.call();
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error?.message).toContain("Simulation failed");
  });

  it("reset() returns hook to idle state", async () => {
    mockSimulate.mockRejectedValueOnce(new Error("oops"));

    const { result } = renderHook(() => useSorobanContract(CONTRACT_ID, defaultOptions));

    await act(async () => {
      await result.current.call();
    });

    await waitFor(() => expect(result.current.status).toBe("error"));

    act(() => { result.current.reset(); });

    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });
});
