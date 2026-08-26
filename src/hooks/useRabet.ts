/**
 * @file useRabet.ts
 * @description Hook for interacting with the Rabet browser extension wallet.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { createRabetAdapter } from "../wallets/rabet";
import { asPublicKey, type StellarPublicKey } from "../types";
import { useHookActivityDebug } from "../devtools/useHookActivityDebug";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RabetState {
  /** Whether the Rabet extension is detected in the current environment */
  isInstalled: boolean;
  /** Whether the user has granted the dApp access to their Rabet wallet */
  isConnected: boolean;
  /** Connected wallet's Stellar public key (G...), or `null` when not connected */
  publicKey: StellarPublicKey | null;
  /** `true` while the initial detection or a connect/disconnect call is in progress */
  isLoading: boolean;
  /** Most recent error from a Rabet interaction, or `null` */
  error: Error | null;
}

export interface UseRabetOptions {
  /** When `true`, checks `isAllowed()` on mount and silently reconnects if previously granted */
  autoConnect?: boolean;
}

export interface UseRabetReturn extends RabetState {
  /** `true` while a `connect()` call is in flight */
  isConnecting: boolean;
  /** `true` while a `signMessage()` call is in flight */
  isSigningMessage: boolean;
  /** `true` while a `signTransaction()` call is in flight */
  isSigningTransaction: boolean;
  /** Request wallet access from the user */
  connect: () => Promise<StellarPublicKey | null>;
  /** Clear the active wallet session */
  disconnect: () => void;
  /** Sign a Stellar transaction XDR with the connected Rabet wallet */
  signTransaction: (
    xdr: string,
    opts?: { networkPassphrase?: string },
  ) => Promise<string>;
  /** Sign an arbitrary message string */
  signMessage: (message: string) => Promise<string>;
}

// ─── State Machine ───────────────────────────────────────────────────────────

type State = RabetState & {
  isConnecting: boolean;
  isSigningMessage: boolean;
  isSigningTransaction: boolean;
};

type Action =
  | { type: "DETECT"; isInstalled: boolean }
  | { type: "CONNECTING" }
  | { type: "CONNECTED"; publicKey: StellarPublicKey }
  | { type: "DISCONNECTED" }
  | { type: "SIGNING_TRANSACTION"; payload: boolean }
  | { type: "SIGNING_MESSAGE"; payload: boolean }
  | { type: "ERROR"; payload: Error };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "DETECT":
      return {
        ...state,
        isInstalled: action.isInstalled,
        isLoading: false,
      };
    case "CONNECTING":
      return {
        ...state,
        isConnecting: true,
        isLoading: true,
        error: null,
      };
    case "CONNECTED":
      return {
        ...state,
        isConnected: true,
        publicKey: action.publicKey,
        isConnecting: false,
        isLoading: false,
        error: null,
      };
    case "DISCONNECTED":
      return {
        isConnected: false,
        publicKey: null,
        isLoading: false,
        isConnecting: false,
        isSigningMessage: false,
        isSigningTransaction: false,
        error: null,
      };
    case "SIGNING_TRANSACTION":
      return {
        ...state,
        isSigningTransaction: action.payload,
        isLoading: action.payload,
      };
    case "SIGNING_MESSAGE":
      return {
        ...state,
        isSigningMessage: action.payload,
        isLoading: action.payload,
      };
    case "ERROR":
      return {
        ...state,
        isConnecting: false,
        isLoading: false,
        isSigningMessage: false,
        isSigningTransaction: false,
        error: action.payload,
      };
    default:
      return state;
  }
}

const initialState: State = {
  isInstalled: false,
  isConnected: false,
  publicKey: null,
  isLoading: true,
  isConnecting: false,
  isSigningMessage: false,
  isSigningTransaction: false,
  error: null,
};

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Interact with the Rabet browser extension wallet.
 *
 * Handles detection, connection, transaction signing, and message signing.
 * Supports auto-connect on mount when `autoConnect` is enabled.
 *
 * @param options - Configuration options
 * @returns Wallet state and interaction methods
 *
 * @example
 * ```tsx
 * const { isInstalled, isConnected, publicKey, connect, signTransaction } = useRabet();
 *
 * if (!isInstalled) return <p>Install Rabet</p>;
 * if (!isConnected) return <button onClick={connect}>Connect</button>;
 *
 * return <p>{publicKey}</p>;
 * ```
 */
export function useRabet(options?: UseRabetOptions): UseRabetReturn {
  const [state, dispatch] = useReducer(reducer, initialState);
  const adapter = useMemo(() => createRabetAdapter(), []);
  const isMountedRef = useRef(true);

  useHookActivityDebug({
    name: "useRabet",
    status: state.isConnected ? "connected" : state.isConnecting ? "connecting" : "idle",
    error: state.error,
  });

  // Detect installation on mount
  useEffect(() => {
    isMountedRef.current = true;
    const installed = adapter.isInstalled();
    if (isMountedRef.current) {
      dispatch({ type: "DETECT", isInstalled: installed });
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [adapter]);

  // Auto-connect if enabled
  useEffect(() => {
    if (!options?.autoConnect || !state.isInstalled || state.isConnected) return;

    let cancelled = false;

    (async () => {
      try {
        const publicKey = await adapter.connect();
        if (!cancelled && isMountedRef.current) {
          const typed = asPublicKey(publicKey);
          dispatch({ type: "CONNECTED", publicKey: typed });
        }
      } catch {
        // Auto-connect failures are silent — user hasn't interacted yet
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [options?.autoConnect, state.isInstalled, state.isConnected, adapter]);

  const connect = useCallback(async (): Promise<StellarPublicKey | null> => {
    dispatch({ type: "CONNECTING" });
    try {
      const publicKey = await adapter.connect();
      const typed = asPublicKey(publicKey);
      dispatch({ type: "CONNECTED", publicKey: typed });
      return typed;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      dispatch({ type: "ERROR", payload: error });
      return null;
    }
  }, [adapter]);

  const disconnect = useCallback(() => {
    adapter.disconnect();
    dispatch({ type: "DISCONNECTED" });
  }, [adapter]);

  const signTransaction = useCallback(
    async (xdr: string, opts?: { networkPassphrase?: string }): Promise<string> => {
      dispatch({ type: "SIGNING_TRANSACTION", payload: true });
      try {
        if (!state.isConnected) {
          throw new Error("Wallet not connected. Call connect() first.");
        }
        return await adapter.signTransaction(xdr, opts);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        dispatch({ type: "ERROR", payload: error });
        throw error;
      } finally {
        dispatch({ type: "SIGNING_TRANSACTION", payload: false });
      }
    },
    [adapter, state.isConnected],
  );

  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      dispatch({ type: "SIGNING_MESSAGE", payload: true });
      try {
        if (!state.isConnected) {
          throw new Error("Wallet not connected. Call connect() first.");
        }
        if (!adapter.signMessage) {
          throw new Error("Rabet does not support message signing");
        }
        return await adapter.signMessage(message);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        dispatch({ type: "ERROR", payload: error });
        throw error;
      } finally {
        dispatch({ type: "SIGNING_MESSAGE", payload: false });
      }
    },
    [adapter, state.isConnected],
  );

  return useMemo(
    () => ({
      ...state,
      connect,
      disconnect,
      signTransaction,
      signMessage,
    }),
    [state, connect, disconnect, signTransaction, signMessage],
  );
}
