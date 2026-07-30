import { vi } from "vitest";

export const publicKey = vi.fn().mockResolvedValue({
  pubkey: "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ",
  signature: "sig-123",
  signed_message: "message-123",
});

export const tx = vi.fn().mockResolvedValue({
  xdr: "signed-albedo-xdr",
  tx_hash: "hash-123",
  signed_envelope: "signed-envelope",
  pubkey: "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ",
});

export const signMessage = vi.fn().mockResolvedValue({
  message: "hello",
  pubkey: "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ",
  signature: "sig-msg-123",
});

export const resetAlbedoMocks = () => {
  publicKey.mockReset();
  publicKey.mockResolvedValue({
    pubkey: "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ",
    signature: "sig-123",
    signed_message: "message-123",
  });
  tx.mockReset();
  tx.mockResolvedValue({
    xdr: "signed-albedo-xdr",
    tx_hash: "hash-123",
    signed_envelope: "signed-envelope",
    pubkey: "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ",
  });
  signMessage.mockReset();
  signMessage.mockResolvedValue({
    message: "hello",
    pubkey: "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ",
    signature: "sig-msg-123",
  });
};

const albedo = {
  publicKey,
  tx,
  signMessage,
};

export default albedo;
