/**
 * @file lobstr-walletconnect.test.ts
 * @description Test suite for the Lobstr WalletConnect adapter.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { WalletAdapter } from "../wallets/types";
import { createLobstrWalletConnectAdapter } from "../wallets/lobstr-walletconnect";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock @walletconnect/sign-client
vi.mock("@walletconnect/sign-client", () => ({
  default: {
    init: vi.fn(),
  },
}));

// Mock the sign-client module for individual imports
const mockSignClient = {
  init: vi.fn(),
  session: {
    getAll: vi.fn(),
  },
  connect: vi.fn(),
  disconnect: vi.fn(),
  request: vi.fn(),
};

vi.mock("@walletconnect/sign-client", () => ({
  default: {
    init: mockSignClient.init,
  },
}));

vi.mock("@walletconnect/sign-client", () => mockSignClient);

beforeEach(() => {
  vi.clearAllMocks();
  // @ts-expect-error - reset module state for testing
  delete globalThis.walletConnectClient;
  delete globalThis.walletConnectSession;
});

afterEach(() => {
  vi.resetModules();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Lobstr WalletConnect adapter", () => {
  let adapter: WalletAdapter;

  beforeEach(() => {
    adapter = createLobstrWalletConnectAdapter({
      projectId: "test-project-id",
    });
  });

  describe("id and name", () => {
    it("exposes correct wallet ID", () => {
      expect(adapter.id).toBe("lobstr-wc");
    });

    it("exposes human-readable name", () => {
      expect(adapter.name).toBe("Lobstr (WalletConnect)");
    });
  });

  describe("meta", () => {
    it("exposes wallet metadata", () => {
      expect(adapter.meta).toMatchObject({
        name: "Lobstr",
        description: "Connect with Lobstr via WalletConnect for mobile support.",
        iconUrl: expect.stringMatching(/^https?:/),
        installUrl: expect.stringMatching(/^https?:/),
        supportsSignMessage: false,
        supportsSignAuthEntry: false,
      });
    });
  });

  describe("isInstalled", () => {
    it("returns true in browser environment", () => {
      expect(adapter.isInstalled()).toBe(true);
    });
  });

  describe("connect", () => {
    it("throws error when SignClient fails to initialize", async () => {
      mockSignClient.init.mockRejectedValue(new Error("Network error"));
      await expect(adapter.connect()).rejects.toThrow("Network error");
    });

    it("restores existing session if available", async () => {
      const existingSession = {
        topic: "test-topic",
        namespaces: {
          stellar: {
            accounts: ["stellar:pubnet:GDUMMYPUBLICKEY1234567890ABCDEFGH"],
            methods: ["stellar_signTransaction"],
            events: [],
          },
        },
      };

      mockSignClient.session.getAll.mockReturnValue([existingSession]);
      mockSignClient.init.mockResolvedValue({
        session: {
          getAll: () => [existingSession],
        },
      });

      const publicKey = await adapter.connect();
      expect(publicKey).toBe("GDUMMYPUBLICKEY1234567890ABCDEFGH");
    });

    it("creates new session when no existing session available", async () => {
      const mockApproval = vi.fn().mockResolvedValue({
        topic: "test-topic",
        namespaces: {
          stellar: {
            accounts: ["stellar:testnet:GTESTPUBLICKEY1234567890ABCDEFG"],
            methods: ["stellar_signTransaction"],
            events: [],
          },
        },
      });

      mockSignClient.init.mockResolvedValue({
        session: {
          getAll: () => [],
        },
        connect: vi.fn().mockResolvedValue({
          uri: "wc://test",
          approval: mockApproval,
        }),
        request: mockSignClient.request,
        disconnect: mockSignClient.disconnect,
      });

      const publicKey = await adapter.connect();
      expect(publicKey).toBe("GTESTPUBLICKEY1234567890ABCDEFG");
      expect(mockApproval).toHaveBeenCalled();
    });

    it("throws error when no Stellar address in session", async () => {
      mockSignClient.init.mockResolvedValue({
        session: {
          getAll: () => [],
        },
        connect: vi.fn().mockResolvedValue({
          uri: "wc://test",
          approval: vi.fn().mockResolvedValue({
            topic: "test-topic",
            namespaces: {
              solana: {
                accounts: [],
                methods: [],
                events: [],
              },
            },
          }),
        }),
        request: mockSignClient.request,
        disconnect: mockSignClient.disconnect,
      });

      await expect(adapter.connect()).rejects.toThrow("No Stellar address returned");
    });
  });

  describe("disconnect", () => {
    it("disconnects active session", async () => {
      const session = {
        topic: "test-topic",
        namespaces: {
          stellar: {
            accounts: ["stellar:pubnet:GDUMMYPUBLICKEY1234567890ABCDEFGH"],
            methods: ["stellar_signTransaction"],
            events: [],
          },
        },
      };

      mockSignClient.init.mockResolvedValue({
        session: {
          getAll: () => [session],
        },
        connect: vi.fn().mockResolvedValue({
          uri: "wc://test",
          approval: vi.fn().mockResolvedValue(session),
        }),
        disconnect: mockSignClient.disconnect,
      });

      await adapter.connect();
      await adapter.disconnect();

      expect(mockSignClient.disconnect).toHaveBeenCalledWith({
        topic: "test-topic",
        reason: { code: 6000, message: "User disconnected" },
      });
    });

    it("is no-op when no session active", () => {
      expect(() => adapter.disconnect()).not.toThrow();
    });
  });

  describe("signTransaction", () => {
    const mockXdr = "AAAAABBBBBCCCCC";

    it("throws when no active session", async () => {
      await expect(adapter.signTransaction(mockXdr)).rejects.toThrow(
        "WalletConnect session not active",
      );
    });

    it("signs transaction and returns signed XDR", async () => {
      const session = {
        topic: "test-topic",
        namespaces: {
          stellar: {
            accounts: ["stellar:pubnet:GDUMMYPUBLICKEY1234567890ABCDEFGH"],
            methods: ["stellar_signTransaction"],
            events: [],
          },
        },
      };

      mockSignClient.init.mockResolvedValue({
        session: {
          getAll: () => [session],
        },
        connect: vi.fn().mockResolvedValue({
          uri: "wc://test",
          approval: vi.fn().mockResolvedValue(session),
        }),
        request: vi.fn().mockResolvedValue({ signedXDR: "AAAABBBCCCDDD" }),
        disconnect: mockSignClient.disconnect,
      });

      await adapter.connect();
      const signedXdr = await adapter.signTransaction(mockXdr);

      expect(signedXdr).toBe("AAAABBBCCCDDD");
      expect(mockSignClient.request).toHaveBeenCalledWith({
        topic: "test-topic",
        chainId: "stellar:testnet",
        request: {
          method: "stellar_signTransaction",
          params: {
            xdr: mockXdr,
            networkPassphrase: "Test SDF Network ; September 2015",
          },
        },
      });
    });

    it("uses custom networkPassphrase when provided", async () => {
      const session = {
        topic: "test-topic",
        namespaces: {
          stellar: {
            accounts: ["stellar:pubnet:GDUMMYPUBLICKEY1234567890ABCDEFGH"],
            methods: ["stellar_signTransaction"],
            events: [],
          },
        },
      };

      const customPassphrase = "Public Global Stellar Network ; September 2015";
      mockSignClient.init.mockResolvedValue({
        session: {
          getAll: () => [session],
        },
        connect: vi.fn().mockResolvedValue({
          uri: "wc://test",
          approval: vi.fn().mockResolvedValue(session),
        }),
        request: vi.fn().mockResolvedValue({ signedXDR: "signed" }),
        disconnect: mockSignClient.disconnect,
      });

      await adapter.connect();
      await adapter.signTransaction(mockXdr, { networkPassphrase: customPassphrase });

      expect(mockSignClient.request).toHaveBeenCalledWith({
        topic: "test-topic",
        chainId: "stellar:testnet",
        request: {
          method: "stellar_signTransaction",
          params: {
            xdr: mockXdr,
            networkPassphrase: customPassphrase,
          },
        },
      });
    });

    it("throws UserRejectedError when user rejects transaction", async () => {
      const session = {
        topic: "test-topic",
        namespaces: {
          stellar: {
            accounts: ["stellar:pubnet:GDUMMYPUBLICKEY1234567890ABCDEFGH"],
            methods: ["stellar_signTransaction"],
            events: [],
          },
        },
      };

      mockSignClient.init.mockResolvedValue({
        session: {
          getAll: () => [session],
        },
        connect: vi.fn().mockResolvedValue({
          uri: "wc://test",
          approval: vi.fn().mockResolvedValue(session),
        }),
        request: vi.fn().mockRejectedValue(new Error("User rejected transaction")),
        disconnect: mockSignClient.disconnect,
      });

      await adapter.connect();
      await expect(adapter.signTransaction(mockXdr)).rejects.toThrow("User rejected transaction");
    });
  });
});
