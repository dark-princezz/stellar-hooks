/**
 * @file useMultiOperationTransaction.test.ts
 * @description Unit tests for the useMultiOperationTransaction hook.
 * @package stellar-hooks
 * @license MIT
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useCallback: (fn: unknown) => fn,
    useReducer: (_reducer: unknown, initial: unknown) => [initial, vi.fn()],
  };
});

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
    text: vi.fn().mockReturnValue({ type: "text", value: "bundle memo" }),
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
    },
  ),
}));

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

import { useMultiOperationTransaction } from "../hooks/useMultiOperationTransaction";

function makeOp() {
  return { type: "payment" } as unknown as import("@stellar/stellar-sdk").xdr.Operation;
}

function useHook(
  overrides: Parameters<typeof useMultiOperationTransaction>[0] = {},
) {
  return useMultiOperationTransaction(overrides);
}

describe("useMultiOperationTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(typeof hook.build).toBe("function");
    expect(typeof hook.submit).toBe("function");
    expect(typeof hook.reset).toBe("function");
  });

  it("builds a single transaction XDR from multiple operations", async () => {
    const hook = useHook({ memo: "bundle memo" });

    const builtXdr = await hook.build([makeOp(), makeOp(), makeOp()]);

    expect(builtXdr).toBe("built-xdr");
    expect(mockAddOperation).toHaveBeenCalledTimes(3);
    expect(mockAddMemo).toHaveBeenCalledTimes(1);
  });

  it("resolves lazy operation builders before building", async () => {
    const hook = useHook();
    const builderA = vi.fn().mockResolvedValue(makeOp());
    const builderB = vi.fn().mockResolvedValue(makeOp());

    await hook.submit([builderA, builderB]);

    expect(builderA).toHaveBeenCalledTimes(1);
    expect(builderB).toHaveBeenCalledTimes(1);
    expect(mockAddOperation).toHaveBeenCalledTimes(2);
    expect(mockSubmitXdr).toHaveBeenCalledWith("signed-xdr");
  });

  it("signs and submits one transaction for the full operation batch", async () => {
    const hook = useHook();

    await hook.submit([makeOp(), makeOp()]);

    expect(mockSignTransaction).toHaveBeenCalledTimes(1);
    expect(mockSubmitXdr).toHaveBeenCalledTimes(1);
    expect(mockSubmitXdr).toHaveBeenCalledWith("signed-xdr");
  });

  it("supports fee-bump sponsorship for the combined transaction", async () => {
    const { TransactionBuilder } = await import("@stellar/stellar-sdk");
    const hook = useHook({
      feeBump: { fee: "1000", sponsor: "GSPONSOR" },
    });

    await hook.submit([makeOp(), makeOp()]);

    expect(TransactionBuilder.buildFeeBumpTransaction).toHaveBeenCalledWith(
      "GSPONSOR",
      "1000",
      expect.anything(),
      "Test SDF Network ; September 2015",
    );
    expect(mockSignTransaction).toHaveBeenCalledTimes(2);
  });

  it("throws when the batch is empty", async () => {
    const hook = useHook();

    await expect(hook.submit([])).rejects.toThrow(
      "At least one operation is required.",
    );
  });

  it("exposes reset from the underlying core hook", () => {
    const hook = useHook();

    hook.reset();
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
