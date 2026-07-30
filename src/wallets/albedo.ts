import albedo from "@albedo-link/intent";
import type { WalletAdapter } from "./types";

export function createAlbedoAdapter(): WalletAdapter {
  return {
    id: "albedo",
    name: "Albedo",

    isInstalled(): boolean {
      return true;
    },

    async connect(): Promise<string> {
      const res = await albedo.publicKey();
      if (!res.pubkey) {
        throw new Error("No public key returned from Albedo");
      }
      return res.pubkey;
    },

    disconnect(): void {
      // Albedo is stateless, no disconnect needed
    },

    async signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string> {
      const res = await albedo.tx({
        xdr,
        ...(opts?.networkPassphrase && { network: opts.networkPassphrase }),
      });
      const signedXdr = res.signed_envelope || res.xdr;
      if (!signedXdr) {
        throw new Error("No signed transaction returned from Albedo");
      }
      return signedXdr;
    },

    async signMessage(message: string, opts?: { accountToSign?: string }): Promise<string> {
      const res = await albedo.signMessage({
        message,
        ...(opts?.accountToSign && { pubkey: opts.accountToSign }),
      });
      if (!res.signature) {
        throw new Error("No signature returned from Albedo");
      }
      return res.signature;
    },
  };
}
