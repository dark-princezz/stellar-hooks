/**
 * @file useSyncWalletState.ts
 * @description Pushes the live Freighter connection (and optional balances) into an external store.
 * @package stellar-hooks
 * @license MIT
 */

import { useEffect } from "react";
import { useFreighter } from "./useFreighter";
import { walletActions } from "../integrations/walletState";
import type { WalletAction, WalletBalance } from "../integrations/walletState";

export interface UseSyncWalletStateOptions {
  /** Balances to mirror into the store while connected. */
  balances?: WalletBalance[];
}

/**
 * Keeps an external store in sync with the wallet connection. `dispatch` receives plain wallet actions,
 * so it can be `store.dispatch` (Redux), a Zustand wrapper or a Jotai `set` call.
 *
 * @example
 * ```tsx
 * useSyncWalletState(walletStore.dispatch, { balances });
 * ```
 */
export function useSyncWalletState(
  dispatch: (action: WalletAction) => void,
  options: UseSyncWalletStateOptions = {},
): void {
  const { isConnected, publicKey, network } = useFreighter();
  const { balances } = options;

  useEffect(() => {
    if (isConnected && publicKey) dispatch(walletActions.connected(publicKey, network));
    else dispatch(walletActions.disconnected());
  }, [dispatch, isConnected, publicKey, network]);

  useEffect(() => {
    if (isConnected && balances) dispatch(walletActions.balancesUpdated(balances));
  }, [dispatch, isConnected, balances]);
}
