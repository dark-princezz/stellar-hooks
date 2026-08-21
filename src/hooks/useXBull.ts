/**
 * @file useXBull.ts
 * @description Hook for connecting and signing transactions via the xBull wallet extension.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useState } from "react";
import { useStellarContext } from "../context";
import { useHookActivityDebug } from "../devtools/useHookActivityDebug";

export interface UseXBullOptions {
  debugLabel?: string;
}

export interface XBullState {
  isInstalled: boolean;
  isConnected: boolean;
  publicKey: string | null;
  isLoading: boolean;
  error: Error | null;
}

export interface UseXBullReturn extends XBullState {
  connect: () => Promise<string | null>;
  disconnect: () => void;
  signTransaction: (xdr: string, opts?: { networkPassphrase?: string }) => Promise<string>;
}

interface XBullSDK {
  connect(): Promise<string>;
  sign(opts: { xdr: string; network?: string }): Promise<string | { signedXdr: string }>;
}

function getXBullSDK(): XBullSDK | undefined {
  return typeof window !== "undefined"
    ? (window as unknown as { xBullSDK?: XBullSDK }).xBullSDK
    : undefined;
}

/**
 * Connect to and interact with the xBull browser extension wallet.
 */
export function useXBull(options: UseXBullOptions = {}): UseXBullReturn {
  const { debugLabel = "useXBull" } = options;
  const { config } = useStellarContext();

  const [isInstalled, setIsInstalled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const checkXBull = () => {
      const hasXBull = getXBullSDK() !== undefined;
      setIsInstalled(hasXBull);
    };
    checkXBull();
    window.addEventListener("load", checkXBull);
    return () => window.removeEventListener("load", checkXBull);
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
      const xbull = getXBullSDK();
      if (!xbull) {
        throw new Error("xBull extension is not installed. Please install xBull to continue.");
      }

      const pubKey = await xbull.connect();
      if (!pubKey) {
        throw new Error("Failed to retrieve public key from xBull wallet.");
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
      const xbull = getXBullSDK();
      if (!xbull) {
        throw new Error("xBull extension is not installed.");
      }
      const signedXdr = await xbull.sign({
        xdr,
        network: opts?.networkPassphrase ?? config.networkPassphrase,
      });
      return typeof signedXdr === "string" ? signedXdr : signedXdr?.signedXdr ?? signedXdr;
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
