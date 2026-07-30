import { useCallback, useMemo, useReducer } from "react";
import { createRabetAdapter } from "../wallets/rabet";
import { asPublicKey, type StellarPublicKey } from "../types";

export interface RabetState {
  isConnected: boolean;
  publicKey: StellarPublicKey | null;
  isLoading: boolean;
  error: Error | null;
}

export interface UseRabetOptions {
  autoConnect?: boolean;
}

export interface UseRabetReturn extends RabetState {
  isConnecting: boolean;
  isSigningMessage: boolean;
  connect: () => Promise<StellarPublicKey | null>;
  disconnect: () => void;
  signTransaction: (xdr: string, opts?: { networkPassphrase?: string }) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
}

type State = RabetState & { isConnecting: boolean; isSigningMessage: boolean };

type Action =
  | { type: "CONNECTING" }
  | { type: "CONNECTED"; publicKey: StellarPublicKey }
  | { type: "DISCONNECTED" }
  | { type: "SIGNING_MESSAGE"; payload: boolean }
  | { type: "ERROR"; payload: Error };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "CONNECTING":
      return { ...state, isConnecting: true, isLoading: true, error: null };
    case "CONNECTED":
      return { ...state, isConnected: true, publicKey: action.publicKey, isConnecting: false, isLoading: false, error: null };
    case "DISCONNECTED":
      return { isConnected: false, publicKey: null, isLoading: false, isConnecting: false, isSigningMessage: false, error: null };
    case "SIGNING_MESSAGE":
      return { ...state, isSigningMessage: action.payload, isLoading: action.payload };
    case "ERROR":
      return { ...state, isConnecting: false, isLoading: false, isSigningMessage: false, error: action.payload };
    default:
      return state;
  }
}

const initial: State = {
  isConnected: false,
  publicKey: null,
  isLoading: false,
  isConnecting: false,
  isSigningMessage: false,
  error: null,
};

export function useRabet(_options?: UseRabetOptions): UseRabetReturn {
  const [state, dispatch] = useReducer(reducer, initial);
  const adapter = useMemo(() => createRabetAdapter(), []);

  const connect = useCallback(async (): Promise<StellarPublicKey | null> => {
    dispatch({ type: "CONNECTING" });
    try {
      const publicKey = await adapter.connect();
      const typed = asPublicKey(publicKey);
      dispatch({ type: "CONNECTED", publicKey: typed });
      return typed;
    } catch (err) {
      dispatch({ type: "ERROR", payload: err instanceof Error ? err : new Error(String(err)) });
      return null;
    }
  }, [adapter]);

  const disconnect = useCallback(() => {
    adapter.disconnect();
    dispatch({ type: "DISCONNECTED" });
  }, [adapter]);

  const signTransaction = useCallback(
    async (xdr: string, opts?: { networkPassphrase?: string }): Promise<string> => {
      return adapter.signTransaction(xdr, opts);
    },
    [adapter],
  );

  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!adapter.signMessage) throw new Error("Rabet does not support message signing");
      dispatch({ type: "SIGNING_MESSAGE", payload: true });
      try {
        return await adapter.signMessage(message);
      } finally {
        dispatch({ type: "SIGNING_MESSAGE", payload: false });
      }
    },
    [adapter],
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
