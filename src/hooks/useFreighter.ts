import { useCallback, useEffect, useMemo, useState } from "react";
import {
  isAllowed,
  signTransaction,
  signAuthEntry,
  signMessage,
} from "@stellar/freighter-api";
import { useOptionalStellarContext } from "../context";
import {
  normalizeGetAddress,
  normalizeGetNetworkDetails,
  normalizeIsConnected,
  normalizeRequestAccess,
} from "../wallets/freighter-normalization";
import type {
  FreighterState,
  SignTransactionOptions,
  UseFreighterOptions,
  UseFreighterReturn,
} from "../types";
import { asPublicKey, unsafeAsXdrString, type StellarXdrString } from "../types";
import { UserRejectedError, isUserRejectionMessage } from "../utils/errors";

// ─── Network mismatch helpers ─────────────────────────────────────────────────

function buildNetworkPassphraseWarning(
  walletNetwork: string | null,
  expectedPassphrase: string,
): string {
  const networkLabel = walletNetwork ?? "a different network";
  return (
    `Freighter is connected to ${networkLabel}, which does not match this app's ` +
    `configured network (${expectedPassphrase}). Switch the network in Freighter or ` +
    `update your StellarProvider configuration to avoid signing on the wrong network.`
  );
}

function getNetworkPassphraseMismatch(
  isConnected: boolean,
  walletPassphrase: string | null,
  expectedPassphrase: string | null,
): boolean {
  return Boolean(
    isConnected &&
      walletPassphrase &&
      expectedPassphrase &&
      walletPassphrase !== expectedPassphrase
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Connect to and interact with the Freighter browser wallet.
 *
 * This hook provides access to the Freighter wallet extension for Stellar dApps.
 * It handles connection detection, wallet connection/disconnection, and signing
 * operations (transactions, auth entries, and messages).
 *
 * This is a thin wrapper that maintains backwards compatibility while internally
 * using the Freighter adapter pattern. For new code, consider using `useWallet`
 * with the `walletId: "freighter"` option for a unified multi-wallet interface.
 *
 * @param options - Optional configuration for the hook
 * @param options.autoConnect - If true, automatically reconnects users who previously granted access (default: false)
 * @param options.expectedNetworkPassphrase - Expected network passphrase for mismatch detection (defaults to StellarProvider config)
 *
 * @returns Object containing Freighter wallet state and methods
 * @returns {boolean} returns.isInstalled - Whether Freighter extension is installed
 * @returns {boolean} returns.isConnected - Whether user has granted access to the wallet
 * @returns {string|null} returns.publicKey - Connected wallet's public key (G...)
 * @returns {string|null} returns.network - Network name from Freighter (e.g., "TESTNET")
 * @returns {string|null} returns.networkPassphrase - Network passphrase from Freighter
 * @returns {boolean} returns.networkPassphraseMismatch - True when wallet network differs from expected network
 * @returns {string|null} returns.networkPassphraseWarning - Warning message when networks mismatch
 * @returns {boolean} returns.isLoading - True during initial connection detection
 * @returns {boolean} returns.isSigningMessage - True while signMessage() is in flight
 * @returns {boolean} returns.isAutoConnecting - True while auto-connect silent check runs
 * @returns {Error|null} returns.error - Any error that occurred during wallet operations
 * @returns {function} returns.connect - Request wallet connection and grant access
 * @returns {function} returns.disconnect - Disconnect wallet (clears local state only)
 * @returns {function} returns.signTransaction - Sign a Stellar transaction XDR
 * @returns {function} returns.signAuthEntry - Sign a Soroban auth entry XDR
 * @returns {function} returns.signBlob - Sign arbitrary data (wraps signMessage)
 * @returns {function} returns.signMessage - Sign a text message for authentication
 *
 * @example
 * ```tsx
 * const { isConnected, publicKey, connect } = useFreighter();
 *
 * if (!isConnected) return <button onClick={connect}>Connect</button>;
 * return <p>Connected: {publicKey}</p>;
 * ```
 *
 * @example
 * ```tsx
 * // Auto-connect returning users
 * const { isConnected, publicKey, isAutoConnecting } = useFreighter({
 *   autoConnect: true,
 * });
 *
 * if (isAutoConnecting) return <p>Reconnecting…</p>;
 * if (isConnected) return <p>Welcome back, {publicKey}</p>;
 * ```
 *
 * @example
 * ```tsx
 * // Network mismatch detection
 * const { networkPassphraseMismatch, networkPassphraseWarning } = useFreighter({
 *   expectedNetworkPassphrase: "Test SDF Network ; September 2015",
 * });
 *
 * if (networkPassphraseMismatch) {
 *   return <div style={{ color: 'red' }}>{networkPassphraseWarning}</div>;
 * }
 * ```
 */
export function useFreighter(options?: UseFreighterOptions): UseFreighterReturn {