import { describe, expect, it, vi } from "vitest";
import { initialWalletState, walletActions, walletReducer, walletSelectors } from "./walletState";
import { createWalletStore } from "./zustand";
import { createWalletAtoms } from "./jotai";
import { walletRootSelectors, walletSlice } from "./redux";

const KEY = "GABC";

describe("walletReducer", () => {
  it("moves through connect, balances and disconnect", () => {
    let state = walletReducer(undefined, walletActions.connecting());
    expect(state.status).toBe("connecting");
    state = walletReducer(state, walletActions.connected(KEY, "TESTNET"));
    state = walletReducer(state, walletActions.balancesUpdated([{ asset: "native", balance: "10" }]));
    expect(walletSelectors.isConnected(state)).toBe(true);
    expect(walletSelectors.balanceOf("native")(state)).toBe("10");
    expect(walletSelectors.balanceOf("USDC:G1")(state)).toBeNull();
    expect(walletReducer(state, walletActions.disconnected())).toEqual(initialWalletState);
  });

  it("ignores balances while disconnected and records failures", () => {
    expect(walletReducer(initialWalletState, walletActions.balancesUpdated([{ asset: "native", balance: "1" }])).balances).toEqual([]);
    expect(walletReducer(walletReducer(undefined, walletActions.connected(KEY)), walletActions.failed("denied"))).toEqual({
      ...initialWalletState,
      error: "denied",
    });
  });

  it("never mutates the shared initial state", () => {
    walletReducer(undefined, walletActions.connected(KEY));
    expect(Object.isFrozen(initialWalletState)).toBe(true);
    expect(initialWalletState.publicKey).toBeNull();
  });
});

describe("Zustand adapter", () => {
  it("implements the vanilla store contract and notifies subscribers", () => {
    const store = createWalletStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.actions.connected(KEY, "TESTNET");
    expect(store.getState()).toMatchObject({ status: "connected", publicKey: KEY, network: "TESTNET" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[1]).toEqual(initialWalletState);

    store.setState({ network: "PUBLIC" });
    store.actions.setBalances([{ asset: "native", balance: "5" }]);
    expect(store.getState().balances).toHaveLength(1);

    unsubscribe();
    store.actions.disconnected();
    expect(listener).toHaveBeenCalledTimes(3);
    expect(store.getInitialState()).toEqual(initialWalletState);
  });

  it("supports functional setState and skips no-op updates", () => {
    const store = createWalletStore({ network: "TESTNET" });
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState((s) => ({ network: `${s.network}-2` }));
    expect(store.getState().network).toBe("TESTNET-2");
    store.actions.setBalances([]); // disconnected: reducer returns same state
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("Jotai adapter", () => {
  /** Tiny stand-in for Jotai's `atom` and store, enough to exercise primitive, derived and write atoms. */
  function miniJotai() {
    type Node = { init?: unknown; read?: (get: (a: Node) => unknown) => unknown; write?: (get: (a: Node) => unknown, set: (a: Node, v: unknown) => void, arg: unknown) => void };
    const values = new Map<Node, unknown>();
    const atom = (first: unknown, write?: Node["write"]): Node =>
      typeof first === "function" ? { read: first as Node["read"] } : write ? { write } : { init: first };
    const get = (a: Node): unknown => (a.read ? a.read(get) : values.has(a) ? values.get(a) : a.init);
    const set = (a: Node, value: unknown): void => {
      if (a.write) a.write(get, set, value);
      else values.set(a, value);
    };
    return { atom, get, set };
  }

  it("exposes primitive atoms, a derived wallet atom and a reducer-backed write atom", () => {
    const { atom, get, set } = miniJotai();
    const atoms = createWalletAtoms(atom as never) as Record<string, never>;

    expect(get(atoms.isConnectedAtom)).toBe(false);
    set(atoms.dispatchAtom, walletActions.connected(KEY, "TESTNET"));
    set(atoms.dispatchAtom, walletActions.balancesUpdated([{ asset: "native", balance: "7" }]));

    expect(get(atoms.publicKeyAtom)).toBe(KEY);
    expect(get(atoms.isConnectedAtom)).toBe(true);
    expect(get(atoms.walletAtom)).toMatchObject({ status: "connected", balances: [{ asset: "native", balance: "7" }] });

    set(atoms.dispatchAtom, walletActions.disconnected());
    expect(get(atoms.walletAtom)).toEqual(initialWalletState);
  });
});

describe("Redux slice", () => {
  it("has slice shape and root selectors under state.wallet", () => {
    expect(walletSlice.name).toBe("wallet");
    expect(walletSlice.getInitialState()).toEqual(initialWalletState);
    let wallet = walletSlice.reducer(undefined, walletSlice.actions.connected(KEY, "TESTNET"));
    wallet = walletSlice.reducer(wallet, walletSlice.actions.balancesUpdated([{ asset: "native", balance: "3" }]));
    const root = { wallet };
    expect(walletRootSelectors.isConnected(root)).toBe(true);
    expect(walletRootSelectors.publicKey(root)).toBe(KEY);
    expect(walletRootSelectors.balanceOf("native")(root)).toBe("3");
  });

  it("ignores unrelated actions", () => {
    const state = walletSlice.reducer(undefined, walletSlice.actions.connected(KEY));
    expect(walletSlice.reducer(state, { type: "other" } as never)).toBe(state);
  });
});
