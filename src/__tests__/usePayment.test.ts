/**
 * @file usePayment.test.ts
 * @description Unit tests for the usePayment hook.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// â”€â”€â”€ Mock React hooks so they run outside a component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useCallback: (fn: unknown) => fn,
    useReducer: (_reducer: unknown, initial: unknown) => [initial, vi.fn()],
  };
});

const mockLoadAccount = vi.hoisted(() => vi.fn().mockResolvedValue({ id: "GSOURCE" }));
const mockHorizonServer = vi.hoisted(() => vi.fn().mockImplementation(() => ({
  loadAccount: mockLoadAccount,
})));

const mockAddOperation = vi.hoisted(() => vi.fn());
const mockSetTimeout = vi.hoisted(() => vi.fn());
const mockAddMemo = vi.hoisted(() => vi.fn());
const mockBuild = vi.hoisted(() => vi.fn().mockReturnValue({ toXDR: () => "built-xdr" }));
mockAddOperation.mockReturnValue({ setTimeout: mockSetTimeout });
mockSetTimeout.mockReturnValue({ build: mockBuild, addMemo: mockAddMemo });

// ─── Mock @stellar/stellar-sdk ─────────────────────────────────────────────────

vi.mock("@stellar/stellar-sdk", () => ({
  StrKey: {
    isValidEd25519PublicKey: vi.fn().mockReturnValue(true),
  },
  Asset: Object.assign(
    vi.fn().mockImplementation((code: string, issuer: string) => ({ type: "credit", code, issuer })),
    {
      native: vi.fn().mockReturnValue({ type: "native" }),
    }
  ),
  Memo: {
    text: vi.fn().mockReturnValue({ type: "text", value: "Thanks!" }),
  },
  Operation: {
    payment: vi.fn().mockReturnValue({ type: "payment" }),
  },
  Horizon: { Server: mockHorizonServer },
  TransactionBuilder: vi.fn().mockImplementation(() => ({
    addOperation: mockAddOperation,
  })),
}));

// â”€â”€â”€ Mock context and dependent hooks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const mockSubmitXdr = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockReset = vi.hoisted(() => vi.fn());

const mockSignTransaction = vi.hoisted(() => vi.fn().mockResolvedValue("signed-xdr"));
let mockPublicKey: string | null = vi.hoisted(() => "GPUBLICKEY" as string | null);

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

// ─── Import AFTER mocks ───────────────────────────────────────────────────────
vi.mock("../hooks/useFreighter", () => ({
  useFreighter: () => ({
    get publicKey() {
      return mockPublicKey;
    },
    signTransaction: mockSignTransaction,
  }),
}));

// â”€â”€â”€ Import AFTER mocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { usePayment } from "../hooks/usePayment";

// â”€â”€â”€ Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function useHook(overrides = {}) {
  return usePayment({
    destination: "GDEST...",
    asset: { type: "native" },
    amount: "10",
    ...overrides,
  });
}

// â”€â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("usePayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPublicKey = "GPUBLICKEY";
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

  it("builds, signs, and submits an XLM payment", async () => {
    const { Operation } = await import("@stellar/stellar-sdk");
    const hook = useHook();
    await hook.submit();

    expect(Operation.payment).toHaveBeenCalledWith({
      destination: "GDEST...",
      asset: { type: "native" },
      amount: "10",
    });
    expect(mockSubmitXdr).toHaveBeenCalledWith("signed-xdr");
  });

  it("passes fee and timeout options through to the transaction", async () => {
    const hook = useHook({ memo: "test-memo", fee: 200, timeoutSeconds: 30 });
    await hook.submit();
    expect(mockSubmitXdr).toHaveBeenCalledWith("signed-xdr");
  });

  it("attaches a memo when provided", async () => {
    const { Memo } = await import("@stellar/stellar-sdk");
    const hook = useHook({ memo: "Thanks!" });
    await hook.submit();

    expect(Memo.text).toHaveBeenCalledWith("Thanks!");
    expect(mockAddMemo).toHaveBeenCalled();
  });

  it("does not attach a memo when not provided", async () => {
    const hook = useHook();
    await hook.submit();

    expect(mockAddMemo).not.toHaveBeenCalled();
  });

  it("uses Asset.native() for native asset type", async () => {
    const { Asset } = await import("@stellar/stellar-sdk");
    const hook = useHook({ asset: { type: "native" } });
    await hook.submit();

    expect(Asset.native).toHaveBeenCalled();
  });

  it("uses a credit asset when asset type is credit", async () => {
    const { Asset, Operation } = await import("@stellar/stellar-sdk");
    const hook = useHook({
      asset: { type: "credit", code: "USDC", issuer: "GISSUER..." },
    });
    await hook.submit();

    expect(Operation.payment).toHaveBeenCalledWith(expect.objectContaining({
      asset: { type: "credit", code: "USDC", issuer: "GISSUER..." },
    }));
    expect(Asset.native).not.toHaveBeenCalled();
    expect(Asset).toHaveBeenCalledWith("USDC", "GISSUER...");
  });

  it("throws when publicKey is null", async () => {
    mockPublicKey = null;
    const hook = useHook();
    await expect(hook.submit()).rejects.toThrow("Freighter is not connected");
    expect(mockSignTransaction).not.toHaveBeenCalled();
    expect(mockSubmitXdr).not.toHaveBeenCalled();
  });
});

