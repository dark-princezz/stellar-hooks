/**
 * @file rabet.test.ts
 * @description Test suite for the Rabet wallet adapter.
 * Follows the same patterns as useFreighter.test.ts.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { WalletAdapter } from "../wallets/types";
import { createRabetAdapter } from "../wallets/rabet";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockWindow = globalThis.window as unknown as {
  rabet?: {
    connect(): Promise<{ publicKey: string }>;
    sign(xdr: string, opts?: { networkPassphrase?: string }): Promise<string>;
    signMessage(message: string): Promise<{ signature: string }>;
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  delete mockWindow.rabet;
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Rabet adapter", () => {
  let adapter: WalletAdapter;

  beforeEach(() => {
    adapter = createRabetAdapter();
  });

  describe("id and name", () => {
    it("exposes correct wallet ID", () => {
      expect(adapter.id).toBe("rabet");
    });

    it("exposes human-readable name", () => {
      expect(adapter.name).toBe("Rabet");
    });
  });

  describe("meta", () => {
    it("exposes wallet metadata", () => {
      expect(adapter.meta).toMatchObject({
        name: "Rabet",
        description: expect.any(String),
        iconUrl: expect.stringMatching(/^https?:/),
        installUrl: expect.stringMatching(/^https?:/),
        supportsSignMessage: true,
        supportsSignAuthEntry: false,
      });
    });
  });

  describe("isInstalled", () => {
    it("returns false when Rabet is not installed", () => {
      expect(adapter.isInstalled()).toBe(false);
    });

    it("returns true when Rabet extension is present", () => {
      mockWindow.rabet = {
        connect: vi.fn().mockResolvedValue({ publicKey: "GDUMMY" }),
        sign: vi.fn().mockResolvedValue("signedXdr"),
        signMessage: vi.fn().mockResolvedValue({ signature: "sig" }),
      };
      expect(adapter.isInstalled()).toBe(true);
    });
  });

  describe("connect", () => {
    it("throws when Rabet is not installed", async () => {
      await expect(adapter.connect()).rejects.toThrow("Rabet extension is not installed");
    });

    it("connects and returns public key when Rabet is installed", async () => {
      const expectedKey = "GDUMMYPUBLICKEY1234567890ABCDEFGH";
      mockWindow.rabet = {
        connect: vi.fn().mockResolvedValue({ publicKey: expectedKey }),
        sign: vi.fn().mockResolvedValue("signedXdr"),
        signMessage: vi.fn().mockResolvedValue({ signature: "sig" }),
      };
      const publicKey = await adapter.connect();
      expect(publicKey).toBe(expectedKey);
      expect(mockWindow.rabet?.connect).toHaveBeenCalledTimes(1);
    });

    it("throws error when connect() returns no public key", async () => {
      mockWindow.rabet = {
        connect: vi.fn().mockResolvedValue({}),
        sign: vi.fn().mockResolvedValue("signedXdr"),
        signMessage: vi.fn().mockResolvedValue({ signature: "sig" }),
      };
      await expect(adapter.connect()).rejects.toThrow("No public key returned");
    });
  });

  describe("disconnect", () => {
    it("is a no-op (Rabet does not expose programmatic disconnect)", () => {
      expect(() => adapter.disconnect()).not.toThrow();
    });
  });

  describe("signTransaction", () => {
    const mockXdr = "AAAAABBBBBCCCCC";

    it("throws when Rabet is not installed", async () => {
      await expect(adapter.signTransaction(mockXdr)).rejects.toThrow(
        "Rabet extension is not installed",
      );
    });

    it("signs transaction XDR and returns signed XDR", async () => {
      const expectedSigned = "AAAABBBCCCDDD";
      mockWindow.rabet = {
        connect: vi.fn().mockResolvedValue({ publicKey: "GDUMMY" }),
        sign: vi.fn().mockResolvedValue(expectedSigned),
        signMessage: vi.fn().mockResolvedValue({ signature: "sig" }),
      };
      const signedXdr = await adapter.signTransaction(mockXdr);
      expect(signedXdr).toBe(expectedSigned);
      expect(mockWindow.rabet?.sign).toHaveBeenCalledWith(mockXdr, undefined);
    });

    it("passes networkPassphrase option to Rabet", async () => {
      const passphrase = "Test SDF Network ; September 2015";
      mockWindow.rabet = {
        connect: vi.fn().mockResolvedValue({ publicKey: "GDUMMY" }),
        sign: vi.fn().mockResolvedValue("signedXdr"),
        signMessage: vi.fn().mockResolvedValue({ signature: "sig" }),
      };
      await adapter.signTransaction(mockXdr, { networkPassphrase: passphrase });
      expect(mockWindow.rabet?.sign).toHaveBeenCalledWith(mockXdr, { networkPassphrase: passphrase });
    });
  });

  describe("signMessage", () => {
    it("throws when Rabet is not installed", async () => {
      await expect(adapter.signMessage("test message")).rejects.toThrow(
        "Rabet extension is not installed",
      );
    });

    it("signs message and returns signature", async () => {
      const expectedSignature = "HIGGLESIGATURE1234567890";
      mockWindow.rabet = {
        connect: vi.fn().mockResolvedValue({ publicKey: "GDUMMY" }),
        sign: vi.fn().mockResolvedValue("signedXdr"),
        signMessage: vi.fn().mockResolvedValue({ signature: expectedSignature }),
      };
      const signature = await adapter.signMessage("test message");
      expect(signature).toBe(expectedSignature);
      expect(mockWindow.rabet?.signMessage).toHaveBeenCalledWith("test message");
    });
  });

  describe("signAuthEntry", () => {
    it("is not implemented (throws)", async () => {
      const entryXdr = "AAAAABBBBBCCCCC";
      mockWindow.rabet = {
        connect: vi.fn().mockResolvedValue({ publicKey: "GDUMMY" }),
        sign: vi.fn().mockResolvedValue("signedXdr"),
        signMessage: vi.fn().mockResolvedValue({ signature: "sig" }),
      };
      await expect(adapter.signAuthEntry(entryXdr)).rejects.toThrow(
        /does not implement.*signAuthEntry/i,
      );
    });
  });
});
