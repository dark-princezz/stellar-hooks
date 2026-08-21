import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWalletConnect } from "../hooks/useWalletConnect";

// ─── Mocks (factories only — no top-level vars referenced) ───────────────────

vi.mock("@walletconnect/sign-client", () => {
  const mockSession = {
    topic: "test-topic-123",
    namespaces: {
      stellar: {
        accounts: ["stellar:testnet:GPUBKEY123"],
        methods: ["stellar_signTransaction"],
        events: [],
      },
    },
  };

  const mockClient = {
    session: { getAll: vi.fn().mockReturnValue([]) },
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue({
      uri: "wc:test-uri",
      approval: vi.fn().mockResolvedValue(mockSession),
    }),
    disconnect: vi.fn().mockResolvedValue(undefined),
    request: vi.fn().mockResolvedValue({ signedXDR: "signed_xdr_result" }),
  };

  return {
    default: { init: vi.fn().mockResolvedValue(mockClient) },
  };
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

// Import mocked module AFTER vi.mock declarations
import SignClient from "@walletconnect/sign-client";

const WC_OPTIONS = {
  projectId: "test-project-id",
  metadata: { name: "Test dApp", description: "Test", url: "https://test.com", icons: [] as string[] },
};

const MOCK_SESSION = {
  topic: "test-topic-123",
  namespaces: {
    stellar: {
      accounts: ["stellar:testnet:GPUBKEY123"],
      methods: ["stellar_signTransaction"],
      events: [],
    },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClient() {
  return vi.mocked(SignClient.init).mock.results[0]?.value as any;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useWalletConnect", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const freshClient = {
      session: { getAll: vi.fn().mockReturnValue([]) },
      on: vi.fn(),
      connect: vi.fn().mockResolvedValue({
        uri: "wc:test-uri",
        approval: vi.fn().mockResolvedValue(MOCK_SESSION),
      }),
      disconnect: vi.fn().mockResolvedValue(undefined),
      request: vi.fn().mockResolvedValue({ signedXDR: "signed_xdr_result" }),
    };
    vi.mocked(SignClient.init).mockResolvedValue(freshClient as any);
  });

  it("initialises with disconnected state", () => {
    const { result } = renderHook(() => useWalletConnect(WC_OPTIONS));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.publicKey).toBeNull();
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.uri).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("calls SignClient.init with correct projectId and metadata", async () => {
    renderHook(() => useWalletConnect(WC_OPTIONS));
    await act(async () => {});

    expect(SignClient.init).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "test-project-id", metadata: WC_OPTIONS.metadata })
    );
  });

  it("restores a persisted session on mount", async () => {
    vi.mocked(SignClient.init).mockResolvedValue({
      session: { getAll: vi.fn().mockReturnValue([MOCK_SESSION]) },
      on: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      request: vi.fn(),
    } as any);

    const { result } = renderHook(() => useWalletConnect(WC_OPTIONS));
    await act(async () => {});

    expect(result.current.isConnected).toBe(true);
    expect(result.current.publicKey).toBe("GPUBKEY123");
  });

  it("connect resolves to publicKey and clears uri", async () => {
    const { result } = renderHook(() => useWalletConnect(WC_OPTIONS));
    await act(async () => {});

    let pk: string | null = null;
    await act(async () => { pk = await result.current.connect(); });

    expect(pk).toBe("GPUBKEY123");
    expect(result.current.isConnected).toBe(true);
    expect(result.current.publicKey).toBe("GPUBKEY123");
    expect(result.current.uri).toBeNull();
  });

  it("connect sets uri while awaiting approval", async () => {
    let resolveApproval!: (v: any) => void;
    vi.mocked(SignClient.init).mockResolvedValue({
      session: { getAll: vi.fn().mockReturnValue([]) },
      on: vi.fn(),
      connect: vi.fn().mockResolvedValue({
        uri: "wc:pending-uri",
        approval: vi.fn().mockReturnValue(new Promise((res) => { resolveApproval = res; })),
      }),
      disconnect: vi.fn(),
      request: vi.fn(),
    } as any);

    const { result } = renderHook(() => useWalletConnect(WC_OPTIONS));
    await act(async () => {});

    act(() => { void result.current.connect(); });
    await act(async () => {});

    expect(result.current.uri).toBe("wc:pending-uri");
    expect(result.current.isConnecting).toBe(true);

    resolveApproval(MOCK_SESSION); // clean up
  });

  it("connect sets error on failure", async () => {
    vi.mocked(SignClient.init).mockResolvedValue({
      session: { getAll: vi.fn().mockReturnValue([]) },
      on: vi.fn(),
      connect: vi.fn().mockRejectedValue(new Error("User rejected")),
      disconnect: vi.fn(),
      request: vi.fn(),
    } as any);

    const { result } = renderHook(() => useWalletConnect(WC_OPTIONS));
    await act(async () => {});

    await act(async () => { await result.current.connect(); });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error?.message).toBe("User rejected");
  });

  it("disconnect calls client.disconnect and clears state", async () => {
    const mockDisconnect = vi.fn().mockResolvedValue(undefined);
    vi.mocked(SignClient.init).mockResolvedValue({
      session: { getAll: vi.fn().mockReturnValue([MOCK_SESSION]) },
      on: vi.fn(),
      connect: vi.fn(),
      disconnect: mockDisconnect,
      request: vi.fn(),
    } as any);

    const { result } = renderHook(() => useWalletConnect(WC_OPTIONS));
    await act(async () => {});

    await act(async () => { await result.current.disconnect(); });

    expect(mockDisconnect).toHaveBeenCalledWith(
      expect.objectContaining({ topic: "test-topic-123" })
    );
    expect(result.current.isConnected).toBe(false);
    expect(result.current.publicKey).toBeNull();
  });

  it("signTransaction sends stellar_signTransaction with xdr and passphrase", async () => {
    const mockRequest = vi.fn().mockResolvedValue({ signedXDR: "signed_xdr_result" });
    vi.mocked(SignClient.init).mockResolvedValue({
      session: { getAll: vi.fn().mockReturnValue([MOCK_SESSION]) },
      on: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      request: mockRequest,
    } as any);

    const { result } = renderHook(() => useWalletConnect(WC_OPTIONS));
    await act(async () => {});

    const signed = await result.current.signTransaction("raw_xdr");

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: "test-topic-123",
        chainId: "stellar:testnet",
        request: expect.objectContaining({
          method: "stellar_signTransaction",
          params: expect.objectContaining({
            xdr: "raw_xdr",
            networkPassphrase: "Test SDF Network ; September 2015",
          }),
        }),
      })
    );
    expect(signed).toBe("signed_xdr_result");
  });

  it("signTransaction throws when no active session", async () => {
    const { result } = renderHook(() => useWalletConnect(WC_OPTIONS));
    // don't await init so clientRef is null

    await expect(result.current.signTransaction("xdr")).rejects.toThrow(
      "WalletConnect session not active"
    );
  });

  it("reacts to remote session_delete event", async () => {
    const onListeners: Record<string, () => void> = {};
    vi.mocked(SignClient.init).mockResolvedValue({
      session: { getAll: vi.fn().mockReturnValue([MOCK_SESSION]) },
      on: vi.fn((evt: string, cb: () => void) => { onListeners[evt] = cb; }),
      connect: vi.fn(),
      disconnect: vi.fn(),
      request: vi.fn(),
    } as any);

    const { result } = renderHook(() => useWalletConnect(WC_OPTIONS));
    await act(async () => {});

    expect(result.current.isConnected).toBe(true);

    await act(async () => { onListeners["session_delete"]?.(); });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.publicKey).toBeNull();
  });

  it("uses stellar:pubnet when chain option is explicitly set", async () => {
    const mockRequest = vi.fn().mockResolvedValue({ signedXDR: "ok" });
    vi.mocked(SignClient.init).mockResolvedValue({
      session: {
        getAll: vi.fn().mockReturnValue([{
          ...MOCK_SESSION,
          namespaces: { stellar: { accounts: ["stellar:pubnet:GPUBKEY_MAIN"], methods: [], events: [] } },
        }]),
      },
      on: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      request: mockRequest,
    } as any);

    const { result } = renderHook(() =>
      useWalletConnect({ ...WC_OPTIONS, chain: "stellar:pubnet" })
    );
    await act(async () => {});

    await result.current.signTransaction("xdr");
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ chainId: "stellar:pubnet" })
    );
    expect(result.current.publicKey).toBe("GPUBKEY_MAIN");
  });
});
