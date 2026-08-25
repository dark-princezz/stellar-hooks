import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockOffersResponse = {
  records: [
    {
      id: "101",
      seller: "GPUBLICKEY",
      selling: { asset_type: "native" },
      buying: { asset_type: "credit_alphanum4", asset_code: "USDC", asset_issuer: "GISSUER" },
      amount: "10.0000000",
      price: "1.5000000",
    },
  ],
  _links: {
    next: { href: "https://horizon.stellar.org/offers?cursor=101" },
    prev: { href: "https://horizon.stellar.org/offers?cursor=100" },
  },
};

const mockForAccount = vi.fn().mockImplementation(() => ({
  limit: vi.fn().mockImplementation(() => ({
    call: vi.fn().mockResolvedValue(mockOffersResponse),
    cursor: vi.fn().mockImplementation(() => ({
      call: vi.fn().mockResolvedValue(mockOffersResponse),
    })),
  })),
}));

vi.mock("../utils/memoizedServers", () => ({
  getHorizonServer: () => ({
    offers: () => ({
      forAccount: mockForAccount,
    }),
  }),
}));

const mockLoadAccount = vi.fn().mockResolvedValue({ id: "GSOURCE" });
vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/stellar-sdk")>();
  return {
    ...actual,
    Horizon: {
      Server: vi.fn().mockImplementation(() => ({
        loadAccount: mockLoadAccount,
      })),
    },
  };
});

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
}));

const mockSubmitXdr = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks/useTransactionCore", () => ({
  useTransactionCore: () => ({
    submit: mockSubmitXdr,
    reset: vi.fn(),
    status: "idle",
    hash: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  }),
}));

const mockSignTransaction = vi.fn().mockResolvedValue("signed-xdr");
vi.mock("../hooks/useFreighter", () => ({
  useFreighter: () => ({
    publicKey: "GPUBLICKEY",
    isConnected: true,
    signTransaction: mockSignTransaction,
  }),
}));

import { useOffer } from "../hooks/useOffer";

describe("useOffer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns initial state and lists offers for connected account", async () => {
    const { result } = renderHook(() => useOffer());

    await vi.waitFor(() => {
      expect(result.current.offers).toHaveLength(1);
    });

    expect(result.current.offers[0].id).toBe("101");
    expect(typeof result.current.createOffer).toBe("function");
    expect(typeof result.current.cancelOffer).toBe("function");
  });

  it("allows creating a sell offer", async () => {
    const { result } = renderHook(() => useOffer());

    await act(async () => {
      await result.current.createOffer({
        selling: { type: "native" },
        buying: { type: "credit", code: "USDC", issuer: "GISSUER" },
        amount: "50",
        price: "2.0",
      });
    });

    expect(mockSignTransaction).toHaveBeenCalled();
    expect(mockSubmitXdr).toHaveBeenCalledWith("signed-xdr");
  });

  it("allows cancelling an offer", async () => {
    const { result } = renderHook(() => useOffer());

    await act(async () => {
      await result.current.cancelOffer(
        "101",
        { type: "native" },
        { type: "credit", code: "USDC", issuer: "GISSUER" }
      );
    });

    expect(mockSignTransaction).toHaveBeenCalled();
    expect(mockSubmitXdr).toHaveBeenCalledWith("signed-xdr");
  });
});
