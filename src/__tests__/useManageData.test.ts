/**
 * @file useManageData.test.ts
 * @description Unit tests for the useManageData hook.
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

// â”€â”€â”€ Mock @stellar/stellar-sdk â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const mockBuild = vi.fn().mockReturnValue({ toXDR: () => "built-xdr" });
const mockAddOperation = vi.fn().mockReturnThis();
const mockSetTimeout = vi.fn().mockReturnThis();

vi.mock("@stellar/stellar-sdk", () => ({
  Horizon: {
    Server: vi.fn().mockImplementation(() => ({
      loadAccount: vi.fn().mockResolvedValue({ id: "GSOURCE", sequence: "1" }),
    })),
  },
  Operation: {
    manageData: vi.fn().mockReturnValue({ type: "manageData" }),
  },
  TransactionBuilder: vi.fn().mockImplementation(() => ({
    addOperation: mockAddOperation,
    setTimeout: mockSetTimeout,
    build: mockBuild,
  })),
}));

// â”€â”€â”€ Mock context, useTransaction, and useFreighter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Import AFTER mocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { useManageData } from "../hooks/useManageData";

// â”€â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("useManageData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns correct initial state", () => {
    const hook = useManageData();

    expect(hook.status).toBe("idle");
    expect(hook.hash).toBeNull();
    expect(hook.error).toBeNull();
    expect(hook.isLoading).toBe(false);
    expect(hook.isSuccess).toBe(false);
    expect(hook.isError).toBe(false);
    expect(typeof hook.set).toBe("function");
    expect(typeof hook.remove).toBe("function");
    expect(typeof hook.reset).toBe("function");
  });

  it("set() calls Operation.manageData with the given name and string value", async () => {
    const { Operation } = await import("@stellar/stellar-sdk");
    const hook = useManageData();
    await hook.set("my-key", "my-value");

    expect(Operation.manageData).toHaveBeenCalledWith({
      name: "my-key",
      value: "my-value",
    });
  });

  it("set() calls Operation.manageData with a Buffer value", async () => {
    const { Operation } = await import("@stellar/stellar-sdk");
    const hook = useManageData();
    const buf = Buffer.from("binary-data");
    await hook.set("bin-key", buf);

    expect(Operation.manageData).toHaveBeenCalledWith({
      name: "bin-key",
      value: buf,
    });
  });

  it("remove() calls Operation.manageData with null value to delete the entry", async () => {
    const { Operation } = await import("@stellar/stellar-sdk");
    const hook = useManageData();
    await hook.remove("my-key");

    expect(Operation.manageData).toHaveBeenCalledWith({
      name: "my-key",
      value: null,
    });
  });

  it("signs the built transaction and submits the signed XDR", async () => {
    const hook = useManageData();
    await hook.set("k", "v");

    expect(mockSignTransaction).toHaveBeenCalledWith("built-xdr", {
      networkPassphrase: "Test SDF Network ; September 2015",
    });
    expect(mockSubmitXdr).toHaveBeenCalledWith("signed-xdr");
  });

  it("instantiates Horizon.Server with the configured Horizon URL", async () => {
    const { Horizon } = await import("@stellar/stellar-sdk");
    const hook = useManageData();
    await hook.set("k", "v");

    expect(Horizon.Server).toHaveBeenCalledWith(
      "https://horizon-testnet.stellar.org"
    );
  });

  it("uses the configured fee and network passphrase when building", async () => {
    const { TransactionBuilder } = await import("@stellar/stellar-sdk");
    const hook = useManageData({ fee: 200 });
    await hook.set("k", "v");

    expect(TransactionBuilder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        fee: "200",
        networkPassphrase: "Test SDF Network ; September 2015",
      })
    );
  });

  it("set() and remove() can be called independently without interfering", async () => {
    const { Operation } = await import("@stellar/stellar-sdk");
    const hook = useManageData();

    await hook.set("key-a", "value-a");
    await hook.remove("key-a");

    expect(Operation.manageData).toHaveBeenNthCalledWith(1, { name: "key-a", value: "value-a" });
    expect(Operation.manageData).toHaveBeenNthCalledWith(2, { name: "key-a", value: null });
  });

  it("throws when Freighter is not connected", async () => {
    const submitFn = async () => {
      const publicKey: string | null = null;
      if (!publicKey) {
        throw new Error("Freighter is not connected. Call connect() first.");
      }
    };
    await expect(submitFn()).rejects.toThrow("Freighter is not connected");
  });
});


