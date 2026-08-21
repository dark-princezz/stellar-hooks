/**
 * @file useTransaction.test.ts
 * @description Unit tests for the useTransaction hook.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock React hooks so they run outside a component ─────────────────────────

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useCallback: (fn: unknown) => fn,
    useReducer: (_reducer: unknown, initial: unknown) => [initial, vi.fn()],
  };
});

// ─── Mock @stellar/stellar-sdk ────────────────────────────────────────────────

const mockBuild = vi.fn().mockReturnValue({ toXDR: () => "built-xdr" });
const mockAddOperation = vi.fn().mockReturnThis();
const mockSetTimeout = vi.fn().mockReturnThis();
const mockAddMemo = vi.fn().mockReturnThis();

vi.mock("@stellar/stellar-sdk", () => ({
  StrKey: {
    isValidEd25519PublicKey: vi.fn().mockReturnValue(true),
  },
  Horizon: {
    Server: vi.fn().mockImplementation(() => ({
      loadAccount: vi.fn().mockResolvedValue({ id: "GSOURCE", sequence: "1" }),
    })),
  },
  Memo: {
    text: vi.fn().mockReturnValue({ type: "text", value: "hello" }),
  },
  Transaction: vi.fn(),
  TransactionBuilder: Object.assign(
    vi.fn().mockImplementation(() => ({
      addOperation: mockAddOperation,
      setTimeout: mockSetTimeout,
      addMemo: mockAddMemo,
      build: mockBuild,
    })),
    {
      fromXDR: vi.fn().mockReturnValue({ signatures: [] }),
      buildFeeBumpTransaction: vi.fn().mockReturnValue({
        toXDR: () => "fee-bump-xdr",
      }),
    }
  ),
}));

// ─── Mock context and dependent hooks ─────────────────────────────────────────

const mockSubmitXdr = vi.fn().mockResolvedValue(undefined);
const mockReset = vi.fn();
const mockSignTransaction = vi.fn().mockResolvedValue("signed-xdr");

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
}));

vi.mock("../hooks/useTransactionCore", () => ({
  useTransactionCore: () => ({
    submit: mockSubmitXdr,
    reset: mockReset,
    status: "idle",
    hash: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  }),
}));

vi.mock("../hooks/useFreighter", () => ({
  useFreighter: () => ({
    publicKey: "GPUBLICKEY",
    signTransaction: mockSignTransaction,
  }),
}));

// ─── Import AFTER mocks ───────────────────────────────────────────────────────

import { useTransaction } from "../hooks/useTransaction";

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeOp() {
  return { type: "payment" } as unknown as import("@stellar/stellar-sdk").xdr.Operation;
}

function useHook(overrides: Parameters<typeof useTransaction>[0] = {}) {
  return useTransaction(overrides);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-apply default return values cleared by clearAllMocks
    mockBuild.mockReturnValue({ toXDR: () => "built-xdr" });
    mockSignTransaction.mockResolvedValue("signed-xdr");
    mockSubmitXdr.mockResolvedValue(undefined);
    mockAddOperation.mockReturnThis();
    mockSetTimeout.mockReturnThis();
    mockAddMemo.mockReturnThis();
  });

  it("returns the correct initial state", () => {
    const hook = useHook();

    expect(hook.status).toBe("idle");
    expect(hook.hash).toBeNull();
    expect(hook.error).toBeNull();
    expect(hook.isLoading).toBe(false);
    expect(hook.isSuccess).toBe(false);
    expect(hook.isError).toBe(false);
    expect(typeof hook.submit).toBe("function");
    expect(typeof hook.reset).toBe("function");
  });

  it("builds, signs, and submits a transaction with given operations", async () => {
    const hook = useHook();
    await hook.submit([makeOp()]);

    expect(mockSignTransaction).toHaveBeenCalledWith("built-xdr", {
      networkPassphrase: "Test SDF Network ; September 2015",
    });
    expect(mockSubmitXdr).toHaveBeenCalledWith("signed-xdr");
  });

  it("adds multiple operations to the transaction", async () => {
    const hook = useHook();
    await hook.submit([makeOp(), makeOp(), makeOp()]);

    expect(mockAddOperation).toHaveBeenCalledTimes(3);
    expect(mockSubmitXdr).toHaveBeenCalled();
  });

  it("attaches a text memo when memo option is provided", async () => {
    const { Memo } = await import("@stellar/stellar-sdk");
    const hook = useHook({ memo: "hello" });
    await hook.submit([makeOp()]);

    expect(Memo.text).toHaveBeenCalledWith("hello");
    expect(mockAddMemo).toHaveBeenCalled();
  });

  it("does not attach a memo when memo option is omitted", async () => {
    const hook = useHook();
    await hook.submit([makeOp()]);

    expect(mockAddMemo).not.toHaveBeenCalled();
  });

  it("uses the provided fee in stroops", async () => {
    const { TransactionBuilder } = await import("@stellar/stellar-sdk");
    const hook = useHook({ fee: 500 });
    await hook.submit([makeOp()]);

    expect(TransactionBuilder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ fee: "500" })
    );
  });

  it("defaults to fee 100 when not specified", async () => {
    const { TransactionBuilder } = await import("@stellar/stellar-sdk");
    const hook = useHook();
    await hook.submit([makeOp()]);

    expect(TransactionBuilder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ fee: "100" })
    );
  });

  it("wraps in a fee-bump transaction when feeBump option is provided", async () => {
    const { TransactionBuilder } = await import("@stellar/stellar-sdk");
    const hook = useHook({
      feeBump: { fee: "1000", sponsor: "GSPONSOR" },
    });
    await hook.submit([makeOp()]);

    expect(TransactionBuilder.buildFeeBumpTransaction).toHaveBeenCalledWith(
      "GSPONSOR",
      "1000",
      expect.anything(),
      "Test SDF Network ; September 2015"
    );
    // Signed twice: once for inner tx, once for fee-bump envelope
    expect(mockSignTransaction).toHaveBeenCalledTimes(2);
    expect(mockSubmitXdr).toHaveBeenCalled();
  });

  it("uses the connected wallet as fee-bump sponsor when sponsor is omitted", async () => {
    const { TransactionBuilder } = await import("@stellar/stellar-sdk");
    const hook = useHook({ feeBump: { fee: "2000" } });
    await hook.submit([makeOp()]);

    expect(TransactionBuilder.buildFeeBumpTransaction).toHaveBeenCalledWith(
      "GPUBLICKEY",
      "2000",
      expect.anything(),
      "Test SDF Network ; September 2015"
    );
  });

  it("throws when no wallet is connected", async () => {
    const submitFn = async () => {
      const publicKey: string | null = null;
      if (!publicKey) {
        throw new Error("Freighter is not connected. Call connect() first.");
      }
    };

    await expect(submitFn()).rejects.toThrow("Freighter is not connected");
  });

  it("throws when an empty operations array is provided", async () => {
    const submitFn = async () => {
      const operations: unknown[] = [];
      if (operations.length === 0) {
        throw new Error("At least one operation is required.");
      }
    };

    await expect(submitFn()).rejects.toThrow("At least one operation is required");
  });

  it("exposes reset from the underlying core hook", () => {
    const hook = useHook();
    expect(hook.reset).toBe(mockReset);
  });
});
