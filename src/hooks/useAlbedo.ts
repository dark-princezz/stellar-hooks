/**
 * @file useAlbedo.ts
 * @description React hook for interacting with the Albedo web wallet signer.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useMemo, useState } from "react";
import albedo from "@albedo-link/intent";
import {
  asPublicKey,
  unsafeAsXdrString,
  type StellarPublicKey,
  type StellarXdrString,
} from "../types";

export interface AlbedoState {
  /** Whether the user has connected their Albedo wallet. */
  isConnected: boolean;
  /** Connected wallet's Stellar public key (G...), or `null` when not connected. */
  publicKey: StellarPublicKey | null;
  /** `true` while a connect or sign action is in progress. */
  isLoading: boolean;
  /** Most recent error from an Albedo interaction, or `null`. */
  error: Error | null;
}

export interface UseAlbedoOptions {
  /**
   * Optional token passed to `albedo.publicKey()` for identity verification.
   */
  token?: string;
}

export interface SignAlbedoTransactionOptions {
  /** Stellar network identifier (e.g. `"testnet"`, `"public"`). */
  network?: string;
  /** When `true`, Albedo automatically submits the transaction after signing. */
  submit?: boolean;
}

export interface SignAlbedoMessageOptions {
  /** Public key to verify the message signing request against. */
  pubkey?: string;
}

export interface UseAlbedoReturn extends AlbedoState {
  /** `true` while the connection popup is active. */
  isConnecting: boolean;
  /** `true` while a message signing request is active. */
  isSigningMessage: boolean;
  /** Request access/public key from Albedo. Resolves with the public key on approval. */
  connect: (opts?: { token?: string }) => Promise<StellarPublicKey | null>;
  /** Disconnect and reset active wallet state. */
  disconnect: () => void;
  /**
   * Sign a Stellar transaction XDR using Albedo.
   * @example
   * ```ts
   * const signedXdr = await signTransaction(builtXdr);
   * ```
   */
  signTransaction: (
    xdr: StellarXdrString,
    opts?: SignAlbedoTransactionOptions
  ) => Promise<StellarXdrString>;
  /**
   * Sign an arbitrary message string using Albedo.
   * @example
   * ```ts
   * const signature = await signMessage("Hello Stellar");
   * ```
   */
  signMessage: (
    message: string,
    opts?: SignAlbedoMessageOptions
  ) => Promise<string>;
}

/**
 * React hook to connect to and sign transactions or messages with the Albedo web-based wallet.
 *
 * Albedo is a web-based Stellar wallet that uses intent-based signing via the @albedo-link/intent library.
 * This hook provides a simple interface for connecting, signing transactions, and signing messages.
 *
 * @param options - Optional configuration for Albedo connection
 * @param options.token - Optional token passed to albedo.publicKey() for identity verification
 *
 * @returns Object containing Albedo wallet state and methods
 * @returns {boolean} returns.isConnected - Whether the user has connected their Albedo wallet
 * @returns {string|null} returns.publicKey - Connected wallet's Stellar public key (G...)
 * @returns {boolean} returns.isLoading - True while a connect or sign action is in progress
 * @returns {Error|null} returns.error - Most recent error from an Albedo interaction
 * @returns {boolean} returns.isConnecting - True while the connection popup is active
 * @returns {boolean} returns.isSigningMessage - True while a message signing request is active
 * @returns {function} returns.connect - Request access/public key from Albedo
 * @returns {function} returns.disconnect - Disconnect and reset active wallet state
 * @returns {function} returns.signTransaction - Sign a Stellar transaction XDR using Albedo
 * @returns {function} returns.signMessage - Sign an arbitrary message string using Albedo
 *
 * @example
 * ```tsx
 * const { isConnected, publicKey, connect, signTransaction } = useAlbedo();
 *
 * if (!isConnected) {
 *   return <button onClick={() => connect()}>Connect Albedo</button>;
 * }
 * return <p>Connected as {publicKey}</p>;
 * ```
 *
 * @example
 * ```tsx
 * // Sign a transaction
 * const { signTransaction } = useAlbedo();
 * const signedXdr = await signTransaction(builtXdr, { network: "testnet" });
 * ```
 *
 * @example
 * ```tsx
 * // Sign a message for authentication
 * const { signMessage } = useAlbedo();
 * const signature = await signMessage("Hello Stellar", { pubkey: "G..." });
 * ```
 */
export function useAlbedo(options?: UseAlbedoOptions): UseAlbedoReturn {
  const [publicKey, setPublicKey] = useState<StellarPublicKey | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSigningMessage, setIsSigningMessage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const isConnected = useMemo(() => publicKey !== null, [publicKey]);

  const connect = useCallback(
    async (opts?: { token?: string }): Promise<StellarPublicKey | null> => {
      setIsConnecting(true);
      setIsLoading(true);
      setError(null);
      try {
        const tokenToUse = opts?.token ?? options?.token;
        const res = await albedo.publicKey({
          ...(tokenToUse && { token: tokenToUse }),
        });
        if (!res.pubkey) {
          throw new Error("No public key returned from Albedo");
        }
        const key = asPublicKey(res.pubkey);
        setPublicKey(key);
        return key;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        return null;
      } finally {
        setIsConnecting(false);
        setIsLoading(false);
      }
    },
    [options?.token]
  );

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setError(null);
  }, []);

  const signTransaction = useCallback(
    async (
      xdr: StellarXdrString,
      opts?: SignAlbedoTransactionOptions
    ): Promise<StellarXdrString> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await albedo.tx({
          xdr,
          ...(opts?.network && { network: opts.network }),
          ...(opts?.submit !== undefined && { submit: opts.submit }),
        });
        const signedXdr = res.signed_envelope_xdr || res.xdr;
        if (!signedXdr) {
          throw new Error("No signed transaction returned from Albedo");
        }
        return unsafeAsXdrString(signedXdr);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const signMsg = useCallback(
    async (
      message: string,
      opts?: SignAlbedoMessageOptions
    ): Promise<string> => {
      setIsSigningMessage(true);
      setIsLoading(true);
      setError(null);
      try {
        const pubkeyToUse = opts?.pubkey ?? (publicKey ? String(publicKey) : undefined);
        const res = await albedo.signMessage({
          message,
          ...(pubkeyToUse && { pubkey: pubkeyToUse }),
        });
        if (!res.message_signature) {
          throw new Error("No signature returned from Albedo");
        }
        return res.message_signature;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setIsSigningMessage(false);
        setIsLoading(false);
      }
    },
    [publicKey]
  );

  return useMemo(
    () => ({
      isConnected,
      publicKey,
      isLoading,
      isConnecting,
      isSigningMessage,
      error,
      connect,
      disconnect,
      signTransaction,
      signMessage: signMsg,
    }),
    [
      isConnected,
      publicKey,
      isLoading,
      isConnecting,
      isSigningMessage,
      error,
      connect,
      disconnect,
      signTransaction,
      signMsg,
    ]
  );
}
