import type { WalletAdapter } from "./types";

interface RabetApi {
  connect(): Promise<{ publicKey: string }>;
  sign(xdr: string, opts?: { networkPassphrase?: string }): Promise<string>;
  signMessage(message: string): Promise<{ signature: string }>;
}

interface RabetWindow {
  rabet?: RabetApi;
}

function getRabetApi(): RabetApi | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as RabetWindow).rabet ?? null;
}

export function createRabetAdapter(): WalletAdapter {
  return {
    id: "rabet",
    name: "Rabet",

    isInstalled(): boolean {
      return getRabetApi() !== null;
    },

    async connect(): Promise<string> {
      const api = getRabetApi();
      if (!api) throw new Error("Rabet extension is not installed");
      const { publicKey } = await api.connect();
      return publicKey;
    },

    disconnect(): void {
      // Rabet does not expose a programmatic disconnect
    },

    async signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string> {
      const api = getRabetApi();
      if (!api) throw new Error("Rabet extension is not installed");
      return api.sign(xdr, opts);
    },

    async signMessage(message: string): Promise<string> {
      const api = getRabetApi();
      if (!api) throw new Error("Rabet extension is not installed");
      const { signature } = await api.signMessage(message);
      return signature;
    },
  };
}
