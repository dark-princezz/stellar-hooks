import { describe, it, expect, beforeEach, vi } from "vitest";
import { createXBullAdapter, isXBullInstalled } from "../xbull";
import { XBullWalletAdapter } from "../adapters/xbull";
import { UserRejectedError } from "../../utils/errors";

describe("xBull Wallet Adapter", () => {
  const mockPublicKey = "GAK7...X42";
  const mockSignedXdr = "AAAA...signedXdr";

  beforeEach(() => {
    // Clear mock window object
    delete (window as unknown as { xBullSDK?: unknown }).xBullSDK;
    delete (window as unknown as { xBull?: unknown }).xBull;
  });

  it("reports isInstalled correctly", async () => {
    const adapter = createXBullAdapter();
    expect(adapter.isInstalled()).toBe(false);
    expect(await isXBullInstalled()).toBe(false);

    (window as unknown as { xBullSDK: unknown }).xBullSDK = {
      connect: vi.fn(),
      sign: vi.fn(),
    };

    expect(adapter.isInstalled()).toBe(true);
    expect(await isXBullInstalled()).toBe(true);
  });

  it("connects and returns public key", async () => {
    const mockConnect = vi.fn().mockResolvedValue(mockPublicKey);
    (window as unknown as { xBullSDK: unknown }).xBullSDK = {
      connect: mockConnect,
      sign: vi.fn(),
    };

    const adapter = createXBullAdapter();
    const result = await adapter.connect();
    expect(result).toBe(mockPublicKey);
    expect(mockConnect).toHaveBeenCalled();
  });

  it("connects when returning object with publicKey", async () => {
    const mockConnect = vi.fn().mockResolvedValue({ publicKey: mockPublicKey });
    (window as unknown as { xBullSDK: unknown }).xBullSDK = {
      connect: mockConnect,
      sign: vi.fn(),
    };

    const adapter = createXBullAdapter();
    const result = await adapter.connect();
    expect(result).toBe(mockPublicKey);
  });

  it("throws error when not installed on connect", async () => {
    const adapter = createXBullAdapter();
    await expect(adapter.connect()).rejects.toThrow("xBull extension is not installed");
  });

  it("signs transaction", async () => {
    const mockSign = vi.fn().mockResolvedValue(mockSignedXdr);
    (window as unknown as { xBullSDK: unknown }).xBullSDK = {
      connect: vi.fn(),
      sign: mockSign,
    };

    const adapter = createXBullAdapter();
    const result = await adapter.signTransaction("AAAA...txXdr", { networkPassphrase: "Test SDF Network" });
    expect(result).toBe(mockSignedXdr);
    expect(mockSign).toHaveBeenCalledWith({
      xdr: "AAAA...txXdr",
      network: "Test SDF Network",
    });
  });

  it("handles user rejection during signTransaction", async () => {
    const mockSign = vi.fn().mockRejectedValue(new Error("User rejected the request"));
    (window as unknown as { xBullSDK: unknown }).xBullSDK = {
      connect: vi.fn(),
      sign: mockSign,
    };

    const adapter = createXBullAdapter();
    await expect(adapter.signTransaction("AAAA...txXdr")).rejects.toThrow(UserRejectedError);
  });

  it("signs message when supported", async () => {
    const mockSignMessage = vi.fn().mockResolvedValue("signedMessageString");
    (window as unknown as { xBullSDK: unknown }).xBullSDK = {
      connect: vi.fn(),
      sign: vi.fn(),
      signMessage: mockSignMessage,
    };

    const adapter = createXBullAdapter();
    const result = await adapter.signMessage!("hello", { accountToSign: mockPublicKey });
    expect(result).toBe("signedMessageString");
    expect(mockSignMessage).toHaveBeenCalledWith("hello", { accountToSign: mockPublicKey });
  });

  it("signs auth entry when supported", async () => {
    const mockSignAuthEntry = vi.fn().mockResolvedValue("signedEntryXdr");
    (window as unknown as { xBullSDK: unknown }).xBullSDK = {
      connect: vi.fn(),
      sign: vi.fn(),
      signAuthEntry: mockSignAuthEntry,
    };

    const adapter = createXBullAdapter();
    const result = await adapter.signAuthEntry!("authEntryXdr");
    expect(result).toBe("signedEntryXdr");
    expect(mockSignAuthEntry).toHaveBeenCalledWith("authEntryXdr");
  });

  it("XBullWalletAdapter class works identically", async () => {
    const mockConnect = vi.fn().mockResolvedValue(mockPublicKey);
    (window as unknown as { xBullSDK: unknown }).xBullSDK = {
      connect: mockConnect,
      sign: vi.fn().mockResolvedValue(mockSignedXdr),
    };

    const adapter = new XBullWalletAdapter();
    expect(adapter.isInstalled()).toBe(true);
    const pubKey = await adapter.connect();
    expect(pubKey).toBe(mockPublicKey);
    const signed = await adapter.signTransaction("AAAA...txXdr");
    expect(signed).toBe(mockSignedXdr);
  });
});
