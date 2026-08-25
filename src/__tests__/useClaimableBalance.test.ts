/**
 * @file useClaimableBalance.test.ts
 * @description Unit tests for the useClaimableBalance hook.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// â”€â”€â”€ Mock React hooks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useCallback: (fn: unknown) => fn,
    useReducer: vi.fn(),
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

// ─── Mock @stellar/stellar-sdk ─────────────────────────────────────────────────

vi.mock("@stellar/stellar-sdk", () => ({
  Asset: Object.assign(
    vi.fn().mockImplementation((code: string, issuer: string) => ({ code, issuer })),
    { native: vi.fn().mockReturnValue({ type: "native" }) }
  ),
  Claimant: Object.assign(
    vi.fn().mockImplementation((destination: string, predicate: unknown) => ({
      destination,
      predicate,
    })),
    { predicateUnconditional: vi.fn().mockReturnValue({ unconditional: true }) }
  ),
  Horizon: { Server: mockHorizonServer },
  Operation: {
    claimClaimableBalance: vi.fn().mockReturnValue({ type: "claimClaimableBalance" }),
    createClaimableBalance: vi.fn().mockReturnValue({ type: "createClaimableBalance" }),
  },
  TransactionBuilder: vi.fn().mockImplementation(() => ({
    addOperation: mockAddOperation,
    setTimeout: mockSetTimeout,
    build: mockBuild,
  })),
}));

// â”€â”€â”€ Mock context and dependent hooks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const mockSubmitXdr = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockReset = vi.hoisted(() => vi.fn());

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

const mockSignTransaction = vi.hoisted(() => vi.fn().mockResolvedValue("signed-xdr"));
let mockPublicKey: string | null = vi.hoisted(() => "GPUBLICKEY" as string | null);

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

import {
  useClaimableBalances,
  useClaimBalance,
  useCreateClaimableBalance,
} from "../hooks/useClaimableBalance";
import { useReducer } from "react";

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    mockPublicKey = "GPUBLICKEY";
    setupReducer();
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

  it("calls claimClaimableBalance with the correct balanceId", async () => {
    const { Operation } = await import("@stellar/stellar-sdk");
    const hook = useClaimBalance();
    await hook.claim("balance-id-abc");

    expect(Operation.claimClaimableBalance).toHaveBeenCalledWith({
      balanceId: "balance-id-abc",
    });
    expect(mockSubmitXdr).toHaveBeenCalledWith("signed-xdr");
  });

  it("throws when publicKey is null", async () => {
    mockPublicKey = null;
    const hook = useClaimBalance();
    await expect(hook.claim("balance-id-abc")).rejects.toThrow(
      "Freighter is not connected"
    );
  });
});

describe("useCreateClaimableBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPublicKey = "GPUBLICKEY";
    setupReducer();
  });

  it("returns correct initial state", () => {
    const hook = useCreateClaimableBalance();
    expect(hook.status).toBe("idle");
    expect(hook.hash).toBeNull();
    expect(hook.error).toBeNull();
    expect(hook.isLoading).toBe(false);
    expect(hook.isSuccess).toBe(false);
    expect(hook.isError).toBe(false);
    expect(typeof hook.create).toBe("function");
    expect(typeof hook.reset).toBe("function");
  });

  it("builds, signs, and submits a create transaction", async () => {
    const hook = useCreateClaimableBalance();
    await hook.create({
      asset: { type: "native" },
      amount: "10",
      claimants: [{ destination: "GDEST..." }],
    });

    expect(mockSignTransaction).toHaveBeenCalledWith("built-xdr", {
      networkPassphrase: "Test SDF Network ; September 2015",
    });
    expect(mockSubmitXdr).toHaveBeenCalledWith("signed-xdr");
  });

  it("locks a native asset via Asset.native()", async () => {
    const { Asset } = await import("@stellar/stellar-sdk");
    const hook = useCreateClaimableBalance();
    await hook.create({
      asset: { type: "native" },
      amount: "10",
      claimants: [{ destination: "GDEST..." }],
    });

    expect(Asset.native).toHaveBeenCalled();
  });

  it("locks a credit asset via new Asset(code, issuer)", async () => {
    const { Asset } = await import("@stellar/stellar-sdk");
    const hook = useCreateClaimableBalance();
    await hook.create({
      asset: { type: "credit", code: "USDC", issuer: "GISSUER..." },
      amount: "5",
      claimants: [{ destination: "GDEST..." }],
    });

    expect(Asset.native).not.toHaveBeenCalled();
    expect(Asset).toHaveBeenCalledWith("USDC", "GISSUER...");
  });

  it("defaults to an unconditional predicate when none is given", async () => {
    const { Claimant, Operation } = await import("@stellar/stellar-sdk");
    const hook = useCreateClaimableBalance();
    await hook.create({
      asset: { type: "native" },
      amount: "10",
      claimants: [{ destination: "GDEST..." }],
    });

    expect(Claimant.predicateUnconditional).toHaveBeenCalled();
    expect(Claimant).toHaveBeenCalledWith("GDEST...", { unconditional: true });
    expect(Operation.createClaimableBalance).toHaveBeenCalledWith(
      expect.objectContaining({ amount: "10" })
    );
  });

  it("uses a supplied predicate instead of the default", async () => {
    const { Claimant } = await import("@stellar/stellar-sdk");
    const customPredicate = { custom: true } as never;
    const hook = useCreateClaimableBalance();
    await hook.create({
      asset: { type: "native" },
      amount: "10",
      claimants: [{ destination: "GDEST...", predicate: customPredicate }],
    });

    expect(Claimant.predicateUnconditional).not.toHaveBeenCalled();
    expect(Claimant).toHaveBeenCalledWith("GDEST...", customPredicate);
  });

  it("throws when no claimants are provided", async () => {
    const hook = useCreateClaimableBalance();
    await expect(
      hook.create({ asset: { type: "native" }, amount: "10", claimants: [] })
    ).rejects.toThrow("At least one claimant is required.");
  });
});

describe("useClaimableBalanceClaim & parsePredicate", () => {
  it("useClaimableBalanceClaim is an alias for useClaimBalance", () => {
    expect(useClaimableBalanceClaim).toBe(useClaimBalance);
  });

  it("parses unconditional, time-bound, and conditional predicates correctly", () => {
    const { parsePredicate, isClaimableNow } = require("../hooks/useClaimableBalance");
    
    // Unconditional
    const p1 = parsePredicate({ unconditional: true });
    expect(p1.type).toBe("unconditional");
    expect(p1.isClaimable).toBe(true);

    // Abs before (future)
    const futureDate = new Date(Date.now() + 100000).toISOString();
    const p2 = parsePredicate({ abs_before: futureDate });
    expect(p2.type).toBe("time-bound");
    expect(p2.isClaimable).toBe(true);

    // Abs before (past)
    const pastDate = new Date(Date.now() - 100000).toISOString();
    const p3 = parsePredicate({ abs_before: pastDate });
    expect(p3.type).toBe("time-bound");
    expect(p3.isClaimable).toBe(false);

    // isClaimableNow helper
    expect(isClaimableNow({ unconditional: true })).toBe(true);
    expect(isClaimableNow({ abs_before: pastDate })).toBe(false);
  });
});

