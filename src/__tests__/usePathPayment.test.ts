/**
 * @file usePathPayment.test.ts
 * @description Unit tests for the usePathPayment hook.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// â”€â”€â”€ Mock React â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
const mockBuild = vi.hoisted(() => vi.fn().mockReturnValue({ toXDR: () => "built-xdr" }));
mockAddOperation.mockReturnValue({ setTimeout: mockSetTimeout });
mockSetTimeout.mockReturnValue({ build: mockBuild });
const mockTransactionBuilder = vi.hoisted(() => vi.fn());
mockTransactionBuilder.mockImplementation(() => ({
  addOperation: mockAddOperation,
}));

// ─── Mock @stellar/stellar-sdk ─────────────────────────────────────────────────

vi.mock("@stellar/stellar-sdk", () => ({
  StrKey: {
    isValidEd25519PublicKey: vi.fn().mockReturnValue(true),
  },
  Asset: Object.assign(
    vi.fn().mockImplementation((code: string, issuer: string) => ({ type: "credit", code, issuer })),
    { native: vi.fn().mockReturnValue({ type: "native" }) }
  ),
  Operation: {
    pathPaymentStrictSend: vi.fn().mockReturnValue({ type: "pathPaymentStrictSend" }),
    pathPaymentStrictReceive: vi.fn().mockReturnValue({ type: "pathPaymentStrictReceive" }),
  },
  Horizon: { Server: mockHorizonServer },
  TransactionBuilder: mockTransactionBuilder,
}));

// â”€â”€â”€ Mock context and hooks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const mockSubmitXdr = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockReset = vi.hoisted(() => vi.fn());

const mockSignTransaction = vi.hoisted(() => vi.fn().mockResolvedValue("signed-xdr"));
const mockPublicKey = vi.hoisted(() => ({ value: "GPUBLICKEY" }));

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
    publicKey: mockPublicKey.value,
    signTransaction: mockSignTransaction,
  }),
}));

// â”€â”€â”€ Import AFTER mocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { usePathPayment } from "../hooks/usePathPayment";

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const baseOptions = {
  sendAsset: { type: "native" as const },
  sendAmount: "10",
  destination: "GDEST...",
  destAsset: { type: "credit" as const, code: "USDC", issuer: "GISSUER..." },
  destMin: "9",
};

function useHook(overrides = {}) {
  return usePathPayment({ mode: "strict-send", ...baseOptions, ...overrides });
}

// â”€â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("usePathPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPublicKey.value = "GPUBLICKEY";
  });

  it("returns correct initial state", () => {
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

  it("calls pathPaymentStrictSend when mode is strict-send", async () => {
    const { Operation } = await import("@stellar/stellar-sdk");
    const hook = useHook({ mode: "strict-send" });
    await hook.submit();

    expect(Operation.pathPaymentStrictSend).toHaveBeenCalledWith(
      expect.objectContaining({
        sendAmount: "10",
        destination: "GDEST...",
        destMin: "9",
      })
    );
    expect(mockSubmitXdr).toHaveBeenCalledWith("signed-xdr");
    expect(Operation.pathPaymentStrictReceive).not.toHaveBeenCalled();
  });

  it("calls pathPaymentStrictReceive when mode is strict-receive", async () => {
    const { Operation } = await import("@stellar/stellar-sdk");
    const hook = useHook({ mode: "strict-receive" });
    await hook.submit();

    expect(Operation.pathPaymentStrictReceive).toHaveBeenCalledWith(
      expect.objectContaining({
        sendMax: "10",
        destination: "GDEST...",
        destAmount: "9",
      })
    );
    expect(mockSubmitXdr).toHaveBeenCalledWith("signed-xdr");
    expect(Operation.pathPaymentStrictSend).not.toHaveBeenCalled();
  });

  it("signs and submits the built transaction", async () => {
    const hook = useHook();
    await hook.submit();

    expect(mockSignTransaction).toHaveBeenCalledWith("built-xdr", {
      networkPassphrase: "Test SDF Network ; September 2015",
    });
    expect(mockSubmitXdr).toHaveBeenCalledWith("signed-xdr");
  });

  it("uses Asset.native() for native send asset", async () => {
    const { Asset } = await import("@stellar/stellar-sdk");
    const hook = useHook({ sendAsset: { type: "native" } });
    await hook.submit();

    expect(Asset.native).toHaveBeenCalled();
  });

  it("uses Asset constructor for credit send asset", async () => {
    const { Asset } = await import("@stellar/stellar-sdk");
    const hook = useHook({ sendAsset: { type: "credit", code: "XLM2", issuer: "GSEND..." } });
    await hook.submit();

    expect(Asset).toHaveBeenCalledWith("XLM2", "GSEND...");
  });

  it("uses Asset.native() for native dest asset", async () => {
    const { Asset } = await import("@stellar/stellar-sdk");
    const hook = useHook({ destAsset: { type: "native" } });
    await hook.submit();

    expect(Asset.native).toHaveBeenCalled();
  });

  it("uses Asset constructor for credit dest asset", async () => {
    const { Asset } = await import("@stellar/stellar-sdk");
    const hook = useHook();
    await hook.submit();

    expect(Asset).toHaveBeenCalledWith("USDC", "GISSUER...");
  });

  it("passes intermediate path assets to the operation", async () => {
    const { Operation } = await import("@stellar/stellar-sdk");
    const hook = useHook({
      mode: "strict-send",
      path: [{ type: "credit", code: "XLM2", issuer: "GPATH..." }],
    });
    await hook.submit();

    expect(Operation.pathPaymentStrictSend).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.arrayContaining([expect.anything()]),
      })
    );
  });

  it("passes an empty path array by default", async () => {
    const { Operation } = await import("@stellar/stellar-sdk");
    const hook = useHook({ mode: "strict-send" });
    await hook.submit();

    expect(Operation.pathPaymentStrictSend).toHaveBeenCalledWith(
      expect.objectContaining({
        path: [],
      })
    );
  });

  it("creates Horizon.Server with config.horizonUrl", async () => {
    const { Horizon } = await import("@stellar/stellar-sdk");
    const hook = useHook();
    await hook.submit();

    expect(Horizon.Server).toHaveBeenCalledWith(
      "https://horizon-testnet.stellar.org"
    );
  });

  it("builds TransactionBuilder with fee and networkPassphrase", async () => {
    const { TransactionBuilder } = await import("@stellar/stellar-sdk");
    const hook = useHook({ fee: 200 });
    await hook.submit();

    expect(TransactionBuilder).toHaveBeenCalledWith(
      expect.objectContaining({ id: "GSOURCE" }),
      expect.objectContaining({
        fee: "200",
        networkPassphrase: "Test SDF Network ; September 2015",
      })
    );
  });

  it("passes custom timeoutSeconds to the operation", async () => {
    const { Operation } = await import("@stellar/stellar-sdk");
    const hook = useHook({ mode: "strict-send", timeoutSeconds: 120 });
    await hook.submit();

    expect(Operation.pathPaymentStrictSend).toHaveBeenCalled();
  });

  it("loads the source account using publicKey", async () => {
    const { Horizon } = await import("@stellar/stellar-sdk");
    const hook = useHook();
    await hook.submit();

    const serverMock = vi.mocked(Horizon.Server);
    const serverInstance = serverMock.mock.results[0].value;
    expect(serverInstance.loadAccount).toHaveBeenCalledWith("GPUBLICKEY");
  });

  it("calls addOperation and setTimeout on the transaction builder", async () => {
    const hook = useHook();
    await hook.submit();

    expect(mockAddOperation).toHaveBeenCalledWith({
      type: "pathPaymentStrictSend",
    });
    expect(mockSetTimeout).toHaveBeenCalledWith(60);
  });

  it("calls reset() from useTransaction", () => {
    const hook = useHook();
    hook.reset();
    expect(mockReset).toHaveBeenCalled();
  });

  it("throws when publicKey is null", async () => {
    mockPublicKey.value = null;
    const hook = useHook();
    await expect(hook.submit()).rejects.toThrow(
      "Freighter is not connected. Call connect() first."
    );
  });

  describe("strict-send parameter mapping", () => {
    it("maps sendAmount and destMin correctly for credit send and native dest", async () => {
      const { Operation } = await import("@stellar/stellar-sdk");
      const hook = useHook({
        mode: "strict-send",
        sendAsset: { type: "credit", code: "USDC", issuer: "GISSUER..." },
        destAsset: { type: "native" },
        sendAmount: "50",
        destMin: "40",
      });
      await hook.submit();

      expect(Operation.pathPaymentStrictSend).toHaveBeenCalledWith(
        expect.objectContaining({
          sendAmount: "50",
          destMin: "40",
        })
      );
    });
  });

  describe("strict-receive parameter mapping", () => {
    it("maps sendAmount as sendMax and destMin as destAmount", async () => {
      const { Operation } = await import("@stellar/stellar-sdk");
      const hook = useHook({
        mode: "strict-receive",
        sendAmount: "11",
        destMin: "10",
      });
      await hook.submit();

      expect(Operation.pathPaymentStrictReceive).toHaveBeenCalledWith(
        expect.objectContaining({
          sendMax: "11",
          destAmount: "10",
        })
      );
    });

    it("works with both assets as credit", async () => {
      const { Operation } = await import("@stellar/stellar-sdk");
      const hook = useHook({
        mode: "strict-receive",
        sendAsset: { type: "credit", code: "USDC", issuer: "GISSUER1..." },
        destAsset: { type: "credit", code: "EURT", issuer: "GISSUER2..." },
        sendAmount: "50",
        destMin: "45",
      });
      await hook.submit();

      expect(Operation.pathPaymentStrictReceive).toHaveBeenCalledWith(
        expect.objectContaining({
          sendMax: "50",
          destAmount: "45",
        })
      );
    });

    it("works with both assets as native", async () => {
      const { Operation } = await import("@stellar/stellar-sdk");
      const hook = useHook({
        mode: "strict-receive",
        sendAsset: { type: "native" },
        destAsset: { type: "native" },
        sendAmount: "100",
        destMin: "100",
      });
      await hook.submit();

      expect(Operation.pathPaymentStrictReceive).toHaveBeenCalledWith(
        expect.objectContaining({
          sendMax: "100",
          destAmount: "100",
        })
      );
    });
  });
});


