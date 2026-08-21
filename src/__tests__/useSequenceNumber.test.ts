import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockLoadAccount = vi.fn().mockResolvedValue({
  sequenceNumber: () => "12345678",
});

vi.mock("../utils/memoizedServers", () => ({
  getHorizonServer: () => ({
    loadAccount: mockLoadAccount,
  }),
}));

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
}));

import { useSequenceNumber } from "../hooks/useSequenceNumber";

describe("useSequenceNumber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadAccount.mockResolvedValue({
      sequenceNumber: () => "12345678",
    });
  });

  it("returns null sequence when publicKey is null", () => {
    const { result } = renderHook(() => useSequenceNumber(null));

    expect(result.current.sequence).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.refresh).toBe("function");
  });

  it("fetches sequence number for a valid public key", async () => {
    const { result } = renderHook(() =>
      useSequenceNumber("GPUBLICKEY")
    );

    await vi.waitFor(() => {
      expect(result.current.sequence).toBe("12345678");
    });

    expect(mockLoadAccount).toHaveBeenCalledWith("GPUBLICKEY");
    expect(result.current.error).toBeNull();
  });

  it("returns error when fetch fails", async () => {
    mockLoadAccount.mockRejectedValueOnce(new Error("Account not found"));

    const { result } = renderHook(() =>
      useSequenceNumber("GMISSING")
    );

    await vi.waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });

    expect(result.current.error!.message).toBe("Account not found");
    expect(result.current.sequence).toBeNull();
  });

  it("increments sequence when autoIncrement is enabled and refresh is called", async () => {
    const { result } = renderHook(() =>
      useSequenceNumber("GPUBLICKEY", { autoIncrement: true })
    );

    await vi.waitFor(() => {
      expect(result.current.sequence).toBe("12345678");
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.sequence).toBe("12345679");

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.sequence).toBe("12345680");
  });

  it("does not fetch when enabled is false", () => {
    const { result } = renderHook(() =>
      useSequenceNumber("GPUBLICKEY", { enabled: false })
    );

    expect(result.current.sequence).toBeNull();
    expect(mockLoadAccount).not.toHaveBeenCalled();
  });
});
