import albedo from "@albedo-link/intent";
import type { WalletAdapter } from "./types";
import { UserRejectedError, isUserRejectionMessage } from "../utils/errors";

export function createAlbedoAdapter(): WalletAdapter {
  return {
    id: "albedo",
    name: "Albedo",

    isInstalled(): boolean {
      return true;
    },

    async connect(): Promise<string> {
      const res = await albedo.publicKey({});
      if (!res.pubkey) {
        throw new Error("No public key returned from Albedo");
      }
      return res.pubkey;
    },

    disconnect(): void {
      // Albedo is stateless, no disconnect needed
    },

    async signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string> {
      let res: { signed_envelope?: string; xdr?: string };
      try {
        res = await albedo.tx({
          xdr,
          ...(opts?.networkPassphrase && { network: opts.networkPassphrase }),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (isUserRejectionMessage(message)) {
          throw new UserRejectedError(message, { cause: err, walletId: "albedo", operation: "signTransaction" });
        }
        throw err;
      }
      const signedXdr = res.signed_envelope || res.xdr;
      if (!signedXdr) {
        throw new Error("No signed transaction returned from Albedo");
      }
      return signedXdr;
    },

    async signMessage(message: string, opts?: { accountToSign?: string }): Promise<string> {
      let res: { message_signature?: string };
      try {
        res = await albedo.signMessage({
          message,
          ...(opts?.accountToSign && { pubkey: opts.accountToSign }),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (isUserRejectionMessage(msg)) {
          throw new UserRejectedError(msg, { cause: err, walletId: "albedo", operation: "signMessage" });
        }
        throw err;
      }
      if (!res.message_signature) {
        throw new Error("No signature returned from Albedo");
      }
      return res.message_signature;
    },
  };
}
