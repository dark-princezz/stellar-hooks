/**
 * @file walletState.ts
 * @description Library-agnostic wallet/account state shape, reducer and selectors shared by the optional
 * Zustand, Jotai and Redux Toolkit adapters. None of those libraries is required to import this file.
 * @package stellar-hooks
 */

export type WalletStatus = "disconnected" | "connecting" | "connected";

export interface WalletBalance {
  /** `native` or `CODE:ISSUER`. */
  asset: string;
  balance: string;
}

export interface WalletState {
  status: WalletStatus;
  publicKey: string | null;
  network: string | null;
  balances: WalletBalance[];
  error: string | null;
}

export const initialWalletState: WalletState = Object.freeze({
  status: "disconnected",
  publicKey: null,
  network: null,
  balances: [],
  error: null,
}) as WalletState;

export type WalletAction =
  | { type: "wallet/connecting" }
  | { type: "wallet/connected"; payload: { publicKey: string; network: string | null } }
  | { type: "wallet/disconnected" }
  | { type: "wallet/balancesUpdated"; payload: WalletBalance[] }
  | { type: "wallet/failed"; payload: string };

export const walletActions = {
  connecting: (): WalletAction => ({ type: "wallet/connecting" }),
  connected: (publicKey: string, network: string | null = null): WalletAction => ({
    type: "wallet/connected",
    payload: { publicKey, network },
  }),
  disconnected: (): WalletAction => ({ type: "wallet/disconnected" }),
  balancesUpdated: (balances: WalletBalance[]): WalletAction => ({ type: "wallet/balancesUpdated", payload: balances }),
  failed: (message: string): WalletAction => ({ type: "wallet/failed", payload: message }),
};

/** Pure reducer: disconnecting clears the account and balances so stale data never outlives a session. */
export function walletReducer(state: WalletState = initialWalletState, action: WalletAction): WalletState {
  switch (action.type) {
    case "wallet/connecting":
      return { ...state, status: "connecting", error: null };
    case "wallet/connected":
      return { ...state, status: "connected", publicKey: action.payload.publicKey, network: action.payload.network, error: null };
    case "wallet/disconnected":
      return { ...initialWalletState };
    case "wallet/balancesUpdated":
      return state.status === "connected" ? { ...state, balances: action.payload } : state;
    case "wallet/failed":
      return { ...initialWalletState, error: action.payload };
    default:
      return state;
  }
}

export const walletSelectors = {
  status: (s: WalletState) => s.status,
  isConnected: (s: WalletState) => s.status === "connected",
  publicKey: (s: WalletState) => s.publicKey,
  network: (s: WalletState) => s.network,
  balances: (s: WalletState) => s.balances,
  balanceOf: (asset: string) => (s: WalletState) => s.balances.find((b) => b.asset === asset)?.balance ?? null,
  error: (s: WalletState) => s.error,
};
