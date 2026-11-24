import { createSignal, onCleanup, type Accessor } from "solid-js";
import { toError } from "./internal";

type AddressResult = string | { address?: string | null; error?: { message?: string } | null } | null;
type AllowedResult = boolean | { isAllowed?: boolean; error?: { message?: string } | null } | null;
type NetworkResult = {
  network?: string | null;
  networkPassphrase?: string | null;
  error?: { message?: string } | null;
} | null;

function resultError(result: { error?: { message?: string } | null } | null): Error | null {
  const error = result?.error;
  return error ? new Error(error.message ?? String(error)) : null;
}

export interface CreateFreighterWalletOptions {
  expectedNetworkPassphrase?: string;
}

export interface CreateFreighterWalletReturn {
  isInstalled: Accessor<boolean>;
  isConnected: Accessor<boolean>;
  publicKey: Accessor<string | null>;
  network: Accessor<string | null>;
  networkPassphrase: Accessor<string | null>;
  networkPassphraseMismatch: Accessor<boolean>;
  error: Accessor<Error | null>;
  isLoading: Accessor<boolean>;
  connect: () => Promise<void>;
  disconnect: () => void;
  refresh: () => Promise<void>;
}

export function createFreighterWallet(
  options: CreateFreighterWalletOptions = {}
): CreateFreighterWalletReturn {
  const [isInstalled, setIsInstalled] = createSignal(false);
  const [isConnected, setIsConnected] = createSignal(false);
  const [publicKey, setPublicKey] = createSignal<string | null>(null);
  const [network, setNetwork] = createSignal<string | null>(null);
  const [networkPassphrase, setNetworkPassphrase] = createSignal<string | null>(null);
  const [error, setError] = createSignal<Error | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);

  let disposed = false;

  const refresh = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const freighter = await import("@stellar/freighter-api");
      const allowed = (await freighter.isAllowed()) as AllowedResult;
      const installed = typeof allowed === "boolean" ? allowed : allowed?.isAllowed === true || !!allowed?.error;
      if (disposed) return;
      setIsInstalled(installed);

      if (!installed) {
        setIsConnected(false);
        setPublicKey(null);
        setNetwork(null);
        setNetworkPassphrase(null);
        return;
      }

      const addressResult = (await freighter.getAddress()) as AddressResult;
      const address = typeof addressResult === "string" ? addressResult : addressResult?.address ?? null;
      const addressError = typeof addressResult === "object" && addressResult !== null ? resultError(addressResult) : null;
      if (disposed) return;
      setPublicKey(address || null);
      setIsConnected(!!address);
      setError(addressError);

      const networkResult = (await freighter.getNetworkDetails()) as NetworkResult;
      setNetwork(networkResult?.network ?? null);
      setNetworkPassphrase(networkResult?.networkPassphrase ?? null);
    } catch (cause) {
      if (!disposed) setError(toError(cause));
    } finally {
      if (!disposed) setIsLoading(false);
    }
  };

  const connect = async () => {
    try {
      const freighter = await import("@stellar/freighter-api");
      const result = (await freighter.requestAccess()) as AddressResult;
      const address = typeof result === "string" ? result : result?.address ?? null;
      if (address) await refresh();
      else if (typeof result === "object" && result !== null) setError(resultError(result));
    } catch (cause) {
      setError(toError(cause));
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setPublicKey(null);
  };

  void refresh();

  onCleanup(() => {
    disposed = true;
  });

  return {
    isInstalled,
    isConnected,
    publicKey,
    network,
    networkPassphrase,
    networkPassphraseMismatch: () => {
      const expected = options.expectedNetworkPassphrase;
      const current = networkPassphrase();
      return !!expected && !!current && expected !== current;
    },
    error,
    isLoading,
    connect,
    disconnect,
    refresh,
  };
}
