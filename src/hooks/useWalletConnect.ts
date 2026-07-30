/**
 * @file useWalletConnect.ts
 * @description WalletConnect v2 adapter for Stellar / Freighter Mobile.
 * Uses @walletconnect/sign-client (peer dep) directly so apps get full control
 * over QR-code display, session lifecycle, and Stellar-specific signing.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import SignClient from "@walletconnect/sign-client";
import { useStellarContext } from "../context";
import type {
  WalletConnectOptions,
  WalletConnectState,
  UseWalletConnectReturn,
  WalletConnectChain,
} from "../types";

// ─── Stellar WalletConnect namespace constants ────────────────────────────────

const STELLAR_METHODS = [
  "stellar_signTransaction",
  "stellar_signAuthEntry",
] as const;

const STELLAR_EVENTS = [] as const;

// Minimal inline type — avoids a hard dep on @walletconnect/types
interface WCSession {
  topic: string;
  namespaces: Record<string, { accounts: string[]; methods: string[]; events: string[] }>;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "CONNECTING" }
  | { type: "URI_READY"; uri: string }
  | { type: "CONNECTED"; publicKey: string }
  | { type: "DISCONNECTED" }
  | { type: "ERROR"; payload: Error };

function reducer(state: WalletConnectState, action: Action): WalletConnectState {
  switch (action.type) {
    case "CONNECTING":
      return { ...state, isConnecting: true, uri: null, error: null };
    case "URI_READY":
      return { ...state, uri: action.uri };
    case "CONNECTED":
      return { publicKey: action.publicKey, isConnected: true, isConnecting: false, uri: null, error: null };
    case "DISCONNECTED":
      return { publicKey: null, isConnected: false, isConnecting: false, uri: null, error: null };
    case "ERROR":
      return { ...state, isConnecting: false, error: action.payload };
    default:
      return state;
  }
}

const initial: WalletConnectState = {
  publicKey: null,
  isConnected: false,
  isConnecting: false,
  uri: null,
  error: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractPublicKey(session: WCSession, chain: WalletConnectChain): string | null {
  const accounts = session.namespaces?.stellar?.accounts ?? [];
  // CAIP-10 format: "stellar:pubnet:GPUBKEY..."
  const match = accounts.find((a: string) => a.startsWith(chain));
  if (!match) return null;
  return match.split(":")[2] ?? null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * WalletConnect v2 adapter for Stellar. Enables mobile wallet support
 * (Freighter Mobile, LOBSTR, xBull Mobile, etc.) via QR code / deep-link.
 *
 * Requires `@walletconnect/sign-client` as a peer dependency.
 *
 * @example
 * ```tsx
 * const { connect, isConnecting, uri, isConnected, publicKey, signTransaction } =
 *   useWalletConnect({
 *     projectId: "YOUR_REOWN_PROJECT_ID",
 *     metadata: { name: "My dApp", description: "...", url: "https://...", icons: [] },
 *   });
 *
 * if (isConnecting && uri) return <QRCode value={uri} />;
 * if (!isConnected) return <button onClick={connect}>Connect Mobile Wallet</button>;
 * return <p>{publicKey}</p>;
 * ```
 */
export function useWalletConnect(options: WalletConnectOptions): UseWalletConnectReturn {
  const { config } = useStellarContext();
  const chain: WalletConnectChain = options.chain ??
    (config.network === "mainnet" ? "stellar:pubnet" : "stellar:testnet");

  const [state, dispatch] = useReducer(reducer, initial);
  const clientRef = useRef<InstanceType<typeof SignClient> | null>(null);
  const sessionRef = useRef<WCSession | null>(null);

  // Initialise SignClient once and try to restore a persisted session
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const client = await SignClient.init({
        projectId: options.projectId,
        relayUrl: options.relayUrl ?? "wss://relay.walletconnect.com",
        metadata: options.metadata,
      });

      if (cancelled) return;
      clientRef.current = client;

      // Restore persisted session
      const sessions = client.session.getAll();
      const existing = sessions.find((s: WCSession) =>
        s.namespaces?.stellar?.accounts?.some((a: string) => a.startsWith(chain))
      );
      if (existing) {
        sessionRef.current = existing;
        const pk = extractPublicKey(existing, chain);
        if (pk) dispatch({ type: "CONNECTED", publicKey: pk });
      }

      // Listen for remote disconnects
      client.on("session_delete", () => {
        sessionRef.current = null;
        dispatch({ type: "DISCONNECTED" });
      });
    }

    void init().catch((err) =>
      dispatch({ type: "ERROR", payload: err instanceof Error ? err : new Error(String(err)) })
    );

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = useCallback(async (): Promise<string | null> => {
    const client = clientRef.current;
    if (!client) {
      dispatch({ type: "ERROR", payload: new Error("WalletConnect client not initialised") });
      return null;
    }

    dispatch({ type: "CONNECTING" });
    try {
      const { uri, approval } = await client.connect({
        requiredNamespaces: {
          stellar: {
            methods: [...STELLAR_METHODS],
            chains: [chain],
            events: [...STELLAR_EVENTS],
          },
        },
      });

      if (uri) dispatch({ type: "URI_READY", uri });

      const session = await approval();
      sessionRef.current = session;

      const pk = extractPublicKey(session, chain);
      if (!pk) throw new Error("No Stellar address returned in session");

      dispatch({ type: "CONNECTED", publicKey: pk });
      return pk;
    } catch (err) {
      dispatch({ type: "ERROR", payload: err instanceof Error ? err : new Error(String(err)) });
      return null;
    }
  }, [chain]);

  const disconnect = useCallback(async () => {
    const client = clientRef.current;
    const session = sessionRef.current;
    if (client && session) {
      try {
        await client.disconnect({
          topic: session.topic,
          reason: { code: 6000, message: "User disconnected" },
        });
      } catch {
        // ignore if session is already gone
      }
      sessionRef.current = null;
    }
    dispatch({ type: "DISCONNECTED" });
  }, []);

  const signTransaction = useCallback(
    async (xdr: string, opts?: { networkPassphrase?: string }): Promise<string> => {
      const client = clientRef.current;
      const session = sessionRef.current;
      if (!client || !session) throw new Error("WalletConnect session not active");

      const result = await client.request<{ signedXDR: string }>({
        topic: session.topic,
        chainId: chain,
        request: {
          method: "stellar_signTransaction",
          params: {
            xdr,
            networkPassphrase: opts?.networkPassphrase ?? config.networkPassphrase,
          },
        },
      });

      return result.signedXDR;
    },
    [chain, config.networkPassphrase]
  );

  return { ...state, connect, disconnect, signTransaction };
}
