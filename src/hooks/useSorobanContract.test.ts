/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSorobanContract } from "./useSorobanContract";
import { rpc, xdr } from "@stellar/stellar-sdk";

// ─── Mocks ──────────────────────────────────────────────────────────────────────

const {
  mockSignTransaction,
  mockSimulateTransaction,
  mockSendTransaction,
  mockGetTransaction,
  mockGetAccount,
  mockTx,
} = vi.hoisted(() => {
  const mockTx = { toXDR: () => "AAAA-transaction-xdr" };
  return {
    mockSignTransaction: vi.fn(),
    mockSimulateTransaction: vi.fn(),
    mockSendTransaction: vi.fn(),
    mockGetTransaction: vi.fn(),
    mockGetAccount: vi.fn().mockResolvedValue({
      accountId: () => "GABC123XYZ",
      sequenceNumber: () => "1",
    }),
    mockTx,
  };
});

vi.mock("./useFreighter", () => ({
  useFreighter: () => ({
    publicKey: "GBL5T5MLZ57JTBNS643LEJBKAKSOTJCCZVY54FTNZHDSNA56NS6LM3WG",
    networkPassphrase: "Test SDF Network ; September 2015",
    signTransaction: mockSignTransaction,
  }),
}));

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: {
      sorobanRpcUrl: "https://rpc.example.com",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
}));

vi.mock("@stellar/stellar-sdk/rpc", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    Server: vi.fn().mockImplementation(() => ({
      simulateTransaction: mockSimulateTransaction,
      sendTransaction: mockSendTransaction,
      getTransaction: mockGetTransaction,
      getAccount: mockGetAccount,
    })),
    Api: {
      ...actual.Api,
      isSimulationError: (response: { error?: string }) =>
        typeof response.error === "string",
      GetTransactionStatus: { SUCCESS: "SUCCESS", FAILED: "FAILED" },
    },
    assembleTransaction: (tx: any) => ({ build: () => tx }),
  };
});

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    Contract: vi.fn().mockImplementation(() => ({
      call: vi.fn().mockReturnValue("mock_operation"),
    })),
    nativeToScVal: actual.nativeToScVal,
    TransactionBuilder: class extends actual.TransactionBuilder {
      static fromXDR = vi.fn().mockImplementation((xdrStr: string) => ({
        toXDR: () => xdrStr,
        addOperation: vi.fn().mockReturnThis(),
        setTimeout: vi.fn().mockReturnThis(),
        build: vi.fn().mockReturnValue(mockTx),
      }));
      addOperation = vi.fn().mockReturnThis();
      setTimeout = vi.fn().mockReturnThis();
      build = vi.fn().mockReturnValue(mockTx);
    },
  };
});

vi.mock("../utils", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    sleep: vi.fn().mockResolvedValue(undefined),
  };
});

const CONTRACT_ID =
  "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4" as any;
const TX_HASH =
  "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

// ─── Helpers ────────────────────────────────────────────────────────────────────

function setupSuccessfulCall() {
  mockSimulateTransaction.mockResolvedValue({
    results: [{ retval: {} }],
    minResourceFee: "12345",
    cost: { cpuInsns: "67890" },
  });
  mockSignTransaction.mockResolvedValue("signed-xdr");
  mockSendTransaction.mockResolvedValue({
    status: "PENDING",
    hash: TX_HASH,
  });
  mockGetTransaction.mockResolvedValue({
    status: rpc.Api.GetTransactionStatus.SUCCESS,
    resultMetaXdr: null,
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe("useSorobanContract — status transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAccount.mockResolvedValue({
      accountId: () => "GABC123XYZ",
      sequenceNumber: () => "1",
    });
  });

  it("initializes with idle status and derived flags", () => {
    const { result } = renderHook(() =>
      useSorobanContract(CONTRACT_ID, { method: "hello" }),
    );

    expect(result.current.status).toBe("idle");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.hash).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("progresses through full lifecycle: idle → building → signing → submitting → polling → success", async () => {
    setupSuccessfulCall();

    const { result } = renderHook(() =>
      useSorobanContract(CONTRACT_ID, { method: "hello" }),
    );

    expect(result.current.status).toBe("idle");

    await act(async () => {
      await result.current.call();
    });

    expect(result.current.status).toBe("success");
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hash).toBe(TX_HASH);

    expect(mockGetAccount).toHaveBeenCalled();
    expect(mockSimulateTransaction).toHaveBeenCalled();
    expect(mockSignTransaction).toHaveBeenCalled();
    expect(mockSendTransaction).toHaveBeenCalled();
    expect(mockGetTransaction).toHaveBeenCalled();

    const simOrder = mockSimulateTransaction.mock.invocationCallOrder[0];
    const signOrder = mockSignTransaction.mock.invocationCallOrder[0];
    const sendOrder = mockSendTransaction.mock.invocationCallOrder[0];
    const getOrder = mockGetTransaction.mock.invocationCallOrder[0];
    expect(simOrder).toBeLessThan(signOrder);
    expect(signOrder).toBeLessThan(sendOrder);
    expect(sendOrder).toBeLessThan(getOrder);
  });

  it("fires onSuccess callback on successful completion", async () => {
    setupSuccessfulCall();
    const onSuccess = vi.fn();

    const { result } = renderHook(() =>
      useSorobanContract(CONTRACT_ID, { method: "hello", onSuccess }),
    );

    await act(async () => {
      await result.current.call();
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("transitions to error when user cancels signing", async () => {
    mockSimulateTransaction.mockResolvedValue({
      results: [{ retval: {} }],
    });
    mockSignTransaction.mockRejectedValue(new Error("User declined access"));

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useSorobanContract(CONTRACT_ID, { method: "hello", onError }),
    );

    await act(async () => {
      await result.current.call();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.isError).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error?.message).toContain("User declined access");
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("transitions to error when transaction submission fails", async () => {
    mockSimulateTransaction.mockResolvedValue({
      results: [{ retval: {} }],
    });
    mockSignTransaction.mockResolvedValue("signed-xdr");
    mockSendTransaction.mockResolvedValue({
      status: "ERROR",
      errorResult: "tx_bad_seq",
    });

    const { result } = renderHook(() =>
      useSorobanContract(CONTRACT_ID, { method: "hello" }),
    );

    await act(async () => {
      await result.current.call();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.isError).toBe(true);
    expect(result.current.error?.type).toBe("network");
    expect(result.current.error?.message).toContain("Submission failed");
  });

  it("transitions to error when simulation returns an error", async () => {
    mockSimulateTransaction.mockResolvedValue({
      error: "contract method not found",
    });

    const { result } = renderHook(() =>
      useSorobanContract(CONTRACT_ID, { method: "bad_method" }),
    );

    await act(async () => {
      await result.current.call();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error?.type).toBe("network");
    expect(result.current.error?.message).toContain("Simulation failed");
  });

  it("transitions to error when transaction fails on-chain", async () => {
    mockSimulateTransaction.mockResolvedValue({
      results: [{ retval: {} }],
    });
    mockSignTransaction.mockResolvedValue("signed-xdr");
    mockSendTransaction.mockResolvedValue({
      status: "PENDING",
      hash: TX_HASH,
    });
    mockGetTransaction.mockResolvedValue({
      status: rpc.Api.GetTransactionStatus.FAILED,
    });

    const { result } = renderHook(() =>
      useSorobanContract(CONTRACT_ID, { method: "hello" }),
    );

    await act(async () => {
      await result.current.call();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error?.type).toBe("transaction");
    expect(result.current.error?.message).toContain("failed on-chain");
  });

  it("performs a dryRun (simulation-only) without signing — alias of query with explicit naming", async () => {
    mockSimulateTransaction.mockResolvedValue({
      result: { retval: xdr.ScVal.scvSymbol("dry_ok") },
      latestLedger: 100,
      minResourceFee: "400",
      cost: { cpuInsns: "2222" },
    });

    const { result } = renderHook(() =>
      useSorobanContract("CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4" as any, {
        method: "get_val",
        parseResult: () => "parsed_val",
      })
    );

    await act(async () => {
      const dryRes = await result.current.dryRun();
      expect(dryRes).toBe("parsed_val");
    });

    // Lifecycle lands on success — not building/signing/submitting.
    expect(result.current.status).toBe("success");
    expect(result.current.simulation).toMatchObject({
      latestLedger: 100,
      minResourceFee: "400",
    });
    expect(result.current.estimatedCost).toEqual({
      resourceFee: "400",
      instructions: "2222",
      cost: { cpuInsns: "2222" },
    });

    // dryRun must NEVER touch the signing or submission surface.
    expect(mockSignTransaction).not.toHaveBeenCalled();
    expect(mockSendTransaction).not.toHaveBeenCalled();

    // Sanity: dryRun and query are documented as the same underlying
    // function. If a future refactor ever diverges them, this test
    // surfaces the change instead of silently keeping both in sync.
    expect(result.current.dryRun).toBe(result.current.query);
  });

  it("propagates simulation failures from dryRun into the error state", async () => {
    mockSimulateTransaction.mockResolvedValue({ error: "contract revert: not allowed" });

    const { result } = renderHook(() =>
      useSorobanContract("CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4" as any, { method: "increment" })
    );

    await act(async () => {
      const dryRes = await result.current.dryRun();
      expect(dryRes).toBeNull();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error?.message).toMatch(/Simulation failed/);
    expect(result.current.result).toBeNull();
    expect(result.current.simulation).toBeNull();
    expect(result.current.estimatedCost).toBeNull();
  });

  it("captures the raw simulation response and normalized estimate from simulate()", async () => {
    mockSimulateTransaction.mockResolvedValue({
      result: { retval: xdr.ScVal.scvSymbol("preview") },
      latestLedger: 321,
      minResourceFee: "777",
      cost: { cpuInsns: "8888", memBytes: "1024" },
    });

    const { result } = renderHook(() =>
      useSorobanContract(CONTRACT_ID, { method: "hello" }),
    );

    await act(async () => {
      const sim = await result.current.simulate();
      expect(sim).toMatchObject({
        latestLedger: 321,
        minResourceFee: "777",
      });
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.simulation).toMatchObject({
      latestLedger: 321,
      minResourceFee: "777",
    });
    expect(result.current.estimatedCost).toEqual({
      resourceFee: "777",
      instructions: "8888",
      cost: { cpuInsns: "8888", memBytes: "1024" },
    });
  });

  it("exposes the estimate before signing during call()", async () => {
    let resolveSigning!: (value: string) => void;
    mockSimulateTransaction.mockResolvedValue({
      results: [{ retval: {} }],
      minResourceFee: "999",
      cost: { cpuInsns: "54321" },
    });
    mockSignTransaction.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveSigning = resolve;
        }),
    );
    mockSendTransaction.mockResolvedValue({
      status: "PENDING",
      hash: TX_HASH,
    });
    mockGetTransaction.mockResolvedValue({
      status: rpc.Api.GetTransactionStatus.SUCCESS,
      resultMetaXdr: null,
    });

    const { result } = renderHook(() =>
      useSorobanContract(CONTRACT_ID, { method: "hello" }),
    );

    let callPromise!: Promise<unknown>;
    act(() => {
      callPromise = result.current.call();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("signing");
    });

    expect(result.current.estimatedCost).toEqual({
      resourceFee: "999",
      instructions: "54321",
      cost: { cpuInsns: "54321" },
    });
    expect(result.current.simulation).toMatchObject({
      minResourceFee: "999",
    });

    await act(async () => {
      resolveSigning("signed-xdr");
      await callPromise;
    });

    expect(result.current.status).toBe("success");
    expect(result.current.estimatedCost?.resourceFee).toBe("999");
  });

  it("reset() clears all state back to idle", async () => {
    mockSimulateTransaction.mockResolvedValue({
      error: "boom",
    });

    const { result } = renderHook(() =>
      useSorobanContract(CONTRACT_ID, { method: "hello" }),
    );

    await act(async () => {
      await result.current.call();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.hash).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("reset() clears state after a successful call", async () => {
    setupSuccessfulCall();

    const { result } = renderHook(() =>
      useSorobanContract(CONTRACT_ID, { method: "hello" }),
    );

    await act(async () => {
      await result.current.call();
    });

    expect(result.current.status).toBe("success");

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.hash).toBeNull();
    expect(result.current.result).toBeNull();
  });

  describe("optimistic updates", () => {
    it("sets optimistic result immediately during call and keeps it on success", async () => {
      setupSuccessfulCall();

      const { result } = renderHook(() =>
        useSorobanContract<number>(CONTRACT_ID, {
          method: "increment",
          optimisticResult: 42,
        }),
      );

      let callPromise: Promise<number | null>;
      act(() => {
        callPromise = result.current.call();
      });

      // While building/processing, result should reflect optimistic result
      expect(result.current.result).toBe(42);

      await act(async () => {
        await callPromise;
      });

      expect(result.current.status).toBe("success");
    });

    it("rolls back optimistic result to previous result on error", async () => {
      mockSimulateTransaction.mockResolvedValueOnce({
        error: "Host function error",
      });

      const { result } = renderHook(() =>
        useSorobanContract<string>(CONTRACT_ID, {
          method: "bad_method",
        }),
      );

      // Initially result is null
      expect(result.current.result).toBeNull();

      let callPromise: Promise<string | null>;
      act(() => {
        callPromise = result.current.call({ optimisticResult: "optimistic_value" });
      });

      // Immediately set to optimistic value
      expect(result.current.result).toBe("optimistic_value");

      await act(async () => {
        await callPromise;
      });

      // Rolled back to previous result (null) on failure
      expect(result.current.status).toBe("error");
      expect(result.current.result).toBeNull();
    });
  });
});
