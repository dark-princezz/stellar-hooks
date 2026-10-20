/**
 * @file jotai.ts
 * @description Jotai atoms for wallet and account state. Pass Jotai's own `atom` function so
 * stellar-hooks does not depend on Jotai: `const atoms = createWalletAtoms(atom)`.
 * @package stellar-hooks
 */

import { initialWalletState, walletReducer } from "./walletState";
import type { WalletAction, WalletBalance, WalletState, WalletStatus } from "./walletState";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function createWalletAtoms<A extends (...args: any[]) => any>(atom: A) {
  type AnyAtom = ReturnType<A>;

  // Primitive atoms: compose these with your own atoms.
  const statusAtom: AnyAtom = atom(initialWalletState.status as WalletStatus);
  const publicKeyAtom: AnyAtom = atom(initialWalletState.publicKey as string | null);
  const networkAtom: AnyAtom = atom(initialWalletState.network as string | null);
  const balancesAtom: AnyAtom = atom(initialWalletState.balances as WalletBalance[]);
  const errorAtom: AnyAtom = atom(initialWalletState.error as string | null);

  // Read-only derived atoms.
  const isConnectedAtom: AnyAtom = atom((get: (a: AnyAtom) => unknown) => get(statusAtom) === "connected");
  const walletAtom: AnyAtom = atom(
    (get: (a: AnyAtom) => unknown): WalletState => ({
      status: get(statusAtom) as WalletStatus,
      publicKey: get(publicKeyAtom) as string | null,
      network: get(networkAtom) as string | null,
      balances: get(balancesAtom) as WalletBalance[],
      error: get(errorAtom) as string | null,
    }),
  );

  /** Write-only atom: `set(dispatchAtom, walletActions.connected(key))` runs the shared reducer. */
  const dispatchAtom: AnyAtom = atom(null, (get: (a: AnyAtom) => unknown, set: (a: AnyAtom, v: unknown) => void, action: WalletAction) => {
    const next = walletReducer(get(walletAtom) as WalletState, action);
    set(statusAtom, next.status);
    set(publicKeyAtom, next.publicKey);
    set(networkAtom, next.network);
    set(balancesAtom, next.balances);
    set(errorAtom, next.error);
  });

  return { statusAtom, publicKeyAtom, networkAtom, balancesAtom, errorAtom, isConnectedAtom, walletAtom, dispatchAtom };
}
