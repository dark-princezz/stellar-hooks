import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockRecords = [
  {
    id: "123",
    type: "payment",
    type_i: 1,
    source_account: "G123",
    created_at: "2023-01-01T00:00:00Z",
    transaction_hash: "tx1",
    paging_token: "pt1",
    transaction_successful: true,
    amount: "10",
    asset_code: "USDC",
    asset_issuer: "G456",
    to: "G789",
  },
  {
    id: "124",
    type: "create_account",
    type_i: 0,
    source_account: "G789",
    created_at: "2023-01-02T00:00:00Z",
    transaction_hash: "tx2",
    paging_token: "pt2",
    transaction_successful: true,
    account: "GABC",
    starting_balance: "5",
  },
];

const mockCall = vi.fn().mockResolvedValue({ records: mockRecords });
const mockCursor = vi.fn().mockReturnValue({ call: mockCall });
const mockOrder = vi.fn().mockReturnValue({ cursor: mockCursor, call: mockCall });
const mockIncludeFailed = vi.fn().mockReturnValue({ order: mockOrder });
const mockLimit = vi.fn().mockReturnValue({ includeFailed: mockIncludeFailed });
const mockForAccount = vi.fn().mockReturnValue({ limit: mockLimit });

const mockOperations = vi.fn().mockReturnValue({
  forAccount: mockForAccount,
});

vi.mock("../utils/memoizedServers", () => ({
  getHorizonServer: vi.fn().mockReturnValue({
    operations: mockOperations,
  }),
}));

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
    },
  }),
  useOptionalStellarHookDebugContext: () => null,
}));

import { usePaginatedOperations, decodeOperationRecord } from "../hooks/usePaginatedOperations";

describe("usePaginatedOperations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("decodeOperationRecord", () => {
    it("decodes a payment operation", () => {
      const decoded = decodeOperationRecord(mockRecords[0] as any);
      expect(decoded.description).toBe("Send 10 USDC to G789");
      expect(decoded.details).toEqual({
        amount: "10",
        assetCode: "USDC",
        assetIssuer: "G456",
        destination: "G789",
      });
      expect(decoded.type).toBe("payment");
      expect(decoded.id).toBe("123");
    });

    it("decodes a create_account operation", () => {
      const decoded = decodeOperationRecord(mockRecords[1] as any);
      expect(decoded.description).toBe("Create account GABC with starting balance 5 XLM");
      expect(decoded.details).toEqual({
        destination: "GABC",
        startingBalance: "5",
      });
    });
  });

  describe("hook execution", () => {
    it("fetches and decodes operations", async () => {
      const { result } = renderHook(() =>
        usePaginatedOperations({
          accountId: "G123",
          limit: 2,
        })
      );

      await vi.waitFor(() => {
        expect(result.current.operations.length).toBe(2);
      });

      expect(mockOperations).toHaveBeenCalled();
      expect(mockForAccount).toHaveBeenCalledWith("G123");
      expect(result.current.operations[0].id).toBe("123");
      expect(result.current.operations[0].description).toContain("Send 10 USDC");
      expect(result.current.hasNext).toBe(true);
    });

    it("fetches the next page correctly", async () => {
      const { result } = renderHook(() =>
        usePaginatedOperations({
          accountId: "G123",
          limit: 2,
        })
      );

      await vi.waitFor(() => {
        expect(result.current.operations.length).toBe(2);
      });

      mockCall.mockResolvedValueOnce({
        records: [
          {
            ...mockRecords[0],
            id: "125",
            paging_token: "pt3",
          },
        ],
      });

      act(() => {
        result.current.fetchNextPage();
      });

      await vi.waitFor(() => {
        expect(result.current.operations.length).toBe(3);
      });

      expect(mockCursor).toHaveBeenCalledWith("pt2");
      expect(result.current.hasNext).toBe(false); // only 1 record returned, limit is 2
    });
  });
});
