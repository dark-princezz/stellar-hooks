import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useClaimableBalances,
  useClaimBalance,
  useCreateClaimableBalance,
} from "./useClaimableBalance";

// ─── Mocks ──────────────────────────────────────────────────────────────────────

const {
  mockClaimableBalancesCall,
  mockLoadAccount,
  mockSignTransaction,
  mockSubmit,
} = vi.hoisted(() => ({
  mockClaimableBalancesCall: vi.fn(),
  mockLoadAccount: vi.fn().mockResolvedValue({
    accountId: () => "GABC123XYZ",
    sequenceNumber: () => "1",
  }),
  mockSignTransaction: vi.fn().mockResolvedValue("signed-xdr"),
  mockSubmit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../context", () => ({
  useStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
}));

vi.mock("./useFreighter", () => ({
  useFreighter: () => ({
    publicKey: "GBL5T5MLZ57JTBNS643LEJBKAKSOTJCCZVY54FTNZHDSNA56NS6LM3WG",
    signTransaction: mockSignTransaction,
  }),
}));

vi.mock("./useTransactionCore", () => ({
  useTransactionCore: () => ({
    submit: mockSubmit,
    reset: vi.fn(),
    status: "idle",
    hash: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  }),
}));

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    Horizon: {
      ...actual.Horizon,
      Server: vi.fn().mockImplementation(() => ({
        claimableBalances: () => ({
          claimant: () => ({
            call: mockClaimableBalancesCall,
          }),
        }),
        loadAccount: mockLoadAccount,
      })),
    },
    TransactionBuilder: vi.fn().mockImplementation(() => ({
      addOperation: vi.fn().mockReturnThis(),
      setTimeout: vi.fn().mockReturnThis(),
      build: vi.fn().mockReturnValue({ toXDR: () => "unsigned-xdr" }),
    })),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

const mockPublicKey = "GBL5T5MLZ57JTBNS643LEJBKAKSOTJCCZVY54FTNZHDSNA56NS6LM3WG";

// ─── useClaimableBalances ─────────────────────────────────────────────────────

describe("useClaimableBalances", () => {
  it("fetches claimable balances for a public key", async () => {
    const mockRecords = [
      {
        id: "balance-1",
        asset: "native",
        amount: "10.0000000",
        sponsor: "GSPONSOR",
        last_modified_ledger: 12345,
        claimants: [
          { destination: mockPublicKey, predicate: { unconditional: true } },
        ],
      },
    ];
    mockClaimableBalancesCall.mockResolvedValue({ records: mockRecords });

    const { result } = renderHook(() => useClaimableBalances(mockPublicKey));

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.balances).toHaveLength(1);
    expect(result.current.balances[0]).toMatchObject({
      id: "balance-1",
      asset: "native",
      amount: "10.0000000",
      sponsor: "GSPONSOR",
      lastModifiedLedger: 12345,
    });
    expect(result.current.error).toBeNull();
  });

  it("does nothing when publicKey is null", async () => {
    const { result } = renderHook(() => useClaimableBalances(null));

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockClaimableBalancesCall).not.toHaveBeenCalled();
    expect(result.current.balances).toEqual([]);
  });

  it("sets error state when the Horizon call fails", async () => {
    mockClaimableBalancesCall.mockRejectedValue(new Error("Horizon unreachable"));

    const { result } = renderHook(() => useClaimableBalances(mockPublicKey));

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Horizon unreachable");
  });
});

// ─── useClaimBalance ──────────────────────────────────────────────────────────

describe("useClaimBalance", () => {
  it("builds, signs, and submits a claimClaimableBalance transaction", async () => {
    const { result } = renderHook(() => useClaimBalance());

    await act(async () => {
      await result.current.claim("balance-1");
    });

    expect(mockLoadAccount).toHaveBeenCalledWith(mockPublicKey);
    expect(mockSignTransaction).toHaveBeenCalledWith(
      "unsigned-xdr",
      expect.objectContaining({ networkPassphrase: expect.any(String) })
    );
    expect(mockSubmit).toHaveBeenCalledWith("signed-xdr");
  });

  it("throws if Freighter is not connected", async () => {
    vi.doMock("./useFreighter", () => ({
      useFreighter: () => ({ publicKey: null, signTransaction: mockSignTransaction }),
    }));
    vi.resetModules();
    const { useClaimBalance: useClaimBalanceReloaded } = await import("./useClaimableBalance");

    const { result } = renderHook(() => useClaimBalanceReloaded());

    await expect(result.current.claim("balance-1")).rejects.toThrow(
      "Freighter is not connected"
    );
  });
});

// ─── useCreateClaimableBalance ─────────────────────────────────────────────────

describe("useCreateClaimableBalance", () => {
  it("builds, signs, and submits a createClaimableBalance transaction", async () => {
    const { result } = renderHook(() => useCreateClaimableBalance());

    await act(async () => {
      await result.current.create({
        asset: { type: "native" },
        amount: "10",
        claimants: [{ destination: "GDEST123" }],
      });
    });

    expect(mockLoadAccount).toHaveBeenCalledWith(mockPublicKey);
    expect(mockSignTransaction).toHaveBeenCalled();
    expect(mockSubmit).toHaveBeenCalledWith("signed-xdr");
  });

  it("throws when no claimants are provided", async () => {
    const { result } = renderHook(() => useCreateClaimableBalance());

    await expect(
      result.current.create({
        asset: { type: "native" },
        amount: "10",
        claimants: [],
      })
    ).rejects.toThrow("At least one claimant is required.");
  });
});