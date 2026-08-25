import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAlbedoAdapter, isAlbedoInstalled } from "../albedo";
import { UserRejectedError } from "../../utils/errors";

vi.mock("@albedo-link/intent", () => ({
  default: {
    publicKey: vi.fn(),
    tx: vi.fn(),
    signMessage: vi.fn(),
  },
}));

import albedo from "@albedo-link/intent";

describe("Albedo Wallet Adapter", () => {
  const mockPublicKey = "GAK7...X42";
  const mockSignedXdr = "AAAA...signedXdr";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports isInstalled correctly", async () => {
    const adapter = createAlbedoAdapter();
    expect(adapter.isInstalled()).toBe(true);
    expect(await isAlbedoInstalled()).toBe(true);
  });

  it("connects and returns public key from Albedo", async () => {
    vi.mocked(albedo.publicKey).mockResolvedValue({ pubkey: mockPublicKey } as never);

    const adapter = createAlbedoAdapter();
    const result = await adapter.connect();
    expect(result).toBe(mockPublicKey);
    expect(albedo.publicKey).toHaveBeenCalledWith({});
  });

  it("handles connect user rejection", async () => {
    vi.mocked(albedo.publicKey).mockRejectedValue(new Error("Request declined by user"));

    const adapter = createAlbedoAdapter();
    await expect(adapter.connect()).rejects.toThrow(UserRejectedError);
  });

  it("signs transaction", async () => {
    vi.mocked(albedo.tx).mockResolvedValue({ signed_envelope: mockSignedXdr } as never);

    const adapter = createAlbedoAdapter();
    const result = await adapter.signTransaction("AAAA...txXdr", { networkPassphrase: "Test SDF Network" });
    expect(result).toBe(mockSignedXdr);
    expect(albedo.tx).toHaveBeenCalledWith({
      xdr: "AAAA...txXdr",
      network: "Test SDF Network",
    });
  });

  it("handles signTransaction rejection", async () => {
    vi.mocked(albedo.tx).mockRejectedValue(new Error("User cancelled the transaction"));

    const adapter = createAlbedoAdapter();
    await expect(adapter.signTransaction("AAAA...txXdr")).rejects.toThrow(UserRejectedError);
  });

  it("signs message", async () => {
    vi.mocked(albedo.signMessage).mockResolvedValue({ message_signature: "sig123" } as never);

    const adapter = createAlbedoAdapter();
    const result = await adapter.signMessage!("hello world", { accountToSign: mockPublicKey });
    expect(result).toBe("sig123");
    expect(albedo.signMessage).toHaveBeenCalledWith({
      message: "hello world",
      pubkey: mockPublicKey,
    });
  });
});
