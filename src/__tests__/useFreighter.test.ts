import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react-hooks";
import { waitFor } from "@testing-library/react";

const mockIsConnected = vi.hoisted(() => vi.fn());
const mockGetPublicKey = vi.hoisted(() => vi.fn());
const mockGetNetwork = vi.hoisted(() => vi.fn());
const mockRequestAccess = vi.hoisted(() => vi.fn());
const mockSignTransaction = vi.hoisted(() => vi.fn());
const mockSignAuthEntry = vi.hoisted(() => vi.fn());
const mockSignBlob = vi.hoisted(() => vi.fn());

vi.mock("@stellar/freighter-api", () => ({
  isConnected: mockIsConnected,
  getPublicKey: mockGetPublicKey,
  getNetwork: mockGetNetwork,
  requestAccess: mockRequestAccess,
  signTransaction: mockSignTransaction,
  signAuthEntry: mockSignAuthEntry,
  signBlob: mockSignBlob,
}));

import { useFreighter } from "../hooks/useFreighter";

describe("useFreighter", () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("connects automatically when Freighter is already authorised", async () => {
    mockIsConnected.mockResolvedValue(true);
    mockGetPublicKey.mockResolvedValue("GABC123");
    mockGetNetwork.mockResolvedValue("Test SDF Network ; September 2015");

    const { result } = renderHook(() => useFreighter());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(result.current.publicKey).toBe("GABC123");
    expect(result.current.network).toBe("Test SDF Network ; September 2015");
    expect(result.current.networkPassphrase).toBe("Test SDF Network ; September 2015");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("marks Freighter as not installed when it is unavailable", async () => {
    mockIsConnected.mockResolvedValue(false);

    const { result } = renderHook(() => useFreighter());

    await waitFor(() => {
      expect(result.current.isInstalled).toBe(false);
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.publicKey).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("connect() requests access and updates state", async () => {
    mockIsConnected.mockResolvedValue(false);
    mockRequestAccess.mockResolvedValue(undefined);
    mockGetPublicKey.mockResolvedValue("GNEW123");
    mockGetNetwork.mockResolvedValue("Test SDF Network ; September 2015");

    const { result } = renderHook(() => useFreighter());

    await waitFor(() => {
      expect(result.current.isInstalled).toBe(false);
    });

    await act(async () => {
      await result.current.connect();
    });

    expect(mockRequestAccess).toHaveBeenCalled();
    expect(result.current.isConnected).toBe(true);
    expect(result.current.publicKey).toBe("GNEW123");
    expect(result.current.networkPassphrase).toBe("Test SDF Network ; September 2015");
  });

  it("disconnect() resets the connection state", async () => {
    mockIsConnected.mockResolvedValue(true);
    mockGetPublicKey.mockResolvedValue("GABC123");
    mockGetNetwork.mockResolvedValue("Test SDF Network ; September 2015");

    const { result } = renderHook(() => useFreighter());
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.publicKey).toBeNull();
    expect(result.current.network).toBeNull();
  });

  it("signTransaction returns signed XDR and throws on error", async () => {
    mockSignTransaction.mockResolvedValue("signed-xdr");
    const { result } = renderHook(() => useFreighter());

    await act(async () => {
      const signed = await result.current.signTransaction("xdr", { networkPassphrase: "Test Passphrase" });
      expect(signed).toBe("signed-xdr");
    });

    mockSignTransaction.mockRejectedValueOnce(new Error("failure"));
    await expect(result.current.signTransaction("xdr")).rejects.toThrow("failure");
  });

  it("signAuthEntry and signBlob forward to Freighter", async () => {
    mockSignAuthEntry.mockResolvedValue("signed-auth");
    mockSignBlob.mockResolvedValue("signed-blob");
    const { result } = renderHook(() => useFreighter());

    await act(async () => {
      const auth = await result.current.signAuthEntry("entry-xdr");
      const blob = await result.current.signBlob("blob", { accountToSign: "GABC" });
      expect(auth).toBe("signed-auth");
      expect(blob).toBe("signed-blob");
    });
  });
});
