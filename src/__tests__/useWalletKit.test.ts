import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useWalletKit } from "../hooks/useWalletKit";

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn().mockResolvedValue({ isConnected: false }),
  requestAccess: vi.fn(),
  signTransaction: vi.fn(),
}));

const mockWindow = globalThis.window as any;

beforeEach(() => {
  delete mockWindow.__FREIGHTER__;
  delete mockWindow.lobstrSignTransaction;
  delete mockWindow.lobstrGetPublicKey;
  delete mockWindow.xBullSDK;
});

describe("useWalletKit", () => {
  it("detects Albedo as always available when no browser-extension wallets are installed", () => {
    const { result } = renderHook(() => useWalletKit());

    expect(result.current.availableWallets).toEqual(["albedo"]);
    expect(result.current.activeWallet).toBeNull();
    expect(result.current.publicKey).toBeNull();
  });

  it("detects Freighter when __FREIGHTER__ is present", () => {
    mockWindow.__FREIGHTER__ = true;

    const { result } = renderHook(() => useWalletKit());

    waitFor(() => {
      expect(result.current.availableWallets).toContain("freighter");
    });
  });

  it("detects Lobstr when lobstrSignTransaction is present", () => {
    mockWindow.lobstrSignTransaction = vi.fn();
    mockWindow.lobstrGetPublicKey = vi.fn();

    const { result } = renderHook(() => useWalletKit());

    waitFor(() => {
      expect(result.current.availableWallets).toContain("lobstr");
    });
  });

  it("detects xBull when xBullSDK is present", () => {
    mockWindow.xBullSDK = { connect: vi.fn(), sign: vi.fn() };

    const { result } = renderHook(() => useWalletKit());

    waitFor(() => {
      expect(result.current.availableWallets).toContain("xbull");
    });
  });

  it("connect() falls back to Albedo when no browser-extension wallet is installed", async () => {
    const { result } = renderHook(() => useWalletKit());

    let pubKey: string | null = null;
    await act(async () => {
      pubKey = await result.current.connect();
    });

    expect(pubKey).not.toBeNull();
    expect(result.current.activeWallet).toBe("albedo");
    expect(result.current.error).toBeNull();
  });

  it("setActiveWallet updates the activeWallet field", () => {
    mockWindow.__FREIGHTER__ = true;

    const { result } = renderHook(() => useWalletKit());

    act(() => {
      result.current.setActiveWallet("freighter");
    });

    expect(result.current.activeWallet).toBe("freighter");
  });

  it("disconnect() clears the active wallet and public key", async () => {
    mockWindow.lobstrSignTransaction = vi.fn();
    mockWindow.lobstrGetPublicKey = vi.fn().mockResolvedValue("GPUBKEY");

    const { result } = renderHook(() => useWalletKit());

    await act(async () => {
      await result.current.connect("lobstr");
    });

    expect(result.current.publicKey).toBe("GPUBKEY");

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.publicKey).toBeNull();
    expect(result.current.activeWallet).toBeNull();
  });

  it("signTransaction() throws when no wallet is active", async () => {
    const { result } = renderHook(() => useWalletKit());

    await expect(result.current.signTransaction("xdr")).rejects.toThrow(
      "No active wallet",
    );
  });
});
