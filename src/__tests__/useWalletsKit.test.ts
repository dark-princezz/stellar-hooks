import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWalletsKit } from "../hooks/useWalletsKit";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const unsubMock = vi.fn();
const listeners: Record<string, ((e: any) => void)[]> = {};

vi.mock("@creit-tech/stellar-wallets-kit/sdk", () => {
  const KitEventType = {
    STATE_UPDATED: "STATE_UPDATE",
    WALLET_SELECTED: "WALLET_SELECTED",
    DISCONNECT: "DISCONNECT",
  };

  const StellarWalletsKit = {
    init: vi.fn(),
    on: vi.fn(),
    getAddress: vi.fn().mockResolvedValue({ address: null }),
    authModal: vi.fn().mockResolvedValue({ address: "GTEST123" }),
    signTransaction: vi.fn().mockResolvedValue({ signedTxXdr: "signed_xdr" }),
    signAuthEntry: vi.fn().mockResolvedValue({ signedAuthEntry: "signed_auth_entry" }),
    signMessage: vi.fn().mockResolvedValue({ signedMessage: "signed_message" }),
  };

  return { StellarWalletsKit, KitEventType };
});

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: {
      network: "testnet",
      horizonUrl: "https://horizon-testnet.stellar.org",
      sorobanRpcUrl: "https://soroban-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
}));

// Import after mocks so we get the mocked versions
import { StellarWalletsKit, KitEventType } from "@creit-tech/stellar-wallets-kit/sdk";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupOnMock() {
  vi.mocked(StellarWalletsKit.on).mockImplementation(
    (eventType: string, cb: (e: any) => void) => {
      listeners[eventType] = listeners[eventType] ?? [];
      listeners[eventType].push(cb);
      return unsubMock;
    }
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useWalletsKit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(listeners).forEach((k) => delete listeners[k]);
    vi.mocked(StellarWalletsKit.getAddress).mockResolvedValue({ address: null });
    setupOnMock();
  });

  it("initialises with disconnected state", async () => {
    const { result } = renderHook(() => useWalletsKit());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.publicKey).toBeNull();
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("calls StellarWalletsKit.init when options.modules provided", () => {
    const modules = [{}];
    renderHook(() => useWalletsKit({ modules }));

    expect(StellarWalletsKit.init).toHaveBeenCalledWith(
      expect.objectContaining({ modules })
    );
  });

  it("restores a persisted session on mount", async () => {
    vi.mocked(StellarWalletsKit.getAddress).mockResolvedValue({ address: "GPERSISTED" });

    const { result } = renderHook(() => useWalletsKit());
    await act(async () => {});

    expect(result.current.publicKey).toBe("GPERSISTED");
    expect(result.current.isConnected).toBe(true);
  });

  it("connect opens auth modal and updates state", async () => {
    const { result } = renderHook(() => useWalletsKit());

    let address: string | null = null;
    await act(async () => {
      address = await result.current.connect();
    });

    expect(address).toBe("GTEST123");
    expect(result.current.isConnected).toBe(true);
    expect(result.current.publicKey).toBe("GTEST123");
    expect(result.current.isConnecting).toBe(false);
  });

  it("connect sets error state on failure", async () => {
    vi.mocked(StellarWalletsKit.authModal).mockRejectedValueOnce(new Error("User cancelled"));

    const { result } = renderHook(() => useWalletsKit());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error?.message).toBe("User cancelled");
  });

  it("disconnect clears the public key", async () => {
    vi.mocked(StellarWalletsKit.getAddress).mockResolvedValue({ address: "GTEST123" });
    const { result } = renderHook(() => useWalletsKit());

    await act(async () => {});
    act(() => { result.current.disconnect(); });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.publicKey).toBeNull();
  });

  it("reacts to STATE_UPDATED kit event", async () => {
    const { result } = renderHook(() => useWalletsKit());

    await act(async () => {
      listeners[KitEventType.STATE_UPDATED]?.forEach((cb) =>
        cb({ eventType: KitEventType.STATE_UPDATED, payload: { address: "GEVENT123", networkPassphrase: "" } })
      );
    });

    expect(result.current.publicKey).toBe("GEVENT123");
    expect(result.current.isConnected).toBe(true);
  });

  it("reacts to DISCONNECT kit event", async () => {
    vi.mocked(StellarWalletsKit.getAddress).mockResolvedValue({ address: "GTEST123" });
    const { result } = renderHook(() => useWalletsKit());

    await act(async () => {});

    await act(async () => {
      listeners[KitEventType.DISCONNECT]?.forEach((cb) =>
        cb({ eventType: KitEventType.DISCONNECT, payload: {} })
      );
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.publicKey).toBeNull();
  });

  it("signTransaction calls kit with networkPassphrase from context", async () => {
    const { result } = renderHook(() => useWalletsKit());

    const signed = await result.current.signTransaction("some_xdr");

    expect(StellarWalletsKit.signTransaction).toHaveBeenCalledWith(
      "some_xdr",
      expect.objectContaining({ networkPassphrase: "Test SDF Network ; September 2015" })
    );
    expect(signed).toBe("signed_xdr");
  });

  it("signAuthEntry returns the signed auth entry", async () => {
    const { result } = renderHook(() => useWalletsKit());

    const signed = await result.current.signAuthEntry("auth_entry_xdr");
    expect(signed).toBe("signed_auth_entry");
  });

  it("signMessage returns the signed message", async () => {
    const { result } = renderHook(() => useWalletsKit());

    const signed = await result.current.signMessage("hello");
    expect(signed).toBe("signed_message");
  });

  it("unsubscribes from kit events on unmount", async () => {
    const { unmount } = renderHook(() => useWalletsKit());
    await act(async () => {});
    unmount();
    expect(unsubMock).toHaveBeenCalledTimes(2); // STATE_UPDATED + DISCONNECT
  });
});
