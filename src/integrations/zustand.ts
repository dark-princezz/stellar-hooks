/**
 * @file zustand.ts
 * @description Zustand-compatible store for wallet and account state. The store implements the vanilla
 * `StoreApi` contract (`getState`, `setState`, `subscribe`), so it works with `useStore(store, selector)`
 * from `zustand` without stellar-hooks depending on Zustand.
 * @package stellar-hooks
 */

import { initialWalletState, walletActions, walletReducer } from "./walletState";
import type { WalletBalance, WalletState } from "./walletState";

type Listener = (state: WalletState, previous: WalletState) => void;

export interface WalletStore {
  getState: () => WalletState;
  getInitialState: () => WalletState;
  setState: (partial: Partial<WalletState> | ((state: WalletState) => Partial<WalletState>)) => void;
  subscribe: (listener: Listener) => () => void;
  /** Wallet actions bound to this store. */
  actions: {
    connecting: () => void;
    connected: (publicKey: string, network?: string | null) => void;
    disconnected: () => void;
    setBalances: (balances: WalletBalance[]) => void;
    failed: (message: string) => void;
  };
}

/**
 * @example
 * ```ts
 * import { useStore } from "zustand";
 * const walletStore = createWalletStore();
 * const publicKey = useStore(walletStore, (s) => s.publicKey);
 * ```
 */
export function createWalletStore(initial: Partial<WalletState> = {}): WalletStore {
  const initialState: WalletState = { ...initialWalletState, ...initial };
  let state = initialState;
  const listeners = new Set<Listener>();

  const replace = (next: WalletState) => {
    if (Object.is(next, state)) return;
    const previous = state;
    state = next;
    listeners.forEach((listener) => listener(state, previous));
  };

  return {
    getState: () => state,
    getInitialState: () => initialState,
    setState: (partial) => {
      const patch = typeof partial === "function" ? partial(state) : partial;
      replace({ ...state, ...patch });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    actions: {
      connecting: () => replace(walletReducer(state, walletActions.connecting())),
      connected: (publicKey, network = null) => replace(walletReducer(state, walletActions.connected(publicKey, network))),
      disconnected: () => replace(walletReducer(state, walletActions.disconnected())),
      setBalances: (balances) => replace(walletReducer(state, walletActions.balancesUpdated(balances))),
      failed: (message) => replace(walletReducer(state, walletActions.failed(message))),
    },
  };
}
