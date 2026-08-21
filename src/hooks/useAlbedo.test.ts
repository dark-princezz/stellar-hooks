import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAlbedo } from "./useAlbedo";
import albedo, {
  resetAlbedoMocks,
  publicKey,
  tx,
  signMessage,
} from "@albedo-link/intent";

beforeEach(() => {
  vi.clearAllMocks();
  resetAlbedoMocks();
});

describe("useAlbedo", () => {
  it("starts disconnected", () => {
    const { result } = renderHook(() => useAlbedo());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.publicKey).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.isSigningMessage).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("connects successfully", async () => {
    const { result } = renderHook(() => useAlbedo());

    let key: string | null = null;
    await act(async () => {
      key = await result.current.connect();
    });

    expect(key).toBe("GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ");
    expect(result.current.isConnected).toBe(true);
    expect(result.current.publicKey).toBe(
      "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ"
    );
    expect(result.current.error).toBeNull();
  });

  it("handles connect error gracefully", async () => {
    vi.mocked(publicKey).mockRejectedValue(new Error("User closed Albedo popup"));

    const { result } = renderHook(() => useAlbedo());

    let key: string | null = null;
    await act(async () => {
      key = await result.current.connect();
    });

    expect(key).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("User closed Albedo popup");
  });

  it("disconnects active wallet", async () => {
    const { result } = renderHook(() => useAlbedo());

    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.isConnected).toBe(true);

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.publicKey).toBeNull();
  });

  it("signs transaction successfully", async () => {
    vi.mocked(tx).mockResolvedValue({
      xdr: "orig-xdr",
      tx_hash: "hash",
      signed_envelope_xdr: "signed-env-xdr",
      pubkey: "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ",
    });

    const { result } = renderHook(() => useAlbedo());

    let signed: string | undefined;
    await act(async () => {
      signed = await result.current.signTransaction("orig-xdr" as any, {
        network: "testnet",
      });
    });

    expect(signed).toBe("signed-env-xdr");
    expect(vi.mocked(tx)).toHaveBeenCalledWith({
      xdr: "orig-xdr",
      network: "testnet",
    });
  });

  it("throws and sets error on transaction signing failure", async () => {
    vi.mocked(tx).mockRejectedValue(new Error("Signing rejected"));

    const { result } = renderHook(() => useAlbedo());

    await act(async () => {
      await expect(
        result.current.signTransaction("xdr" as any)
      ).rejects.toThrow("Signing rejected");
    });

    expect(result.current.error?.message).toBe("Signing rejected");
  });

  it("signs message successfully", async () => {
    vi.mocked(signMessage).mockResolvedValue({
      message: "hello",
      pubkey: "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ",
      message_signature: "signature-bytes",
    });

    const { result } = renderHook(() => useAlbedo());

    let sig: string | undefined;
    await act(async () => {
      sig = await result.current.signMessage("hello");
    });

    expect(sig).toBe("signature-bytes");
  });

  it("throws when signMessage returns no signature", async () => {
    vi.mocked(signMessage).mockResolvedValue({
      message: "hello",
      pubkey: "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ",
      message_signature: "",
    });

    const { result } = renderHook(() => useAlbedo());

    await expect(
      act(() => result.current.signMessage("hello"))
    ).rejects.toThrow("No signature returned from Albedo");
  });
});
