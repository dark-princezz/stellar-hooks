import { useCallback, useEffect, useReducer } from "react";
import {
  isConnected,
  getPublicKey,
  getNetwork as freighterGetNetwork,
  requestAccess,
  signTransaction as freighterSignTransaction,
  signAuthEntry,
  signBlob,
} from "@stellar/freighter-api";
import type { FreighterState, SignTransactionOptions, UseFreighterReturn } from "../types";

// ─── State Machine ─────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_CONNECTED"; publicKey: string; network: string; networkPassphrase: string }
  | { type: "SET_DISCONNECTED" }
  | { type: "SET_NOT_INSTALLED" }
  | { type: "SET_ERROR"; payload: Error };

function reducer(state: FreighterState, action: Action): FreighterState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload, error: null };
    case "SET_CONNECTED":
      return {
        ...state,
        isInstalled: true,
        isConnected: true,
        publicKey: action.publicKey,
        network: action.network,
        networkPassphrase: action.networkPassphrase,
        isLoading: false,
        error: null,
      };
    case "SET_DISCONNECTED":
      return {
        ...state,
        isConnected: false,
        publicKey: null,
        network: null,
        networkPassphrase: null,
        isLoading: false,
        error: null,
      };
    case "SET_NOT_INSTALLED":
      return { ...state, isInstalled: false, isLoading: false };
    case "SET_ERROR":
      return { ...state, isLoading: false, error: action.payload };
    default:
      return state;
  }
}

const initial: FreighterState = {
  isInstalled: false,
  isConnected: false,
  publicKey: null,
  network: null,
  networkPassphrase: null,
  isLoading: true,
  error: null,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFreighter(): UseFreighterReturn {
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    let cancelled = false;

    async function probe() {
      dispatch({ type: "SET_LOADING", payload: true });

      try {
        const connected = await isConnected();
        if (cancelled) return;

        if (!connected) {
          dispatch({ type: "SET_NOT_INSTALLED" });
          return;
        }

        const publicKey = await getPublicKey();
        if (cancelled) return;

        if (publicKey) {
          const network = await freighterGetNetwork();
          if (cancelled) return;

          dispatch({
            type: "SET_CONNECTED",
            publicKey,
            network,
            networkPassphrase: network,
          });
        } else {
          dispatch({ type: "SET_DISCONNECTED" });
        }
      } catch (err) {
        if (!cancelled) {
          dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err : new Error(String(err)) });
        }
      }
    }

    void probe();
    return () => { cancelled = true; };
  }, []);

  const connect = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      await requestAccess();
      const publicKey = await getPublicKey();
      if (!publicKey) {
        throw new Error("Failed to get address");
      }
      const network = await freighterGetNetwork();
      dispatch({
        type: "SET_CONNECTED",
        publicKey,
        network,
        networkPassphrase: network,
      });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err : new Error(String(err)) });
    }
  }, []);

  const disconnect = useCallback(() => {
    dispatch({ type: "SET_DISCONNECTED" });
  }, []);

  const signTx = useCallback(
    async (xdr: string, opts?: SignTransactionOptions): Promise<string> => {
      return freighterSignTransaction(xdr, {
        networkPassphrase: opts?.networkPassphrase,
        accountToSign: opts?.address,
      });
    },
    []
  );

  const signEntry = useCallback(async (entryPreimageXdr: string): Promise<string> => {
    return signAuthEntry(entryPreimageXdr);
  }, []);

  const signBlobCallback = useCallback(
    async (blob: string, opts?: { accountToSign?: string }): Promise<string> => {
      return signBlob(blob, opts);
    },
    []
  );

  return {
    ...state,
    connect,
    disconnect,
    signTransaction: signTx,
    signAuthEntry: signEntry,
    signBlob: signBlobCallback,
  };
}
