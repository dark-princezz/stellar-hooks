import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Operation } from "@stellar/stellar-sdk";

function makeOp(): Operation {
  return { type: "payment" } as unknown as Operation;
}

const { mockBuild, mockAddOperation, mockSetTimeout, mockAddMemo, mockFromXDR } = vi.hoisted(
  () => {
    const mockBuild = vi.fn().mockReturnValue({ toXDR: () => "built-xdr" });
    const mockAddOperation = vi.fn().mockReturnThis();
    const mockSetTimeout = vi.fn().mockReturnThis();
    const mockAddMemo = vi.fn().mockReturnThis();
    const mockFromXDR = vi.fn().mockReturnValue({ signatures: [] });
    return { mockBuild, mockAddOperation, mockSetTimeout, mockAddMemo, mockFromXDR };
  }
);

vi.mock("@stellar/stellar-sdk", () => ({
  Horizon: {
    Server: vi.fn().mockImplementation(() => ({
      loadAccount: vi.fn().mockResolvedValue({ id: "GSOURCE", sequence: "1" }),
    })),
  },
  Memo: {
    text: vi.fn().mockReturnValue({ type: "text", value: "test" }),
  },
  TransactionBuilder: Object.assign(
    vi.fn().mockImplementation(() => ({
      addOperation: mockAddOperation,
      setTimeout: mockSetTimeout,
      addMemo: mockAddMemo,
      build: mockBuild,
    })),
    { fromXDR: mockFromXDR }
  ),
}));

const mockSubmitXdr = vi.fn().mockResolvedValue(undefined);
const mockTxReset = vi.fn();
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
    reset: mockTxReset,
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
    isConnected: true,
    signTransaction: mockSignTransaction,
  }),
}));

import { useMultiSig } from "../hooks/useMultiSig";

describe("useMultiSig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the correct initial state", () => {
    const { result } = renderHook(() => useMultiSig());

    expect(result.current.status).toBe("idle");
    expect(result.current.unsignedXdr).toBeNull();
    expect(result.current.hash).toBeNull();
    expect(result.current.signatureCount).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(typeof result.current.build).toBe("function");
    expect(typeof result.current.sign).toBe("function");
    expect(typeof result.current.submit).toBe("function");
    expect(typeof result.current.reset).toBe("function");
  });

  it("builds a transaction and returns the unsigned XDR", async () => {
    const { result } = renderHook(() => useMultiSig());

    let xdr: string;
    await act(async () => {
      xdr = await result.current.build([{ type: "payment", destination: "GDEST..." } as unknown as Operation]);
    });

    expect(xdr!).toBe("built-xdr");
    expect(mockAddOperation).toHaveBeenCalledWith({
      type: "payment",
      destination: "GDEST...",
    });
    expect(mockSetTimeout).toHaveBeenCalled();
  });

  it("updates unsignedXdr state after build", async () => {
    const { result } = renderHook(() => useMultiSig());

    await act(async () => {
      await result.current.build([makeOp()]);
    });

    expect(result.current.unsignedXdr).toBe("built-xdr");
  });

  it("attaches a memo to the transaction when provided", async () => {
    const { result } = renderHook(() => useMultiSig());

    await act(async () => {
      await result.current.build([makeOp()], { memo: "multi-sig-test" });
    });

    expect(mockAddMemo).toHaveBeenCalled();
  });

  it("does not attach a memo when not provided", async () => {
    const { result } = renderHook(() => useMultiSig());

    await act(async () => {
      await result.current.build([makeOp()]);
    });

    expect(mockAddMemo).not.toHaveBeenCalled();
  });

  it("signs the stored unsigned XDR with Freighter", async () => {
    const { result } = renderHook(() => useMultiSig());

    await act(async () => {
      await result.current.build([makeOp()]);
    });

    let signed: string;
    await act(async () => {
      signed = await result.current.sign();
    });

    expect(mockSignTransaction).toHaveBeenCalledWith("built-xdr", {
      networkPassphrase: "Test SDF Network ; September 2015",
    });
    expect(signed!).toBe("signed-xdr");
  });

  it("signs an externally-provided XDR when passed explicitly", async () => {
    const { result } = renderHook(() => useMultiSig());

    await act(async () => {
      await result.current.sign("external-xdr");
    });

    expect(mockSignTransaction).toHaveBeenCalledWith("external-xdr", {
      networkPassphrase: "Test SDF Network ; September 2015",
    });
  });

  it("submits a signed XDR via useTransaction", async () => {
    const { result } = renderHook(() => useMultiSig());

    await act(async () => {
      await result.current.submit("fully-signed-xdr");
    });

    expect(mockSubmitXdr).toHaveBeenCalledWith("fully-signed-xdr");
  });

  it("resets state and calls useTransaction reset", async () => {
    const { result } = renderHook(() => useMultiSig());

    await act(async () => {
      await result.current.build([makeOp()]);
    });

    expect(result.current.unsignedXdr).toBe("built-xdr");

    await act(async () => {
      result.current.reset();
    });

    expect(result.current.unsignedXdr).toBeNull();
    expect(result.current.signatureCount).toBe(0);
    expect(mockTxReset).toHaveBeenCalled();
  });

  it("throws when signing without a built or provided XDR", async () => {
    const { result } = renderHook(() => useMultiSig());

    await expect(result.current.sign()).rejects.toThrow(
      "No transaction XDR provided"
    );
  });

  it("updates signatureCount after build based on existing signatures", async () => {
    // Return a tx with 2 signatures; use mockReturnValue (not Once) because
    // computeSignatureWeight also calls fromXDR during re-render.
    mockFromXDR.mockReturnValue({ signatures: [{}, {}] });
    const { result } = renderHook(() => useMultiSig());

    await act(async () => {
      await result.current.build([makeOp()]);
    });

    expect(result.current.signatureCount).toBe(2);
  });

  it("exposes signers, thresholds, meetsThreshold, and signatureWeight", async () => {
    mockFromXDR.mockReturnValue({ signatures: [] });
    const { result } = renderHook(() => useMultiSig());

    // Default state before build
    expect(Array.isArray(result.current.signers)).toBe(true);
    expect(result.current.signers).toHaveLength(0);
    expect(result.current.thresholds).toBeNull();
    expect(result.current.meetsThreshold).toBe(false);
    expect(result.current.signatureWeight).toBe(0);
    expect(result.current.signedBy).toEqual([]);
  });
});



