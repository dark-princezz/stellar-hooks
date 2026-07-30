import { useCallback, useEffect, useMemo, useReducer } from "react";
import type { WalletId, WalletAdapter } from "../wallets/types";
import { createAllAdapters } from "../wallets";
import { asPublicKey, type StellarPublicKey } from "../types";

export interface UseWalletOptions {
  walletId?: WalletId;
  autoConnect?: boolean;
}

export interface UseWalletReturn {
  availableWallets: WalletId[];
  activeWallet: WalletId | null;
  publicKey: StellarPublicKey | null;
  isConnected: boolean;
  isLoading: boolean;
  isConnecting: boolean;
  isSigningMessage: boolean;
  error: Error | null;
  setActiveWallet: (id: WalletId) => void;
  connect: (walletId?: WalletId) => Promise<StellarPublicKey | null>;
  disconnect: () => void;
  signTransaction: (xdr: string, opts?: { networkPassphrase?: string }) => Promise<string>;
  signMessage: (message: string, opts?: { accountToSign?: string }) => Promise<string>;
  signAuthEntry: (entryPreimageXdr: string) => Promise<string>;
}

type State = {
  availableWallets: WalletId[];
  activeWallet: WalletId | null;
  publicKey: StellarPublicKey | null;
  isLoading: boolean;
  isConnecting: boolean;
  isSigningMessage: boolean;
  error: Error | null;
};

type Action =
  | { type: "SET_AVAILABLE"; wallets: WalletId[] }
  | { type: "CONNECTING" }
  | { type: "CONNECTED"; walletId: WalletId; publicKey: StellarPublicKey }
  | { type: "DISCONNECTED" }
  | { type: "SET_ACTIVE"; walletId: WalletId }
  | { type: "SIGNING_MESSAGE"; payload: boolean }
  | { type: "ERROR"; payload: Error };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_AVAILABLE":
      return { ...state, availableWallets: action.wallets };
    case "CONNECTING":
      return { ...state, isConnecting: true, isLoading: true, error: null };
    case "CONNECTED":
      return {
        ...state,
        activeWallet: action.walletId,
        publicKey: action.publicKey,
        isConnecting: false,
        isLoading: false,
        error: null,
      };
    case "DISCONNECTED":
      return {
        ...state,
        activeWallet: null,
        publicKey: null,
        isConnecting: false,
        isLoading: false,
        isSigningMessage: false,
        error: null,
      };
    case "SET_ACTIVE":
      return { ...state, activeWallet: action.walletId };
    case "SIGNING_MESSAGE":
      return { ...state, isSigningMessage: action.payload, isLoading: action.payload };
    case "ERROR":
      return { ...state, isConnecting: false, isLoading: false, isSigningMessage: false, error: action.payload };
    default:
      return state;
  }
}

const initial: State = {
  availableWallets: [],
  activeWallet: null,
  publicKey: null,
  isLoading: false,
  isConnecting: false,
  isSigningMessage: false,
  error: null,
};

export function useWallet(options?: UseWalletOptions): UseWalletReturn {
  const [state, dispatch] = useReducer(reducer, initial);
  const adapters = useMemo<WalletAdapter[]>(() => createAllAdapters(), []);

  useEffect(() => {
    const installed = adapters.filter((a) => a.isInstalled()).map((a) => a.id);
    dispatch({ type: "SET_AVAILABLE", wallets: installed });
  }, [adapters]);

  useEffect(() => {
    if (options?.walletId && state.availableWallets.includes(options.walletId)) {
      dispatch({ type: "SET_ACTIVE", walletId: options.walletId });
    }
  }, [options?.walletId, state.availableWallets]);

  const getAdapter = useCallback(
    (id: WalletId): WalletAdapter => {
      const adapter = adapters.find((a) => a.id === id);
      if (!adapter) throw new Error(`Unknown wallet: ${id}`);
      return adapter;
    },
    [adapters],
  );

  const setActiveWallet = useCallback((id: WalletId) => {
    dispatch({ type: "SET_ACTIVE", walletId: id });
  }, []);

  const connect = useCallback(
    async (walletId?: WalletId): Promise<StellarPublicKey | null> => {
      const id = walletId ?? options?.walletId ?? state.activeWallet ?? state.availableWallets[0];
      if (!id) {
        dispatch({ type: "ERROR", payload: new Error("No wallet available") });
        return null;
      }

      dispatch({ type: "CONNECTING" });
      try {
        const adapter = getAdapter(id);
        const publicKey = await adapter.connect();
        const typedPublicKey = asPublicKey(publicKey);
        dispatch({ type: "CONNECTED", walletId: id, publicKey: typedPublicKey });
        return typedPublicKey;
      } catch (err) {
        dispatch({ type: "ERROR", payload: err instanceof Error ? err : new Error(String(err)) });
        return null;
      }
    },
    [state.activeWallet, state.availableWallets, getAdapter, options?.walletId],
  );

  const disconnect = useCallback(() => {
    if (state.activeWallet) {
      try {
        getAdapter(state.activeWallet).disconnect();
      } catch {
        // adapter may already be unavailable
      }
    }
    dispatch({ type: "DISCONNECTED" });
  }, [state.activeWallet, getAdapter]);

  const signTransaction = useCallback(
    async (xdr: string, opts?: { networkPassphrase?: string }): Promise<string> => {
      if (!state.activeWallet) throw new Error("No active wallet");
      const adapter = getAdapter(state.activeWallet);
      return adapter.signTransaction(xdr, opts);
    },
    [state.activeWallet, getAdapter],
  );

  const signMessage = useCallback(
    async (message: string, opts?: { accountToSign?: string }): Promise<string> => {
      if (!state.activeWallet) throw new Error("No active wallet");
      const adapter = getAdapter(state.activeWallet);
      if (!adapter.signMessage) {
        throw new Error(`${state.activeWallet} does not support message signing`);
      }
      dispatch({ type: "SIGNING_MESSAGE", payload: true });
      try {
        const signature = await adapter.signMessage(message, opts);
        return signature;
      } finally {
        dispatch({ type: "SIGNING_MESSAGE", payload: false });
      }
    },
    [state.activeWallet, getAdapter],
  );

  const signAuthEntry = useCallback(
    async (entryPreimageXdr: string): Promise<string> => {
      if (!state.activeWallet) throw new Error("No active wallet");
      const adapter = getAdapter(state.activeWallet);
      if (!adapter.signAuthEntry) {
        throw new Error(`${state.activeWallet} does not support auth entry signing`);
      }
      return adapter.signAuthEntry(entryPreimageXdr);
    },
    [state.activeWallet, getAdapter],
  );

  const isConnected = useMemo(() => state.publicKey !== null, [state.publicKey]);

  return useMemo(
    () => ({
      availableWallets: state.availableWallets,
      activeWallet: state.activeWallet,
      publicKey: state.publicKey,
      isConnected,
      isLoading: state.isLoading,
      isConnecting: state.isConnecting,
      isSigningMessage: state.isSigningMessage,
      error: state.error,
      setActiveWallet,
      connect,
      disconnect,
      signTransaction,
      signMessage,
      signAuthEntry,
    }),
    [
      state,
      isConnected,
      setActiveWallet,
      connect,
      disconnect,
      signTransaction,
      signMessage,
      signAuthEntry,
    ],
  );
}
