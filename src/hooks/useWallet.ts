/**
 * @file useWallet.ts
 * @description Unified multi-wallet hook for Stellar.
 *
 * Auto-detects all installed wallets (Freighter, Lobstr, xBull, Albedo, Rabet,
 * Ledger) and exposes a single, consistent connect / sign / disconnect API
 * regardless of which wallet the user picks.
 *
 * @example
 * ```tsx
 * import { useWallet } from "stellar-hooks";
 *
 * function WalletPicker() {
 *   const { wallets, connect, disconnect, publicKey, isConnecting, error } = useWallet();
 *
 *   if (publicKey) {
 *     return (
 *       <div>
 *         <p>Connected: {publicKey}</p>
 *         <button onClick={disconnect}>Disconnect</button>
 *       </div>
 *     );
 *   }
 *
 *   return (
 *     <>
 *       {wallets.map(({ id, name, meta, isInstalled }) => (
 *         <button
 *           key={id}
 *           disabled={!isInstalled || isConnecting}
 *           onClick={() => connect(id)}
 *         >
 *           <img src={meta.iconUrl} alt={name} width={24} />
 *           {isInstalled ? `Connect ${name}` : `Install ${name}`}
 *         </button>
 *       ))}
 *       {error && <p role="alert">{error.message}</p>}
 *     </>
 *   );
 * }
 * ```
 *
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useMemo, useReducer } from "react";
import type { WalletId, WalletAdapter, WalletInfo } from "../wallets/types";
import { createAllAdapters } from "../wallets";
import { asPublicKey, type StellarPublicKey } from "../types";
import { useOptionalStellarContext } from "../context";

// ─── Public API types ──────────────────────────────────────────────────────────

export type { WalletInfo };

/**
 * Configuration options for the useWallet hook.
 */
export interface UseWalletOptions {
  /**
   * Specific wallet ID to use. If not provided, the hook will detect available wallets
   * and use the last-connected wallet from localStorage.
   */
  walletId?: WalletId;
  /**
   * If true, automatically reconnects users who previously granted access (default: false).
   * Only works if the wallet was previously connected and permission was granted.
   */
  autoConnect?: boolean;
  /**
   * Override the default network passphrase used for signing.
   * Falls back to the enclosing `<StellarProvider>` config when omitted.
   */
  networkPassphrase?: string;
}

/**
 * Return type for the useWallet hook.
 */
export interface UseWalletReturn {
  /** Array of detected wallet IDs that are available in the current browser */
  availableWallets: WalletId[];
  /** Currently active wallet ID, or null if no wallet is connected */
  activeWallet: WalletId | null;
  /** Connected wallet's public key (G...), or null if not connected */
  publicKey: StellarPublicKey | null;
  /** Whether a wallet is currently connected */
  isConnected: boolean;
  /** True during initial wallet detection and connection attempts */
  isLoading: boolean;
  /** True while actively connecting to a wallet */
  isConnecting: boolean;
  /** True while a message signing operation is in progress */
  isSigningMessage: boolean;
  /** Any error that occurred during wallet operations */
  error: Error | null;
  /** Set the active wallet (does not automatically connect) */
  setActiveWallet: (id: WalletId) => void;
  /** Connect to a wallet by ID (or use active/default wallet) */
  connect: (walletId?: WalletId) => Promise<StellarPublicKey | null>;
  /** Disconnect the current wallet (clears local state only) */
  disconnect: () => void;
  /** Sign a Stellar transaction XDR with the connected wallet */
  signTransaction: (xdr: string, opts?: { networkPassphrase?: string }) => Promise<string>;
  /** Sign a text message with the connected wallet */
  signMessage: (message: string, opts?: { accountToSign?: string }) => Promise<string>;
  /** Sign a Soroban auth entry XDR with the connected wallet */
  signAuthEntry: (entryPreimageXdr: string) => Promise<string>;
  /**
   * Clear the current error without changing any other state.
   * Useful for dismissing error banners in the UI.
   */
  clearError: () => void;
}

// ─── Internal state machine ────────────────────────────────────────────────────

type State = {
  availableWallets: WalletId[];
  activeWallet: WalletId | null;
  publicKey: StellarPublicKey | null;
  isLoading: boolean;
  isConnecting: boolean;
  isSigningTransaction: boolean;
  isSigningMessage: boolean;
  isSigningAuthEntry: boolean;
  error: Error | null;
};

type Action =
  | { type: "SET_AVAILABLE"; wallets: WalletId[] }
  | { type: "SET_ACTIVE"; walletId: WalletId }
  | { type: "CONNECTING" }
  | { type: "CONNECTED"; walletId: WalletId; publicKey: StellarPublicKey }
  | { type: "DISCONNECTED" }
  | { type: "SIGNING_TX"; payload: boolean }
  | { type: "SIGNING_MSG"; payload: boolean }
  | { type: "SIGNING_ENTRY"; payload: boolean }
  | { type: "ERROR"; payload: Error }
  | { type: "CLEAR_ERROR" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_AVAILABLE":
      return { ...state, availableWallets: action.wallets };
    case "SET_ACTIVE":
      return { ...state, activeWallet: action.walletId };
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
        isSigningTransaction: false,
        isSigningMessage: false,
        isSigningAuthEntry: false,
        error: null,
      };
    case "SIGNING_TX":
      return { ...state, isSigningTransaction: action.payload, isLoading: action.payload };
    case "SIGNING_MSG":
      return { ...state, isSigningMessage: action.payload, isLoading: action.payload };
    case "SIGNING_ENTRY":
      return { ...state, isSigningAuthEntry: action.payload, isLoading: action.payload };
    case "ERROR":
      return {
        ...state,
        isConnecting: false,
        isLoading: false,
        isSigningTransaction: false,
        isSigningMessage: false,
        isSigningAuthEntry: false,
        error: action.payload,
      };
    case "CLEAR_ERROR":
      return { ...state, error: null };
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
  isSigningTransaction: false,
  isSigningMessage: false,
  isSigningAuthEntry: false,
  error: null,
};

/** localStorage key for persisting last-connected wallet type. */
const WALLET_PERSIST_KEY = "stellar-hooks:last-wallet";

/**
 * Unified multi-wallet interface for Stellar dApps.
 *
 * This hook detects installed Stellar wallets (Freighter, Lobstr, xBull, Albedo, Rabet)
 * and provides a unified interface for connection, disconnection, and signing operations.
 * It's the recommended approach for new code instead of wallet-specific hooks.
 *
 * @param options - Configuration options for wallet behavior
 * @param options.walletId - Specific wallet ID to use (auto-detects if not provided)
 * @param options.autoConnect - Automatically reconnect returning users (default: false)
 *
 * @returns Object containing wallet state and methods
 * @returns {WalletId[]} returns.availableWallets - Detected wallet IDs in current browser
 * @returns {WalletId|null} returns.activeWallet - Currently active wallet ID
 * @returns {string|null} returns.publicKey - Connected wallet's public key
 * @returns {boolean} returns.isConnected - Whether a wallet is connected
 * @returns {boolean} returns.isLoading - True during initial detection/connection
 * @returns {boolean} returns.isConnecting - True while actively connecting
 * @returns {boolean} returns.isSigningMessage - True during message signing
 * @returns {Error|null} returns.error - Any error from wallet operations
 * @returns {function} returns.setActiveWallet - Set the active wallet ID
 * @returns {function} returns.connect - Connect to a wallet
 * @returns {function} returns.disconnect - Disconnect current wallet
 * @returns {function} returns.signTransaction - Sign transaction XDR
 * @returns {function} returns.signMessage - Sign text message
 * @returns {function} returns.signAuthEntry - Sign Soroban auth entry
 *
 * @example
 * ```tsx
 * const { availableWallets, activeWallet, publicKey, connect, disconnect } = useWallet();
 *
 * if (publicKey) {
 *   return (
 *     <div>
 *       <p>Connected via {activeWallet}: {publicKey}</p>
 *       <button onClick={disconnect}>Disconnect</button>
 *     </div>
 *   );
 * }
 *
 * if (availableWallets.length === 0) return <p>No Stellar wallets detected.</p>;
 *
 * return (
 *   <div>
 *     {availableWallets.map((id) => (
 *       <button key={id} onClick={() => connect(id)}>
 *         Connect {id}
 *       </button>
 *     ))}
 *   </div>
 * );
 * ```
 *
 * @example
 * ```tsx
 * // Auto-connect returning users
 * const { publicKey, isConnected } = useWallet({ autoConnect: true });
 *
 * if (isConnected) return <p>Welcome back, {publicKey}</p>;
 * ```
 */
export function useWallet(options?: UseWalletOptions): UseWalletReturn {
  const [state, dispatch] = useReducer(reducer, initial);
  const adapters = useMemo<WalletAdapter[]>(() => createAllAdapters(), []);
  const stellarContext = useOptionalStellarContext();

  // Resolve network passphrase: explicit option > provider config > undefined
  const resolvedNetworkPassphrase = useMemo(
    () => options?.networkPassphrase ?? stellarContext?.config.networkPassphrase,
    [options?.networkPassphrase, stellarContext?.config.networkPassphrase],
  );

  // Build the enriched wallet list (all wallets + installation status)
  const wallets = useMemo<WalletInfo[]>(
    () =>
      adapters.map((a) => ({
        id: a.id,
        name: a.name,
        meta: a.meta,
        isInstalled: a.isInstalled(),
      })),
    // Re-compute when availableWallets changes so isInstalled stays in sync
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adapters, state.availableWallets],
  );

  // Detect installed wallets on mount (and whenever adapters change, e.g. after
  // a dynamic import of the Ledger adapter).
  useEffect(() => {
    const installed = adapters.filter((a) => a.isInstalled()).map((a) => a.id);
    dispatch({ type: "SET_AVAILABLE", wallets: installed });
  }, [adapters]);

  // Honour an explicit walletId option: activate it once it is detected as installed.
  useEffect(() => {
    if (options?.walletId && state.availableWallets.includes(options.walletId)) {
      dispatch({ type: "SET_ACTIVE", walletId: options.walletId });
    }
  }, [options?.walletId, state.availableWallets]);

  // Auto-connect: restore the last-used wallet ID from localStorage on mount.
  // Only the wallet type (e.g. "freighter") is stored — never keys or secrets.
  useEffect(() => {
    if (!options?.autoConnect || state.availableWallets.length === 0) return;
    try {
      const saved = localStorage.getItem(WALLET_PERSIST_KEY) as WalletId | null;
      if (saved && state.availableWallets.includes(saved)) {
        dispatch({ type: "SET_ACTIVE", walletId: saved });
      }
    } catch {
      // localStorage unavailable (SSR, private browsing) — fail silently
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.autoConnect, state.availableWallets]);

  // Persist wallet type on connect; clear on disconnect.
  useEffect(() => {
    try {
      if (state.activeWallet) {
        localStorage.setItem(WALLET_PERSIST_KEY, state.activeWallet);
      } else {
        localStorage.removeItem(WALLET_PERSIST_KEY);
      }
    } catch {
      // ignore
    }
  }, [state.activeWallet]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const getAdapter = useCallback(
    (id: WalletId): WalletAdapter => {
      const adapter = adapters.find((a) => a.id === id);
      if (!adapter) throw new Error(`Unknown wallet: "${id}"`);
      return adapter;
    },
    [adapters],
  );

  // ── Actions ───────────────────────────────────────────────────────────────────

  const setActiveWallet = useCallback((id: WalletId) => {
    dispatch({ type: "SET_ACTIVE", walletId: id });
  }, []);

  const connect = useCallback(
    async (walletId?: WalletId): Promise<StellarPublicKey | null> => {
      const id =
        walletId ??
        options?.walletId ??
        state.activeWallet ??
        state.availableWallets[0];

      if (!id) {
        dispatch({
          type: "ERROR",
          payload: new Error(
            "No wallet available. Please install a Stellar wallet extension.",
          ),
        });
        return null;
      }

      dispatch({ type: "CONNECTING" });
      try {
        const adapter = getAdapter(id);
        const rawPublicKey = await adapter.connect();
        const publicKey = asPublicKey(rawPublicKey);
        dispatch({ type: "CONNECTED", walletId: id, publicKey });
        return publicKey;
      } catch (err) {
        dispatch({
          type: "ERROR",
          payload: err instanceof Error ? err : new Error(String(err)),
        });
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.activeWallet, state.availableWallets, getAdapter, options?.walletId],
  );

  const disconnect = useCallback(() => {
    if (state.activeWallet) {
      try {
        getAdapter(state.activeWallet).disconnect();
      } catch {
        // adapter may already be unavailable — swallow silently
      }
    }
    dispatch({ type: "DISCONNECTED" });
  }, [state.activeWallet, getAdapter]);

  const signTransaction = useCallback(
    async (xdr: string, opts?: { networkPassphrase?: string }): Promise<string> => {
      if (!state.activeWallet) throw new Error("No active wallet. Call connect() first.");
      const adapter = getAdapter(state.activeWallet);
      const networkPassphrase =
        opts?.networkPassphrase ?? resolvedNetworkPassphrase;

      dispatch({ type: "SIGNING_TX", payload: true });
      try {
        return await adapter.signTransaction(
          xdr,
          networkPassphrase ? { networkPassphrase } : undefined,
        );
      } finally {
        dispatch({ type: "SIGNING_TX", payload: false });
      }
    },
    [state.activeWallet, getAdapter, resolvedNetworkPassphrase],
  );

  const signMessage = useCallback(
    async (
      message: string,
      opts?: { accountToSign?: string },
    ): Promise<string> => {
      if (!state.activeWallet) throw new Error("No active wallet. Call connect() first.");
      const adapter = getAdapter(state.activeWallet);
      if (!adapter.signMessage) {
        throw new Error(
          `"${state.activeWallet}" does not support message signing. ` +
            `Check activeWalletInfo.meta.supportsSignMessage before calling signMessage().`,
        );
      }
      dispatch({ type: "SIGNING_MSG", payload: true });
      try {
        return await adapter.signMessage(message, opts);
      } finally {
        dispatch({ type: "SIGNING_MSG", payload: false });
      }
    },
    [state.activeWallet, getAdapter],
  );

  const signAuthEntry = useCallback(
    async (entryPreimageXdr: string): Promise<string> => {
      if (!state.activeWallet) throw new Error("No active wallet. Call connect() first.");
      const adapter = getAdapter(state.activeWallet);
      if (!adapter.signAuthEntry) {
        throw new Error(
          `"${state.activeWallet}" does not support auth entry signing. ` +
            `Check activeWalletInfo.meta.supportsSignAuthEntry before calling signAuthEntry().`,
        );
      }
      dispatch({ type: "SIGNING_ENTRY", payload: true });
      try {
        return await adapter.signAuthEntry(entryPreimageXdr);
      } finally {
        dispatch({ type: "SIGNING_ENTRY", payload: false });
      }
    },
    [state.activeWallet, getAdapter],
  );

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────────────

  const isConnected = state.publicKey !== null;

  const activeWalletInfo = useMemo<WalletInfo | null>(() => {
    if (!state.activeWallet) return null;
    return wallets.find((w) => w.id === state.activeWallet) ?? null;
  }, [state.activeWallet, wallets]);

  // Sorted wallets: installed first, then by display name
  const sortedWallets = useMemo<WalletInfo[]>(
    () =>
      [...wallets].sort((a, b) => {
        if (a.isInstalled !== b.isInstalled) return a.isInstalled ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [wallets],
  );

  return useMemo(
    () => ({
      wallets: sortedWallets,
      availableWallets: state.availableWallets,
      activeWallet: state.activeWallet,
      activeWalletInfo,
      publicKey: state.publicKey,
      isConnected,
      isLoading: state.isLoading,
      isConnecting: state.isConnecting,
      isSigningTransaction: state.isSigningTransaction,
      isSigningMessage: state.isSigningMessage,
      isSigningAuthEntry: state.isSigningAuthEntry,
      error: state.error,
      setActiveWallet,
      connect,
      disconnect,
      signTransaction,
      signMessage,
      signAuthEntry,
      clearError,
    }),
    [
      sortedWallets,
      state,
      isConnected,
      activeWalletInfo,
      setActiveWallet,
      connect,
      disconnect,
      signTransaction,
      signMessage,
      signAuthEntry,
      clearError,
    ],
  );
}
