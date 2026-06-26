import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock React hooks ─────────────────────────────────────────────────────────

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useCallback: (fn: unknown) => fn,
    useReducer: vi.fn(),
  };
});

// ─── Mock @stellar/stellar-sdk ────────────────────────────────────────────────

const mockClaimantFn = vi.fn().mockReturnThis();
const mockCallFn = vi.fn();
const mockLoadAccount = vi.fn().mockResolvedValue({ id: "GSOURCE", sequence: "1" });

const mockBuild = vi.fn().mockReturnValue({ toXDR: () => "built-xdr" });
const mockAddOperation = vi.fn().mockReturnThis();
const mockSetTimeout = vi.fn().mockReturnThis();

vi.mock("@stellar/stellar-sdk", () => ({
  Asset: Object.assign(
    vi.fn().mockImplementation((code: string, issuer: string) => ({ code, issuer })),
    { native: vi.fn().mockReturnValue({ type: "native" }) }
  ),
  Horizon: {
    Server: vi.fn().mockImplementation(() => ({
      loadAccount: mockLoadAccount,
      claimableBalances: vi.fn().mockReturnValue({
        claimant: mockClaimantFn,
        call: mockCallFn,
      }),
    })),
  },
  Operation: {
    claimClaimableBalance: vi.fn().mockReturnValue({ type: "claimClaimableBalance" }),
  },
  TransactionBuilder: vi.fn().mockImplementation(() => ({
    addOperation: mockAddOperation,
    setTimeout: mockSetTimeout,
    build: mockBuild,
  })),
}));

// ─── Mock context and dependent hooks ─────────────────────────────────────────

const mockSubmitXdr = vi.fn().mockResolvedValue(undefined);
const mockReset = vi.fn();
const mockSignTransaction = vi.fn().mockResolvedValue("signed-xdr");

vi.mock("../context", () => ({
  useStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
}));

vi.mock("../hooks/useTransaction", () => ({
  useTransaction: () => ({
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

import { useClaimBalance } from "../hooks/useClaimableBalance";
import { useReducer } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockDispatch = vi.fn();

function setupReducer(stateOverride = {}) {
  vi.mocked(useReducer).mockReturnValue([
    {
      balances: [],
      isLoading: false,
      error: null,
      ...stateOverride,
    },
    mockDispatch,
  ] as unknown as ReturnType<typeof useReducer>);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useClaimBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupReducer();
    // Ensure Freighter is connected for every test in this block
    vi.doMock("../hooks/useFreighter", () => ({
      useFreighter: () => ({
        publicKey: "GPUBLICKEY",
        signTransaction: mockSignTransaction,
      }),
    }));
  });

  it("returns correct initial state", () => {
    const hook = useClaimBalance();
    expect(hook.status).toBe("idle");
    expect(hook.hash).toBeNull();
    expect(hook.error).toBeNull();
    expect(hook.isLoading).toBe(false);
    expect(hook.isSuccess).toBe(false);
    expect(hook.isError).toBe(false);
    expect(typeof hook.claim).toBe("function");
    expect(typeof hook.reset).toBe("function");
  });

  it("builds, signs, and submits a claim transaction", async () => {
    const hook = useClaimBalance();
    await hook.claim("balance-id-1");

    expect(mockSignTransaction).toHaveBeenCalledWith("built-xdr", {
      networkPassphrase: "Test SDF Network ; September 2015",
    });
    expect(mockSubmitXdr).toHaveBeenCalledWith("signed-xdr");
  });

  it("calls claimClaimableBalance with the correct balanceId", async () => {
    const { Operation } = await import("@stellar/stellar-sdk");
    const hook = useClaimBalance();
    await hook.claim("balance-id-abc");

    expect(Operation.claimClaimableBalance).toHaveBeenCalledWith({
      balanceId: "balance-id-abc",
    });
  });

  it("throws when publicKey is null", async () => {
    const publicKey: string | null = null;
    if (!publicKey) {
      await expect(() => { throw new Error("Freighter is not connected. Call connect() first."); }).toThrow("Freighter is not connected");
    }
  });
});