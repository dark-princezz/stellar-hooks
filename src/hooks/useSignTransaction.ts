/**
 * @file useSignTransaction.ts
 * @description Hook wrapping the wallet transaction-signing flow behind one API.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useState } from "react";
import { useWallet } from "./useWallet";
import { asPublicKey, type StellarPublicKey } from "../types";
import type { WalletId } from "../wallets/types";
import { StellarHookError } from "../utils/errors";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseSignTransactionOptions {
  /** Pre-select a wallet to sign with (e.g. `"freighter"`, `"albedo"`). */
  walletId?: WalletId;
  /** Silently restore the last-used wallet on mount. Default: `false`. */
  autoConnect?: boolean;
}

export interface UseSignTransactionReturn {
  /**
   * Sign a Stellar transaction XDR with the active wallet. The wallet type is
   * selected via `setActiveWallet`/`connect`, so consumers never branch on the
   * wallet implementation themselves.
   */
  signTransaction: (
    xdr: string,
    opts?: { networkPassphrase?: string; address?: string }
  ) => Promise<string>;
  /** `true` while a signature request is in flight. */
  isSigning: boolean;
  /** Most recent signing error, or `null`. */
  error: Error | null;
  /** Active wallet public key, or `null` when not connected. */
  publicKey: StellarPublicKey | null;
  /** Whether a wallet is currently connected. */
  isConnected: boolean;
  /** Available installed wallets. */
  availableWallets: WalletId[];
  /** The currently active wallet, or `null`. */
  activeWallet: WalletId | null;
  /** Prompt to select/connect a wallet. Resolves with its public key. */
  connect: (walletId?: WalletId) => Promise<StellarPublicKey | null>;
  /** Switch the active wallet without re-prompting. */
  setActiveWallet: (id: WalletId) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Wrap the wallet transaction-signing flow behind a single hook that returns
 * `{ signTransaction, isSigning, error }`, so consumers don't need to branch on
 * wallet type (Freighter, Albedo, etc.).
 *
 * @example
 * ```tsx
 * const { signTransaction, isSigning, error, connect, isConnected, publicKey } =
 *   useSignTransaction({ walletId: "freighter" });
 *
 * // Let the user pick a wallet, then sign:
 * await connect("albedo");
 * const signedXdr = await signTransaction(builtXdr, { networkPassphrase });
 * ```
 */
export function useSignTransaction(
  options: UseSignTransactionOptions = {},
): UseSignTransactionReturn {
  const { walletId, autoConnect = false } = options;

  const wallet = useWallet({
    autoConnect,
    ...(walletId !== undefined && { walletId }),
  });
  const [isSigning, setIsSigning] = useState(false);

  const signTransaction = useCallback(
    async (
      xdr: string,
      opts?: { networkPassphrase?: string; address?: string }
    ): Promise<string> => {
      setIsSigning(true);
      try {
        return await wallet.signTransaction(xdr, opts);
      } catch (err) {
        throw StellarHookError.from(err, "Failed to sign transaction");
      } finally {
        setIsSigning(false);
      }
    },
    // `wallet.signTransaction` is stable (useWallet returns a memoized object).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wallet.signTransaction],
  );

  const connect = useCallback(
    async (id?: WalletId): Promise<StellarPublicKey | null> => {
      const key = await wallet.connect(id);
      return key ? asPublicKey(key) : null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wallet.connect],
  );

  return {
    signTransaction,
    isSigning,
    error: wallet.error,
    publicKey: wallet.publicKey,
    isConnected: wallet.isConnected,
    availableWallets: wallet.availableWallets,
    activeWallet: wallet.activeWallet,
    connect,
    setActiveWallet: wallet.setActiveWallet,
  };
}
