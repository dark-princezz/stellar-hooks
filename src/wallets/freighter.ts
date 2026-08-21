import {
  signTransaction as freighterSignTx,
  signAuthEntry as freighterSignAuthEntry,
  signMessage as freighterSignMessage,
} from "@stellar/freighter-api";
import {
  normalizeIsConnected,
  normalizeRequestAccess,
} from "./freighter-normalization";
import type { WalletAdapter } from "./types";
import { UserRejectedError, isUserRejectionMessage } from "../utils/errors";

export function createFreighterAdapter(): WalletAdapter {
  return {
    id: "freighter",
    name: "Freighter",

    isInstalled(): boolean {
      return typeof window !== "undefined" && !!(window as unknown as { __FREIGHTER__?: unknown }).__FREIGHTER__;
    },

    async connect(): Promise<string> {
      const { address, error } = await normalizeRequestAccess();
      if (error) throw error;
      if (!address) throw new Error("No address returned from Freighter");
      return address;
    },

    disconnect(): void {
      // Freighter does not expose a programmatic disconnect
    },

    async signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string> {
      const { signedTxXdr, error } = await freighterSignTx(xdr, {
        ...(opts?.networkPassphrase && { networkPassphrase: opts.networkPassphrase }),
      });
      if (error) {
        throw isUserRejectionMessage(error.message)
          ? new UserRejectedError(error.message, { cause: error, walletId: "freighter", operation: "signTransaction" })
          : new Error(error.message);
      }
      return signedTxXdr;
    },

    async signMessage(message: string, opts?: { accountToSign?: string }): Promise<string> {
      const address = opts?.accountToSign;
      const { signedMessage, error } = await freighterSignMessage(message, {
        ...(address && { address }),
      });
      if (error) {
        throw isUserRejectionMessage(error.message)
          ? new UserRejectedError(error.message, { cause: error, walletId: "freighter", operation: "signMessage" })
          : new Error(error.message);
      }
      if (!signedMessage) throw new Error("No signed message returned from Freighter");
      return signedMessage.toString();
    },

    async signAuthEntry(entryPreimageXdr: string): Promise<string> {
      const { signedAuthEntry, error } = await freighterSignAuthEntry(entryPreimageXdr);
      if (error) {
        throw isUserRejectionMessage(error.message)
          ? new UserRejectedError(error.message, { cause: error, walletId: "freighter", operation: "signAuthEntry" })
          : new Error(error.message);
      }
      if (!signedAuthEntry) throw new Error("No signed auth entry returned from Freighter");
      return signedAuthEntry;
    },
  };
}

export async function isFreighterInstalled(): Promise<boolean> {
  try {
    const { isConnected: connected } = await normalizeIsConnected();
    return !!connected;
  } catch {
    return false;
  }
}
