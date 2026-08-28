/**
 * Error-path branch coverage for useWallet (#642).
 * Tests network failure, rejected signature, and missing wallet scenarios.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useWallet } from "../../hooks/useWallet";

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn().mockResolvedValue({ isConnected: false }),
  requestAccess: vi.fn(),
  signTransaction: vi.fn(),
}));

const mockWindow = globalThis.window as Record<string, unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  delete mockWindow.xBullSDK;
  delete mockWindow.rabet;
  localStorage.clear();
});

describe("useWallet error paths (#642)", () => {
  it("sets error when connect() called with no available wallet", async () => {
    const { result } = renderHook(() => useWallet());
    await act(async () => { await result.current.connect(); });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toMatch(/no wallet/i);
  });

  it("sets error when wallet connect() throws (network failure)", async () => {
    mockWindow.xBullSDK = {
      connect: vi.fn().mockRejectedValue(new Error("USB disconnected")),
    };
    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.availableWallets).toContain("xbull"));
    await act(async () => { await result.current.connect("xbull"); });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe("USB disconnected");
  });

  it("rejects signTransaction when no active wallet", async () => {
    const { result } = renderHook(() => useWallet());
    await expect(result.current.signTransaction("xdr")).rejects.toThrow("No active wallet");
  });

  it("rejects signAuthEntry when wallet does not support it", async () => {
    mockWindow.rabet = {
      connect: vi.fn().mockResolvedValue({ publicKey: "GDUMMY" }),
      sign: vi.fn().mockResolvedValue("signedXdr"),
    };
    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.availableWallets).toContain("rabet"));
    await act(async () => { await result.current.connect("rabet"); });
    await expect(result.current.signAuthEntry("entry")).rejects.toThrow(
      /does not support auth entry signing/,
    );
  });
});
