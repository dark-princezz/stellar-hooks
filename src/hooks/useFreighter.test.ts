import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useFreighter } from "./useFreighter";
import {
  resetFreighterMocks,
  requestAccess,
  getNetworkDetails,
  signTransaction,
  signMessage,
  isConnected,
  isAllowed,
  getAddress,
  mockFreighterConnected,
  mockFreighterInstalled,
} from "@stellar/freighter-api";
import { UserRejectedError } from "../utils/errors";

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  resetFreighterMocks();
});

describe("useFreighter — Freighter not installed", () => {
  it("reports isInstalled false and isConnected false", async () => {
    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isInstalled).toBe(false);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.publicKey).toBeNull();
    expect(result.current.network).toBeNull();
    expect(result.current.networkPassphrase).toBeNull();
  });

  it("connect() sets an error state when Freighter is absent", async () => {
    vi.mocked(requestAccess).mockRejectedValue(
      new Error("Install Freighter to connect — https://freighter.app"),
    );

    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain("freighter.app");
  });

  it("connect() surfaces an API error response without throwing", async () => {
    vi.mocked(requestAccess).mockResolvedValue({
      address: "",
      error: { message: "Extension not found", code: -1 },
    } as any);

    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain("Extension not found");
  });

  it("signTransaction() throws when the wallet returns an error", async () => {
    vi.mocked(signTransaction).mockResolvedValue({
      signedTxXdr: "",
      signerAddress: "",
      error: { message: "Wallet not available" },
    } as any);

    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      result.current.signTransaction("xdr" as any),
    ).rejects.toThrow("Wallet not available");
  });

  it("signAuthEntry() throws 'Wallet not connected' when publicKey is null", async () => {
    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.publicKey).toBeNull();
    await expect(
      result.current.signAuthEntry("entry-xdr" as any),
    ).rejects.toThrow("Wallet not connected");
  });

  it("signBlob() throws 'Wallet not connected' when publicKey is null", async () => {
    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.publicKey).toBeNull();
    await expect(result.current.signBlob("blob")).rejects.toThrow(
      "Wallet not connected",
    );
  });
});

describe("useFreighter — signMessage (#254)", () => {
  it("signMessage() throws 'Wallet not connected' when publicKey is null", async () => {
    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.publicKey).toBeNull();
    await expect(result.current.signMessage("hello")).rejects.toThrow(
      "Wallet not connected",
    );
  });

  it("signMessage() returns the signed message and toggles isSigningMessage", async () => {
    mockFreighterConnected();
    vi.mocked(signMessage).mockResolvedValue({
      signedMessage: "deadbeef",
      signerAddress: "",
      error: null as any,
    });

    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    expect(result.current.isSigningMessage).toBe(false);

    let signed: string | undefined;
    await act(async () => {
      signed = await result.current.signMessage("sign-in challenge");
    });

    expect(signed).toBe("deadbeef");
    expect(result.current.isSigningMessage).toBe(false);
  });

  it("signMessage() resets isSigningMessage on user rejection", async () => {
    mockFreighterConnected();
    vi.mocked(signMessage).mockResolvedValue({
      signedMessage: "",
      error: { message: "User rejected" },
    });

    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    await expect(
      act(() => result.current.signMessage("challenge")),
    ).rejects.toThrow(UserRejectedError);

    expect(result.current.isSigningMessage).toBe(false);
  });

  it("signMessage() passes accountToSign to the Freighter API", async () => {
    mockFreighterConnected();
    vi.mocked(signMessage).mockResolvedValue({
      signedMessage: "sig",
      signerAddress: "",
      error: null as any,
    });

    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    await act(async () => {
      await result.current.signMessage("msg", { accountToSign: "GCUSTOM" });
    });

    expect(vi.mocked(signMessage)).toHaveBeenCalledWith("msg", { address: "GCUSTOM" });
  });
});

describe("useFreighter — autoConnect (#257)", () => {
  it("does not auto-connect by default", async () => {
    mockFreighterInstalled();

    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isAutoConnecting).toBe(false);
    expect(vi.mocked(isAllowed)).not.toHaveBeenCalled();
  });

  it("silently reconnects when autoConnect is true and isAllowed returns true", async () => {
    mockFreighterInstalled();
    vi.mocked(isAllowed).mockResolvedValue({ isAllowed: true });
    vi.mocked(requestAccess).mockResolvedValue({
      address: "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ",
      error: null as any,
    });
    vi.mocked(getNetworkDetails).mockResolvedValue({
      network: "TESTNET",
      networkPassphrase: "Test SDF Network ; September 2015",
    });

    const { result } = renderHook(() => useFreighter({ autoConnect: true }));
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    expect(result.current.publicKey).toBe(
      "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ",
    );
    expect(result.current.isAutoConnecting).toBe(false);
  });

  it("stays disconnected when autoConnect is true but isAllowed returns false", async () => {
    mockFreighterInstalled();
    vi.mocked(isAllowed).mockResolvedValue({ isAllowed: false });

    const { result } = renderHook(() => useFreighter({ autoConnect: true }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isAutoConnecting).toBe(false);
  });

  it("skips autoConnect when already connected", async () => {
    mockFreighterConnected();

    const { result } = renderHook(() => useFreighter({ autoConnect: true }));
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    expect(vi.mocked(isAllowed)).not.toHaveBeenCalled();
  });
});

describe("useFreighter — UserRejectedError (#460)", () => {
  it("signTransaction() throws UserRejectedError when user rejects", async () => {
    mockFreighterConnected();
    vi.mocked(signTransaction).mockResolvedValue({
      signedTxXdr: "",
      error: { message: "User rejected" },
    });

    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    try {
      await result.current.signTransaction("xdr" as any);
      expect.fail("Expected signTransaction to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(UserRejectedError);
      expect((err as UserRejectedError).code).toBe("USER_REJECTED");
      expect((err as UserRejectedError).walletId).toBe("freighter");
      expect((err as UserRejectedError).operation).toBe("signTransaction");
      expect((err as UserRejectedError).message).toBe("User rejected");
    }
  });

  it("signTransaction() throws generic Error for non-rejection failures", async () => {
    mockFreighterConnected();
    vi.mocked(signTransaction).mockResolvedValue({
      signedTxXdr: "",
      error: { message: "Network error" },
    });

    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    try {
      await result.current.signTransaction("xdr" as any);
      expect.fail("Expected signTransaction to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err).not.toBeInstanceOf(UserRejectedError);
      expect((err as Error).message).toBe("Network error");
    }
  });

  it("signMessage() throws UserRejectedError when user denies", async () => {
    mockFreighterConnected();
    vi.mocked(signMessage).mockResolvedValue({
      signedMessage: "",
      error: { message: "User denied" },
    });

    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    try {
      await result.current.signMessage("hello");
      expect.fail("Expected signMessage to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(UserRejectedError);
      expect((err as UserRejectedError).code).toBe("USER_REJECTED");
      expect((err as UserRejectedError).walletId).toBe("freighter");
      expect((err as UserRejectedError).operation).toBe("signMessage");
    }
  });

  it("signBlob() throws UserRejectedError when user rejects", async () => {
    mockFreighterConnected();
    vi.mocked(signMessage).mockResolvedValue({
      signedMessage: "",
      error: { message: "User rejected" },
    });

    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    try {
      await result.current.signBlob("data");
      expect.fail("Expected signBlob to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(UserRejectedError);
      expect((err as UserRejectedError).code).toBe("USER_REJECTED");
      expect((err as UserRejectedError).walletId).toBe("freighter");
      expect((err as UserRejectedError).operation).toBe("signBlob");
    }
  });

  it("signAuthEntry() throws UserRejectedError when user declines", async () => {
    mockFreighterConnected();
    const { signAuthEntry } = await import("@stellar/freighter-api");
    vi.mocked(signAuthEntry).mockResolvedValue({
      signedAuthEntry: "",
      error: { message: "User declined" },
    });

    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    try {
      await result.current.signAuthEntry("entry-xdr" as any);
      expect.fail("Expected signAuthEntry to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(UserRejectedError);
      expect((err as UserRejectedError).code).toBe("USER_REJECTED");
      expect((err as UserRejectedError).walletId).toBe("freighter");
      expect((err as UserRejectedError).operation).toBe("signAuthEntry");
    }
  });

  it("detects 'User cancelled' as user rejection", async () => {
    mockFreighterConnected();
    vi.mocked(signTransaction).mockResolvedValue({
      signedTxXdr: "",
      error: { message: "User cancelled" },
    });

    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    await expect(
      result.current.signTransaction("xdr" as any),
    ).rejects.toBeInstanceOf(UserRejectedError);
  });

  it("detects 'Access denied' as user rejection", async () => {
    mockFreighterConnected();
    vi.mocked(signTransaction).mockResolvedValue({
      signedTxXdr: "",
      error: { message: "Access denied" },
    });

    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    await expect(
      result.current.signTransaction("xdr" as any),
    ).rejects.toBeInstanceOf(UserRejectedError);
  });

  it("detects 'Permission denied' as user rejection", async () => {
    mockFreighterConnected();
    vi.mocked(signTransaction).mockResolvedValue({
      signedTxXdr: "",
      error: { message: "Permission denied" },
    });

    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    await expect(
      result.current.signTransaction("xdr" as any),
    ).rejects.toBeInstanceOf(UserRejectedError);
  });

  it("UserRejectedError extends StellarHookError", () => {
    const err = new UserRejectedError("User rejected", {
      walletId: "freighter",
      operation: "signTransaction",
    });

    expect(err).toBeInstanceOf(Error);
    // UserRejectedError extends StellarHookError
    expect(err.code).toBe("USER_REJECTED");
    expect(err.name).toBe("UserRejectedError");
    expect(err.walletId).toBe("freighter");
    expect(err.operation).toBe("signTransaction");
  });
});
