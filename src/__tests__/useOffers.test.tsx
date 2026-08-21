import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useOffers } from "../hooks/useOffers";

const mockCall = vi.fn();
const mockForAccount = vi.fn(() => ({
  limit: vi.fn().mockReturnThis(),
  cursor: vi.fn().mockReturnThis(),
  call: mockCall,
}));

vi.mock("../utils/memoizedServers", () => ({
  getHorizonServer: vi.fn(() => ({
    offers: vi.fn(() => ({ forAccount: mockForAccount })),
  })),
}));

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
    },
  }),
}));

describe("useOffers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns offers and supports next/prev pagination helpers", async () => {
    const firstPage = {
      records: [{ id: "1" }],
      _links: {
        next: { href: "https://horizon-testnet.stellar.org/accounts/GABC.../offers?cursor=next-cursor&limit=2" },
        prev: { href: "" },
      },
    };

    const secondPage = {
      records: [{ id: "2" }],
      _links: {
        next: { href: "" },
        prev: { href: "https://horizon-testnet.stellar.org/accounts/GABC.../offers?cursor=first-cursor&limit=2" },
      },
    };

    mockCall
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage)
      .mockResolvedValueOnce(firstPage);

    const { result } = renderHook(() => useOffers("GAE3CRAIUXJYXO5PAFZG3URPLYQWGD7EWJNNDTK5SOTJQ7QSSFLW5U5H", { limit: 2 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.offers).toEqual([{ id: "1" }]);

    await act(async () => {
      await result.current.nextPage();
    });

    await waitFor(() => expect(result.current.offers).toEqual([{ id: "2" }]));

    await act(async () => {
      await result.current.prevPage();
    });

    await waitFor(() => expect(result.current.offers).toEqual([{ id: "1" }]));
  });
});
