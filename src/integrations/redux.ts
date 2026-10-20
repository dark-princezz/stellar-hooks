/**
 * @file redux.ts
 * @description Redux Toolkit compatible slice for wallet and account state. Shaped like the result of
 * `createSlice` (`name`, `reducer`, `actions`, `selectors`) but implemented without importing Redux
 * Toolkit, so it works with `configureStore({ reducer: { wallet: walletSlice.reducer } })`.
 * @package stellar-hooks
 */

import { initialWalletState, walletActions, walletReducer, walletSelectors } from "./walletState";
import type { WalletState } from "./walletState";

export const WALLET_SLICE_NAME = "wallet" as const;

export const walletSlice = {
  name: WALLET_SLICE_NAME,
  reducer: walletReducer,
  getInitialState: (): WalletState => initialWalletState,
  actions: walletActions,
};

type RootWithWallet = { [WALLET_SLICE_NAME]: WalletState };

/** Selectors for apps that mount the reducer under `state.wallet`. */
export const walletRootSelectors = {
  state: (root: RootWithWallet) => root.wallet,
  status: (root: RootWithWallet) => walletSelectors.status(root.wallet),
  isConnected: (root: RootWithWallet) => walletSelectors.isConnected(root.wallet),
  publicKey: (root: RootWithWallet) => walletSelectors.publicKey(root.wallet),
  network: (root: RootWithWallet) => walletSelectors.network(root.wallet),
  balances: (root: RootWithWallet) => walletSelectors.balances(root.wallet),
  balanceOf: (asset: string) => (root: RootWithWallet) => walletSelectors.balanceOf(asset)(root.wallet),
  error: (root: RootWithWallet) => walletSelectors.error(root.wallet),
};
