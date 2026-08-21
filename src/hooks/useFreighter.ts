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
 * This is a thin wrapper that maintains backwards compatibility while internally
 * using the Freighter adapter pattern. For new code, consider using `useWallet`
 * with the `walletId: "freighter"` option for a unified multi-wallet interface.
 *
 * @example
 * ```tsx
 * const { isConnected, publicKey, connect } = useFreighter();
 *
 * if (!isConnected) return <button onClick={connect}>Connect</button>;
 * return <p>Connected: {publicKey}</p>;
 * ```
 */
export function useFreighter(options?: UseFreighterOptions): UseFreighterReturn {
  const [state, setState] = useState<Omit<FreighterState, "networkPassphraseMismatch" | "networkPassphraseWarning">>({
    isInstalled: false,
    isConnected: false,
    publicKey: null,
    network: null,
    networkPassphrase: null,
    isLoading: true,
    error: null,
  });
  const [isSigningMessage, setIsSigningMessage] = useState(false);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const stellarContext = useOptionalStellarContext();
  const expectedNetworkPassphrase =
    options?.expectedNetworkPassphrase ?? stellarContext?.config.networkPassphrase ?? null;
  const autoConnect = options?.autoConnect ?? false;

  const networkPassphraseMismatch = useMemo(
    () =>
      getNetworkPassphraseMismatch(
        state.isConnected,
        state.networkPassphrase,
        expectedNetworkPassphrase,
      ),
    [state.isConnected, state.networkPassphrase, expectedNetworkPassphrase],
  );

  const networkPassphraseWarning = useMemo(() => {
    if (!networkPassphraseMismatch || !expectedNetworkPassphrase) return null;
    return buildNetworkPassphraseWarning(state.network, expectedNetworkPassphrase);
  }, [networkPassphraseMismatch, expectedNetworkPassphrase, state.network]);

  useEffect(() => {
    let cancelled = false;

    async function probe() {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const { isConnected: connected, error: connErr } = await normalizeIsConnected();
        if (cancelled) return;

        if (connErr || !connected) {
          setState({ isInstalled: false, isConnected: false, publicKey: null, network: null, networkPassphrase: null, isLoading: false, error: null });
          return;
        }

        const { address, error: addrErr } = await normalizeGetAddress();
        if (cancelled) return;

        if (!addrErr && address) {
          const networkDetails = await normalizeGetNetworkDetails();
          if (cancelled) return;
          setState({
            isInstalled: true,
            isConnected: true,
            publicKey: asPublicKey(address),
            network: networkDetails.network ?? "",
            networkPassphrase: networkDetails.networkPassphrase ?? "",
            isLoading: false,
            error: null,
          });
        } else if (autoConnect) {
          setIsAutoConnecting(true);
          try {
            const { isAllowed: allowed } = await isAllowed();
            if (cancelled) return;

            if (allowed) {
              const { address: reconAddress, error: reconErr } = await normalizeRequestAccess();
              if (cancelled) return;

              if (!reconErr && reconAddress) {
                const networkDetails = await normalizeGetNetworkDetails();
                if (cancelled) return;
                setState({
                  isInstalled: true,
                  isConnected: true,
                  publicKey: asPublicKey(reconAddress),
                  network: networkDetails.network ?? "",
                  networkPassphrase: networkDetails.networkPassphrase ?? "",
                  isLoading: false,
                  error: null,
                });
              } else {
                setState({ isInstalled: true, isConnected: false, publicKey: null, network: null, networkPassphrase: null, isLoading: false, error: null });
              }
            } else {
              setState({ isInstalled: true, isConnected: false, publicKey: null, network: null, networkPassphrase: null, isLoading: false, error: null });
            }
          } finally {
            if (!cancelled) setIsAutoConnecting(false);
          }
        } else {
          setState({ isInstalled: true, isConnected: false, publicKey: null, network: null, networkPassphrase: null, isLoading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: err instanceof Error ? err : new Error(String(err)),
          }));
        }
      }
    }

    void probe();
    return () => { cancelled = true; };
  }, [autoConnect]);

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const { address, error } = await normalizeRequestAccess();
      if (error) {
        setState((prev) => ({ ...prev, isLoading: false, error }));
        return;
      }
      if (!address) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: new Error("Failed to get address"),
        }));
        return;
      }

      const networkDetails = await normalizeGetNetworkDetails();
      setState({
        isInstalled: true,
        isConnected: true,
        publicKey: asPublicKey(address),
        network: networkDetails.network ?? "",
        networkPassphrase: networkDetails.networkPassphrase ?? "",
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({ isInstalled: true, isConnected: false, publicKey: null, network: null, networkPassphrase: null, isLoading: false, error: null });
  }, []);

  const signTx = useCallback(
    async (xdr: StellarXdrString, opts?: SignTransactionOptions): Promise<StellarXdrString> => {
      const { signedTxXdr, error } = await signTransaction(xdr, {
        ...(opts?.networkPassphrase && { networkPassphrase: opts.networkPassphrase }),
        ...(opts?.address && { address: opts.address }),
      });
      if (error) {
        throw isUserRejectionMessage(error.message)
          ? new UserRejectedError(error.message, { cause: error, walletId: "freighter", operation: "signTransaction" })
          : new Error(error.message);
      }
      return unsafeAsXdrString(signedTxXdr);
    },
    []
  );

  const signEntry = useCallback(
    async (entryPreimageXdr: StellarXdrString): Promise<StellarXdrString> => {
      const publicKey = state.publicKey;
      if (!publicKey) throw new Error("Wallet not connected");
      const { signedAuthEntry, error } = await signAuthEntry(entryPreimageXdr, {
        address: publicKey,
      });
      if (error) {
        throw isUserRejectionMessage(error.message)
          ? new UserRejectedError(error.message, { cause: error, walletId: "freighter", operation: "signAuthEntry" })
          : new Error(error.message);
      }
      if (!signedAuthEntry) throw new Error("No signed auth entry returned");
      return unsafeAsXdrString(signedAuthEntry);
    },
    [state.publicKey]
  );

  const signBlob = useCallback(
    async (blob: string, opts?: { accountToSign?: string }): Promise<string> => {
      const address = opts?.accountToSign ?? state.publicKey;
      if (!address) throw new Error("Wallet not connected");
      const { signedMessage: signed, error } = await signMessage(blob, { address });
      if (error) {
        throw isUserRejectionMessage(error.message)
          ? new UserRejectedError(error.message, { cause: error, walletId: "freighter", operation: "signBlob" })
          : new Error(error.message);
      }
      if (!signed) throw new Error("No signed message returned");
      return signed.toString();
    },
    [state.publicKey]
  );

  const signMsg = useCallback(
    async (message: string, opts?: { accountToSign?: string }): Promise<string> => {
      const address = opts?.accountToSign ?? state.publicKey;
      if (!address) throw new Error("Wallet not connected");
      setIsSigningMessage(true);
      try {
        const { signedMessage: signed, error } = await signMessage(message, { address });
        if (error) {
          throw isUserRejectionMessage(error.message)
            ? new UserRejectedError(error.message, { cause: error, walletId: "freighter", operation: "signMessage" })
            : new Error(error.message);
        }
        if (!signed) throw new Error("No signed message returned");
        return signed.toString();
      } finally {
        setIsSigningMessage(false);
      }
    },
    [state.publicKey]
  );

  return useMemo(
    () => ({
      ...state,
      networkPassphraseMismatch,
      networkPassphraseWarning,
      isSigningMessage,
      isAutoConnecting,
      connect,
      disconnect,
      signTransaction: signTx,
      signAuthEntry: signEntry,
      signBlob,
      signMessage: signMsg,
    }),
    [state, networkPassphraseMismatch, networkPassphraseWarning, isSigningMessage, isAutoConnecting, connect, disconnect, signTx, signEntry, signBlob, signMsg]
  );
}
