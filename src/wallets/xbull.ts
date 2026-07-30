import type { WalletAdapter } from "./types";

interface XBullApi {
  connect(): Promise<{ publicKey: string }>;
  sign(xdr: string, opts?: { networkPassphrase?: string }): Promise<string>;
}

interface XBullWindow {
  xBullSDK?: XBullApi;
}

function getXBullApi(): XBullApi | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as XBullWindow).xBullSDK ?? null;
}

export function createXBullAdapter(): WalletAdapter {
  return {
    id: "xbull",
    name: "xBull",

    isInstalled(): boolean {
      return getXBullApi() !== null;
    },

    async connect(): Promise<string> {
      const api = getXBullApi();
      if (!api) throw new Error("xBull extension is not installed");
      const { publicKey } = await api.connect();
      return publicKey;
    },

    disconnect(): void {},

    async signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string> {
      const api = getXBullApi();
      if (!api) throw new Error("xBull extension is not installed");
      return api.sign(xdr, opts);
    },
  };
}
