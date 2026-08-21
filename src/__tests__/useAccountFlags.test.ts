import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock("@stellar/stellar-sdk", () => ({
  Horizon: {
    Server: vi.fn().mockImplementation(() => ({
      loadAccount: vi.fn().mockResolvedValue({ id: "GSOURCE", sequence: "1" }),
    })),
  },
  Operation: {
    setOptions: vi.fn().mockImplementation((opts) => ({ type: "setOptions", ...opts })),
  },
  TransactionBuilder: vi.fn().mockImplementation(() => ({
    addOperation: mockAddOperation,
    setTimeout: mockSetTimeout,
    build: mockBuild,
  })),
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

import { useAccountFlags } from "../hooks/useAccountFlags";

function useHook(overrides = {}) {
  return useAccountFlags({
    setFlags: ["authRequired"],
    ...overrides,
  });
}

describe("useAccountFlags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("builds, signs, and submits a setOptions with setFlags", async () => {
    const hook = useHook({ setFlags: ["authRequired", "authRevocable"] });
    await hook.submit();

    expect(mockAddOperation).toHaveBeenCalledWith({
      type: "setOptions",
      setFlags: 3,
      clearFlags: undefined,
    });

    expect(mockSignTransaction).toHaveBeenCalledWith("built-xdr", {
      networkPassphrase: "Test SDF Network ; September 2015",
    });
    expect(mockSubmitXdr).toHaveBeenCalledWith("signed-xdr");
  });

  it("builds, signs, and submits a setOptions with clearFlags", async () => {
    const hook = useHook({ setFlags: undefined, clearFlags: ["authImmutable", "authClawbackEnabled"] });
    await hook.submit();

    expect(mockAddOperation).toHaveBeenCalledWith({
      type: "setOptions",
      setFlags: undefined,
      clearFlags: 12,
    });
  });

  it("builds with both setFlags and clearFlags", async () => {
    const hook = useHook({ setFlags: ["authRequired"], clearFlags: ["authRevocable"] });
    await hook.submit();

    expect(mockAddOperation).toHaveBeenCalledWith({
      type: "setOptions",
      setFlags: 1,
      clearFlags: 2,
    });
  });

  it("throws when neither setFlags nor clearFlags are provided", async () => {
    const hook = useHook({ setFlags: undefined });
    await expect(hook.submit()).rejects.toThrow(
      "At least one of setFlags or clearFlags must be provided."
    );
  });

  it("throws when publicKey is null", async () => {
    const submitFn = async () => {
      const publicKey: string | null = null;
      if (!publicKey) {
        throw new Error("Freighter is not connected. Call connect() first.");
      }
    };
    await expect(submitFn()).rejects.toThrow("Freighter is not connected");
  });
});



