import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockStream = vi.fn().mockReturnValue(vi.fn());
const mockCursor = vi.fn().mockReturnValue({ stream: mockStream });
const mockOrder = vi.fn().mockReturnValue({ cursor: mockCursor });
const mockForAccount = vi.fn().mockReturnValue({ order: mockOrder });
const mockForTransaction = vi.fn().mockReturnValue({ order: mockOrder });
const mockForSigner = vi.fn().mockReturnValue({ order: mockOrder });

const mockOperations = vi.fn().mockReturnValue({
  forAccount: mockForAccount,
  forTransaction: mockForTransaction,
  order: mockOrder,
});

const mockAccounts = vi.fn().mockReturnValue({
  forSigner: mockForSigner,
  order: mockOrder,
});

const mockEffects = vi.fn().mockReturnValue({
  forAccount: mockForAccount,
  order: mockOrder,
});

vi.mock("@stellar/stellar-sdk", () => {
  const Horizon = {
    Server: vi.fn().mockImplementation(() => ({
      operations: mockOperations,
      accounts: mockAccounts,
      effects: mockEffects,
    })),
  };
  return { Horizon };
});

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: {
      horizonUrl: "https://horizon-testnet.stellar.org",
    },
  }),
  useOptionalStellarHookDebugContext: () => null,
}));

import { useHorizonStream } from "../hooks/useHorizonStream";

describe("useHorizonStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets up an operations stream for an account", () => {
    const onMessage = vi.fn();
    const { result } = renderHook(() =>
      useHorizonStream({
        resource: "operations",
        accountId: "G123",
        onMessage,
      })
    );

    expect(mockOperations).toHaveBeenCalled();
    expect(mockForAccount).toHaveBeenCalledWith("G123");
    expect(mockOrder).toHaveBeenCalledWith("asc");
    expect(mockCursor).toHaveBeenCalledWith("now");
    expect(mockStream).toHaveBeenCalled();

    // simulate incoming message
    const streamCallArg = mockStream.mock.calls[0][0];
    streamCallArg.onmessage({ id: "op-1" });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.latestRecord).toEqual({ id: "op-1" });
    expect(onMessage).toHaveBeenCalledWith({ id: "op-1" });
  });

  it("sets up an accounts stream for a signer", () => {
    const { result } = renderHook(() =>
      useHorizonStream({
        resource: "accounts",
        signer: "G456",
      })
    );

    expect(mockAccounts).toHaveBeenCalled();
    expect(mockForSigner).toHaveBeenCalledWith("G456");
    expect(mockStream).toHaveBeenCalled();
  });

  it("cleans up the stream on unmount", () => {
    const closeStreamMock = vi.fn();
    mockStream.mockReturnValueOnce(closeStreamMock);

    const { unmount } = renderHook(() =>
      useHorizonStream({
        resource: "effects",
        accountId: "G789",
      })
    );

    expect(mockEffects).toHaveBeenCalled();
    expect(mockStream).toHaveBeenCalled();

    unmount();
    expect(closeStreamMock).toHaveBeenCalled();
  });

  it("handles stream errors", () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useHorizonStream({
        resource: "operations",
        accountId: "G123",
        onError,
      })
    );

    const streamCallArg = mockStream.mock.calls[0][0];
    streamCallArg.onerror(new Error("Stream disconnected"));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(onError).toHaveBeenCalled();
  });
});
