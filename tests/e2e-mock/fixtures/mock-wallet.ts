/**
 * Mocked Freighter wallet for end-to-end tests (#1200).
 *
 * `@stellar/freighter-api` talks to the extension by posting `FREIGHTER_EXTERNAL_MSG_REQUEST` messages on
 * `window` and waiting for a `FREIGHTER_EXTERNAL_MSG_RESPONSE`. This harness answers those messages from the page
 * itself, so a test can connect and sign without a browser extension. Keys and signing stay in the Node test
 * process (exposed to the page through one function), so the page never holds a secret.
 *
 *   const wallet = await installMockWallet(page);            // before page.goto
 *   await page.goto("/");
 *   wallet.rejectNext("signTransaction");                    // simulate the user pressing Reject
 *   expect(wallet.calls.map((c) => c.type)).toContain("REQUEST_ACCESS");
 *
 * The request/response names live in `HANDLERS` below; they follow the Freighter external message protocol as used by
 * `@stellar/freighter-api` and are the one place to change if a new API version renames them.
 */
import { Keypair, Networks, TransactionBuilder } from "@stellar/stellar-sdk";
import { createHash } from "node:crypto";
import type { Page } from "@playwright/test";

export type MockWalletOperation = "requestAccess" | "signTransaction" | "signMessage" | "signAuthEntry";

export interface MockWalletOptions {
  /** Secret key (`S...`) to sign with. A random key is used when omitted. */
  secret?: string;
  network?: string;
  networkPassphrase?: string;
  horizonUrl?: string;
  sorobanRpcUrl?: string;
  /** Start disconnected-but-installed (default) or already allowed. */
  allowed?: boolean;
}

export interface MockWalletCall {
  type: string;
  at: number;
}

const MESSAGE_PREFIX = "Stellar Signed Message:\n";

export class MockWallet {
  readonly keypair: Keypair;
  readonly network: string;
  readonly networkPassphrase: string;
  readonly horizonUrl: string;
  readonly sorobanRpcUrl: string;
  allowed: boolean;
  readonly calls: MockWalletCall[] = [];
  private readonly rejections = new Set<MockWalletOperation>();

  constructor(options: MockWalletOptions = {}) {
    this.keypair = options.secret ? Keypair.fromSecret(options.secret) : Keypair.random();
    this.network = options.network ?? "TESTNET";
    this.networkPassphrase = options.networkPassphrase ?? Networks.TESTNET;
    this.horizonUrl = options.horizonUrl ?? "https://horizon-testnet.stellar.org";
    this.sorobanRpcUrl = options.sorobanRpcUrl ?? "https://soroban-testnet.stellar.org";
    this.allowed = options.allowed ?? false;
  }

  get publicKey(): string {
    return this.keypair.publicKey();
  }

  /** The next call of this kind fails as if the user pressed Reject. */
  rejectNext(operation: MockWalletOperation): void {
    this.rejections.add(operation);
  }

  consumeRejection(operation: MockWalletOperation): boolean {
    return this.rejections.delete(operation);
  }

  signTransaction(xdr: string, networkPassphrase?: string): string {
    const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase ?? this.networkPassphrase);
    tx.sign(this.keypair);
    return tx.toXDR();
  }

  /** SEP-53 style: sign sha256("Stellar Signed Message:\n" + message), base64 encoded. */
  signMessage(message: string): string {
    const digest = createHash("sha256").update(MESSAGE_PREFIX + message).digest();
    return this.keypair.sign(digest).toString("base64");
  }

  /** Handles one request from the page and returns the response body (without the envelope fields). */
  handle(type: string, payload: Record<string, unknown> = {}): Record<string, unknown> {
    this.calls.push({ type, at: Date.now() });
    const handler = HANDLERS[type];
    if (!handler) return { error: `MockWallet: unsupported request ${type}` };
    return handler(this, payload);
  }
}

const rejected = (message = "The user rejected this request.") => ({ apiError: { code: -4, message }, error: message });

const HANDLERS: Record<string, (w: MockWallet, p: Record<string, unknown>) => Record<string, unknown>> = {
  REQUEST_CONNECTION_STATUS: () => ({ isConnected: true }),
  REQUEST_ALLOWED_STATUS: (w) => ({ isAllowed: w.allowed }),
  SET_ALLOWED_STATUS: (w) => {
    w.allowed = true;
    return { isAllowed: true };
  },
  REQUEST_ACCESS: (w) => {
    if (w.consumeRejection("requestAccess")) return rejected();
    w.allowed = true;
    return { publicKey: w.publicKey };
  },
  REQUEST_PUBLIC_KEY: (w) => (w.allowed ? { publicKey: w.publicKey } : { publicKey: "" }),
  REQUEST_NETWORK: (w) => ({ network: w.network, networkPassphrase: w.networkPassphrase }),
  REQUEST_NETWORK_DETAILS: (w) => ({
    networkDetails: {
      network: w.network,
      networkName: w.network,
      networkUrl: w.horizonUrl,
      networkPassphrase: w.networkPassphrase,
      sorobanRpcUrl: w.sorobanRpcUrl,
    },
  }),
  SUBMIT_TRANSACTION: (w, p) => {
    if (w.consumeRejection("signTransaction")) return rejected();
    const xdr = String(p.transactionXdr ?? p.transaction ?? "");
    const passphrase = typeof p.networkPassphrase === "string" ? p.networkPassphrase : undefined;
    return { signedTransaction: w.signTransaction(xdr, passphrase), signerAddress: w.publicKey };
  },
  SUBMIT_BLOB: (w, p) => {
    if (w.consumeRejection("signMessage")) return rejected();
    return { signedMessage: w.signMessage(String(p.blob ?? p.message ?? "")), signerAddress: w.publicKey };
  },
  SUBMIT_AUTH_ENTRY: (w) => {
    if (w.consumeRejection("signAuthEntry")) return rejected();
    return { error: "MockWallet: signAuthEntry is not implemented" };
  },
};

/**
 * Installs the mock on `page`. Call before `page.goto`. The page gets `window.freighter = true` (for the extension
 * detection some versions use) and a listener that answers Freighter messages through the Node-side wallet.
 */
export async function installMockWallet(page: Page, options: MockWalletOptions = {}): Promise<MockWallet> {
  const wallet = new MockWallet(options);

  await page.exposeFunction("__mockWalletRequest", (type: string, payload: Record<string, unknown>) =>
    wallet.handle(type, payload),
  );

  await page.addInitScript(() => {
    const REQUEST = "FREIGHTER_EXTERNAL_MSG_REQUEST";
    const RESPONSE = "FREIGHTER_EXTERNAL_MSG_RESPONSE";
    (window as unknown as { freighter: boolean }).freighter = true;

    window.addEventListener("message", async (event) => {
      if (event.source !== window || !event.data || event.data.source !== REQUEST) return;
      const { messageId, type, source: _source, ...payload } = event.data as Record<string, unknown> & { messageId: number; type: string };
      const body = await (window as unknown as { __mockWalletRequest: (t: string, p: unknown) => Promise<Record<string, unknown>> }).__mockWalletRequest(type, payload);
      // The extension's response uses the (historically misspelled) `messagedId` key; send both spellings.
      window.postMessage({ source: RESPONSE, messageId, messagedId: messageId, ...body }, window.location.origin);
    });
  });

  return wallet;
}

/** Funds a testnet account through Friendbot. Throws when Friendbot refuses. */
export async function fundWithFriendbot(publicKey: string, friendbotUrl = "https://friendbot.stellar.org"): Promise<void> {
  const response = await fetch(`${friendbotUrl}?addr=${encodeURIComponent(publicKey)}`);
  if (!response.ok && response.status !== 400) {
    throw new Error(`Friendbot failed: ${response.status} ${await response.text()}`);
  }
}
