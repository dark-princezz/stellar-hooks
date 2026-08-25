import type { WalletAdapter } from "./types";
import { UserRejectedError, isUserRejectionMessage } from "../utils/errors";

export interface XBullSDK {
  connect(): Promise<string | { publicKey: string }>;
  sign(opts: { xdr: string; network?: string } | string, opts?: { networkPassphrase?: string }): Promise<string | { signedXdr: string }>;
  signMessage?(message: string, opts?: { accountToSign?: string }): Promise<string | { signedMessage: string }>;
  signAuthEntry?(entryPreimageXdr: string): Promise<string | { signedAuthEntry: string }>;
}

export function getXBullSDK(): XBullSDK | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as { xBullSDK?: XBullSDK; xBull?: XBullSDK };
  return win.xBullSDK ?? win.xBull ?? null;
}

export function createXBullAdapter(): WalletAdapter {
  return {
    id: "xbull",
    name: "xBull",

    isInstalled(): boolean {
      return getXBullSDK() !== null;
    },

    async connect(): Promise<string> {
      const api = getXBullSDK();
      if (!api) throw new Error("xBull extension is not installed");
      try {
        const res = await api.connect();
        const publicKey = typeof res === "string" ? res : res?.publicKey;
        if (!publicKey) throw new Error("No public key returned from xBull");
        return publicKey;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (isUserRejectionMessage(msg)) {
          throw new UserRejectedError(msg, { cause: err, walletId: "xbull", operation: "connect" });
        }
        throw err;
      }
    },

    disconnect(): void {
      // Stateless disconnect
    },

    async signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string> {
      const api = getXBullSDK();
      if (!api) throw new Error("xBull extension is not installed");
      try {
        const result = await api.sign(
          typeof api.sign.length === "number" && api.sign.length === 2
            ? xdr
            : { xdr, ...(opts?.networkPassphrase && { network: opts.networkPassphrase }) },
          opts
        );
        const signedXdr = typeof result === "string" ? result : result?.signedXdr;
        if (!signedXdr) throw new Error("No signed transaction returned from xBull");
        return signedXdr;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (isUserRejectionMessage(msg)) {
          throw new UserRejectedError(msg, { cause: err, walletId: "xbull", operation: "signTransaction" });
        }
        throw err;
      }
    },

    async signMessage(message: string, opts?: { accountToSign?: string }): Promise<string> {
      const api = getXBullSDK();
      if (!api) throw new Error("xBull extension is not installed");
      if (!api.signMessage) throw new Error("signMessage is not supported by this version of xBull");
      try {
        const result = await api.signMessage(message, opts);
        const signedMsg = typeof result === "string" ? result : result?.signedMessage;
        if (!signedMsg) throw new Error("No signed message returned from xBull");
        return signedMsg;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (isUserRejectionMessage(msg)) {
          throw new UserRejectedError(msg, { cause: err, walletId: "xbull", operation: "signMessage" });
        }
        throw err;
      }
    },

    async signAuthEntry(entryPreimageXdr: string): Promise<string> {
      const api = getXBullSDK();
      if (!api) throw new Error("xBull extension is not installed");
      if (!api.signAuthEntry) throw new Error("signAuthEntry is not supported by this version of xBull");
      try {
        const result = await api.signAuthEntry(entryPreimageXdr);
        const signedEntry = typeof result === "string" ? result : result?.signedAuthEntry;
        if (!signedEntry) throw new Error("No signed auth entry returned from xBull");
        return signedEntry;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (isUserRejectionMessage(msg)) {
          throw new UserRejectedError(msg, { cause: err, walletId: "xbull", operation: "signAuthEntry" });
        }
        throw err;
      }
    },
  };
}

export async function isXBullInstalled(): Promise<boolean> {
  return getXBullSDK() !== null;
}

