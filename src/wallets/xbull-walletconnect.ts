/**
 * @file xbull-walletconnect.ts
 * @description xBull WalletConnect adapter for stellar-hooks.
 *
 * xBull supports WalletConnect v2 via their backend service for mobile wallet
 * integration. This adapter wraps @walletconnect/sign-client to provide
 * mobile wallet connection.
 *
 * Requires @walletconnect/sign-client as a peer dependency.
 */
import type { WalletAdapter } from "./types";
import { UserRejectedError, isUserRejectionMessage } from "./../utils/errors";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WCSession {
  topic: string;
  namespaces: Record<string, { accounts: string[]; methods: string[]; events: string[] }>;
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Extracts Stellar public key from WalletConnect session.
 * CAIP-10 format: "stellar:pubnet:GPUBKEY..." or "stellar:testnet:GTEST..."
 */
function extractPublicKey(session: WCSession, chain: "stellar:pubnet" | "stellar:testnet"): string | null {
  const accounts = session.namespaces?.stellar?.accounts ?? [];
  const match = accounts.find((a: string) => a.startsWith(chain));
  if (!match) return null;
  const parts = match.split(":");
  return parts.length >= 3 ? parts[2] : null;
}

// ─── Adapter Factory ────────────────────────────────────────────────────────

/**
 * Creates a WalletAdapter for xBull WalletConnect integration.
 *
 * @example
 * ```ts
 * import { createXBullWalletConnectAdapter } from "stellar-hooks/wallets";
 *
 * const adapter = createXBullWalletConnectAdapter({
 *   projectId: "YOUR_WALLETCONNECT_PROJECT_ID",
 * });
 * ```
 */
export function createXBullWalletConnectAdapter(options: {
  projectId: string;
  relayUrl?: string;
}): WalletAdapter {
  let _client: any | null = null;
  let _session: WCSession | null = null;

  return {
    id: "xbull-wc",
    name: "xBull (WalletConnect)",
    meta: {
      name: "xBull",
      description: "Connect with xBull via WalletConnect for mobile support.",
      iconUrl: "https://xbull.app/assets/imgs/logo/logo.svg",
      installUrl: "https://xbull.app",
      supportsSignMessage: true,
      supportsSignAuthEntry: true,
    },

    isInstalled(): boolean {
      // Always return true since WC is available via the web interface
      // The user needs to have a wallet (xBull, Freighter, etc.) connected
      return typeof window !== "undefined" && typeof document !== "undefined";
    },

    async connect(): Promise<string> {
      // Dynamically import SignClient to avoid hard dependency
      const SignClient = (await import("@walletconnect/sign-client")).default;

      if (!_client) {
        _client = await SignClient.init({
          projectId: options.projectId,
          relayUrl: options.relayUrl ?? "wss://relay.walletconnect.com",
          metadata: {
            name: "xBull WalletConnect",
            description: "Stellar WalletConnect integration via xBull",
            url: "https://xbull.app",
            icons: ["https://xbull.app/assets/imgs/logo/logo.svg"],
          },
        });
      }

      // Try to restore existing session
      const sessions = _client.session.getAll();
      for (const session of sessions) {
        const wcSession = session as WCSession;
        if (wcSession.namespaces?.stellar?.accounts?.length) {
          _session = wcSession;
          const pk = extractPublicKey(wcSession, "stellar:pubnet") ?? extractPublicKey(wcSession, "stellar:testnet");
          if (pk) return pk;
        }
      }

      // Create new session
      const { uri, approval } = await _client.connect({
        requiredNamespaces: {
          stellar: {
            methods: ["stellar_signTransaction", "stellar_signMessage", "stellar_signAuthEntry"],
            chains: ["stellar:pubnet", "stellar:testnet"],
            events: [],
          },
        },
      });

      // If we have a URI, it means we're in a QR code flow
      // The actual connection happens via approval()
      if (uri) {
        // For now, we'll proceed with approval
        // In a real UI, the user would scan the QR code
        _session = await approval();
      }

      if (!_session) {
        throw new Error("Failed to establish WalletConnect session");
      }

      // Extract public key from session
      const pk = extractPublicKey(_session, "stellar:pubnet") ?? extractPublicKey(_session, "stellar:testnet");
      if (!pk) {
        throw new Error("No Stellar address returned in WalletConnect session");
      }

      return pk;
    },

    disconnect(): void {
      if (_client && _session) {
        void _client.disconnect({
          topic: _session.topic,
          reason: { code: 6000, message: "User disconnected" },
        });
      }
      _session = null;
    },

    async signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string> {
      if (!_client || !_session) {
        throw new Error("WalletConnect session not active. Call connect() first.");
      }

      try {
        const result = await _client.request<{ signedXDR: string }>({
          topic: _session.topic,
          chainId: "stellar:testnet", // Default to testnet, use opts.networkPassphrase to determine
          request: {
            method: "stellar_signTransaction",
            params: {
              xdr,
              networkPassphrase: opts?.networkPassphrase ?? "Test SDF Network ; September 2015",
            },
          },
        });

        return result.signedXDR;
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        if (isUserRejectionMessage(msg)) {
          throw new UserRejectedError(msg, {
            cause: err,
            walletId: "xbull-wc",
            operation: "signTransaction",
          });
        }
        throw err;
      }
    },

    async signMessage(message: string, opts?: { accountToSign?: string }): Promise<string> {
      if (!_client || !_session) {
        throw new Error("WalletConnect session not active. Call connect() first.");
      }

      try {
        const result = await _client.request<{ signedMessage: string }>({
          topic: _session.topic,
          chainId: "stellar:testnet",
          request: {
            method: "stellar_signMessage",
            params: {
              message,
              ...(opts?.accountToSign && { pubkey: opts.accountToSign }),
            },
          },
        });

        return result.signedMessage;
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        if (isUserRejectionMessage(msg)) {
          throw new UserRejectedError(msg, {
            cause: err,
            walletId: "xbull-wc",
            operation: "signMessage",
          });
        }
        throw err;
      }
    },

    async signAuthEntry(entryPreimageXdr: string): Promise<string> {
      if (!_client || !_session) {
        throw new Error("WalletConnect session not active. Call connect() first.");
      }

      try {
        const result = await _client.request<{ signedAuthEntry: string }>({
          topic: _session.topic,
          chainId: "stellar:testnet",
          request: {
            method: "stellar_signAuthEntry",
            params: {
              entryPreimageXdr,
            },
          },
        });

        return result.signedAuthEntry;
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        if (isUserRejectionMessage(msg)) {
          throw new UserRejectedError(msg, {
            cause: err,
            walletId: "xbull-wc",
            operation: "signAuthEntry",
          });
        }
        throw err;
      }
    },
  };
}
