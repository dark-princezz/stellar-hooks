/**
 * @file useLobstr.ts
 * @description Hook for connecting and signing transactions via the LOBSTR wallet extension/connect flow.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useState } from "react";
import { useStellarContext } from "../context";
import { useHookActivityDebug } from "../devtools/useHookActivityDebug";
import type { StellarTransactionError } from "../types";

export interface UseLobstrOptions {
  debugLabel?: string;
}

export interface UseLobstrReturn {
  isInstalled: boolean;
  isConnected: boolean;
  publicKey: string | null;
  isLoading: boolean;
  error: Error | null;
  connect: () => Promise<string | null>;
  disconnect: () => void;
  signTransaction: (xdr: string, opts?: { networkPassphrase?: string }) => Promise<string>;
}

/**
 * Connect to and interact with the LOBSTR wallet extension or connect flow.
 */
export function useLobstr(options: UseLobstrOptions = {}): UseLobstrReturn {
  const { debugLabel = "useLobstr" } = options;
  const { config } = useStellarContext();

  const [isInstalled, setIsInstalled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Check if LOBSTR extension provider is present on window
    const checkLobstr = () => {
      const hasLobstr = typeof window !== "undefined" && (window as any).lobstr !== undefined;
      setIsInstalled(hasLobstr);
    };
    checkLobstr();
    window.addEventListener("load", checkLobstr);
    return () => window.removeEventListener("load", checkLobstr);
  }, []);

  useHookActivityDebug({
    name: debugLabel,
    status: isConnected ? "connected" : isLoading ? "loading" : error ? "error" : "idle",
    error,
  });

  const connect = useCallback(async (): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const lobstrProvider = (window as any).lobstr;
      if (!lobstrProvider) {
        throw new Error("LOBSTR extension is not installed. Please install LOBSTR to continue.");
      }

      // Invoke LOBSTR connect API
      const res = await lobstrProvider.getPublicKey();
      const pubKey = typeof res === "string" ? res : res?.publicKey;
      
      if (!pubKey) {
        throw new Error("Failed to retrieve public key from LOBSTR wallet.");
      }

      setPublicKey(pubKey);
      setIsConnected(true);
      setIsLoading(false);
      return pubKey;
    } catch (err) {
      const wrappedErr = err instanceof Error ? err : new Error(String(err));
      setError(wrappedErr);
      setIsLoading(false);
      return null;
    }
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setIsConnected(false);
    setError(null);
  }, []);

  const signTransaction = useCallback(
    async (xdr: string, opts?: { networkPassphrase?: string }): Promise<string> => {
      const lobstrProvider = (window as any).lobstr;
      if (!lobstrProvider) {
        throw new Error("LOBSTR extension is not installed.");
      }
      const passphrase = opts?.networkPassphrase ?? config.networkPassphrase;
      const signedXdr = await lobstrProvider.signTransaction(xdr, { networkPassphrase: passphrase });
      return typeof signedXdr === "string" ? signedXdr : signedXdr?.signedTxXdr;
    },
    [config.networkPassphrase],
  );

  return {
    isInstalled,
    isConnected,
    publicKey,
    isLoading,
    error,
    connect,
    disconnect,
    signTransaction,
  };
}
