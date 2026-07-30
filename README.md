# stellar-hooks

[![npm version](https://img.shields.io/badge/npm-v0.1.0-blue?style=flat-square)](https://www.npmjs.com/package/stellar-hooks)
[![license](https://img.shields.io/github/license/dark-princezz/stellar-hooks.svg?style=flat-square)](LICENSE)
[![bundle size](https://img.shields.io/badge/bundle%20size-12.5%20KB-blue?style=flat-square)](https://github.com/dark-princezz/stellar-hooks)


> React hooks for Stellar and Soroban. The `wagmi` you've been waiting for.


```bash
npm install stellar-hooks
```

`stellar-hooks` wires the [Stellar JS SDK v13](https://github.com/stellar/js-stellar-sdk) and the Freighter wallet API into a set of ergonomic React hooks so you can build Stellar dApps without copy-pasting the same boilerplate across repos.

---

## Features

- **Freighter Integration**: Seamlessly connect and interact with the Freighter wallet.
- **Horizon Data Fetching**: Easy access to account balances, offers, and more.
- **Soroban Support**: Call smart contracts with built-in simulation and auth handling.
- **Transaction Helpers**: Simplified submission and polling for both classic and Soroban.
- **Modular Adapters**: First-class support for React Query and SWR.
- **Type-Safe**: Written in TypeScript with full type definitions.

---

## Quick start

```tsx
// main.tsx
import { StellarProvider } from "stellar-hooks";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StellarProvider network="testnet">
    <App />
  </StellarProvider>
);
```

```tsx
// App.tsx
import { useFreighter, useStellarBalance } from "stellar-hooks";

export function App() {
  const { isConnected, publicKey, connect } = useFreighter();
  const { xlmBalance } = useStellarBalance(publicKey);

  if (!isConnected) {
    return <button onClick={connect}>Connect Freighter</button>;
  }

  return (
    <p>
      {publicKey} · {xlmBalance?.balance ?? "..."} XLM
    </p>
  );
}
```

---

## Hooks

Every hook listed below is implemented and exported from the package entry point. Hooks with a ↓ link have an expanded reference further down this page.

#### Wallet & connection

| Hook | Description |
|------|-------------|
| [`useFreighter()`](#usefreighter) ↓ | Connect to the [Freighter](https://freighter.app) extension (`@stellar/freighter-api` v6); sign transactions, auth entries, and messages. Supports `signMessage()` and `autoConnect`. |
| `useFreighterAccounts()` | Track previously-seen Freighter addresses in `localStorage`; drive the permission dialog to switch between them. |
| [`useWalletKit()`](#usewalletkit) ↓ | Detect installed Stellar wallets (Freighter, Lobstr, xBull) and expose a unified connect / sign interface. |
| `useWalletsKit()` | Multi-wallet adapter via [`@creit-tech/stellar-wallets-kit`](https://github.com/Creit-Tech/Stellar-Wallets-Kit) (Freighter, xBull, Albedo, Lobstr, WalletConnect, …). |
| `useWalletConnect()` | WalletConnect v2 adapter for Stellar / Freighter Mobile. |
| [`useNetwork()`](#usenetwork) ↓ | Read the active network configuration and switch networks at runtime. |
| [`useStellarNetwork()`](#usestellarnetwork) ↓ | Read the active network and switch networks dynamically via `setNetwork()` — no page reload required. |

#### Account & ledger data (read)

| Hook | Description |
|------|-------------|
| [`useStellarAccount()`](#usestellaraccountpublickey-options) ↓ | Fetch (and optionally poll) a full account from Horizon. |
| `useStellarAccounts()` | Fetch and poll multiple accounts in parallel (no serial waterfall). |
| [`useStellarBalance()`](#usestellarbalancepublickey-options) ↓ | XLM and per-asset balances (wrapper around `useStellarAccount`). |
| `useSorobanTokenBalance()` | Read SAC (Stellar Asset Contract) token balances via Soroban RPC. |
| [`useLedgerEntry()`](#useledgerentryledgerkey-options) ↓ | Read a raw Soroban ledger entry by its `xdr.LedgerKey`. |
| `useOperations()` | Fetch operations for an account or transaction from Horizon. |
| `useEffects()` | Stream account effects from Horizon. |
| `useAssets()` | Fetch and list Stellar assets via Horizon. |
| `useAssetMetadata()` | Fetch asset metadata from a domain's `stellar.toml`. |
| `useStellarToml()` | Fetch and parse a domain's `stellar.toml`. |
| `useStellarOffers()` | Fetch open offers for a Stellar account. |
| `useOfferBook()` | Fetch the DEX order book for an asset pair. |
| `useClaimableBalances()` | List claimable balances for an account. |

#### Payments & operations (write)

| Hook | Description |
|------|-------------|
| [`usePayment()`](#usepaymentoptions) ↓ | Build, sign, and submit a classic XLM / asset payment. |
| `usePathPayment()` | Strict send / receive path payments. |
| [`useTransaction()`](#usetransactionoptions) ↓ | Submit a pre-signed XDR and poll until confirmed (Soroban RPC or classic Horizon). |
| `useTrade()` | Place, modify, and cancel Stellar DEX offers. |
| `useTrustline()` | Add, remove, and modify trustlines. |
| `useCreateAccount()` | Fund (via Friendbot) and create new accounts. |
| `useAccountMerge()` | Build and submit an account merge. |
| `useAccountFlags()` | Set and clear account auth flags. |
| `useBumpSequence()` | Bump an account's sequence number. |
| `useMultiSig()` | Build a multi-sig transaction, collect signatures, and submit once the threshold is met. |
| `useInflation()` | Submit an inflation operation (legacy support). |
| `useClaimBalance()` / `useCreateClaimableBalance()` | Claim and create claimable balances. |

#### Soroban / contracts

| Hook | Description |
|------|-------------|
| [`useSorobanContract()`](#usesorobancontractoptions) ↓ | Simulate → sign → submit → poll a Soroban contract call in one hook. |
| [`useLedgerEntry()`](#useledgerentryledgerkey-options) ↓ | Read a raw Soroban ledger entry without constructing a contract call. |

---

### `useFreighter()`

Connect to and interact with the [Freighter](https://freighter.app) browser extension wallet. Built on **`@stellar/freighter-api` v6** — `signBlob` is implemented on top of Freighter's `signMessage` API.

```ts
const {
  isInstalled,             // boolean — is Freighter installed?
  isConnected,             // boolean — has the user granted access?
  publicKey,               // string | null
  network,                 // string | null  e.g. "TESTNET"
  networkPassphrase,       // string | null
  networkPassphraseMismatch, // boolean — true when wallet network differs from `expectedNetworkPassphrase` (or the <StellarProvider> network)
  networkPassphraseWarning,  // string | null — actionable warning text on mismatch; null otherwise
  isLoading,
  isSigningMessage,        // boolean — true while signMessage() is in flight
  isAutoConnecting,        // boolean — true while the autoConnect silent check runs
  error,

  connect,           // () => Promise<void>
  disconnect,        // () => void
  signTransaction,   // (xdr: string, opts?) => Promise<string>
  signAuthEntry,     // (entryPreimageXdr: string) => Promise<string>
  signBlob,          // (blob: string, opts?) => Promise<string>  — wraps signMessage
  signMessage,       // (message: string, opts?) => Promise<string>  — sign arbitrary messages
} = useFreighter();
```

#### Sign-in with Stellar

Use `signMessage()` to implement challenge-response authentication flows:

```tsx
import { useFreighter } from "stellar-hooks";

function SignInButton() {
  const { isConnected, publicKey, signMessage, isSigningMessage, connect } = useFreighter();

  async function handleSignIn() {
    if (!isConnected) { await connect(); return; }
    const challenge = `Sign in to MyApp at ${new Date().toISOString()}`;
    const signature = await signMessage(challenge);
    // Send { publicKey, challenge, signature } to your backend for verification
    await fetch("/api/auth", {
      method: "POST",
      body: JSON.stringify({ publicKey, challenge, signature }),
    });
  }

  return (
    <button onClick={handleSignIn} disabled={isSigningMessage}>
      {isSigningMessage ? "Signing…" : "Sign In with Stellar"}
    </button>
  );
}
```

#### Auto-connect returning users

Pass `autoConnect: true` to silently reconnect users who previously granted access — no popup:

```tsx
const { isConnected, publicKey, isAutoConnecting } = useFreighter({
  autoConnect: true,
});

if (isAutoConnecting) return <p>Reconnecting…</p>;
if (isConnected) return <p>Welcome back, {publicKey}</p>;
```

#### Network mismatch detection

If the wallet is on a different Stellar network than your dApp expects, signing would silently target the wrong ledger. The hook accepts an optional `expectedNetworkPassphrase`:

```ts
const { networkPassphraseMismatch, networkPassphraseWarning } = useFreighter({
  expectedNetworkPassphrase: "Test SDF Network ; September 2015",
});

// Or, if your app is wrapped in <StellarProvider network="testnet">, the
// expected passphrase is taken from the provider automatically.
```

Render `networkPassphraseWarning` to surface the issue, or gate signing behind an acknowledgement. See the [API reference](./docs/api/hooks/use-freighter.md) for a full example.

---

### `useNetwork()`

Read the active network configuration and switch networks at runtime. All values reflect the currently active network — including any network switch made via `switchNetwork`.

```ts
const {
  network,            // StellarNetwork — "testnet" | "mainnet" | "futurenet" | "custom"
  networkPassphrase,  // string — e.g. "Test SDF Network ; September 2015"
  horizonUrl,         // string — active Horizon REST API endpoint
  sorobanRpcUrl,      // string — active Soroban RPC endpoint
  config,             // NetworkConfig — full { network, horizonUrl, sorobanRpcUrl, networkPassphrase }
  switchNetwork,      // (network: StellarNetwork, customConfig?: CustomNetworkConfig) => void
} = useNetwork();
```

Switch networks at runtime (e.g. a settings UI):

```tsx
import { useNetwork } from "stellar-hooks";
import type { StellarNetwork } from "stellar-hooks";

function NetworkSwitcher() {
  const { network, switchNetwork } = useNetwork();

  return (
    <select
      value={network}
      onChange={(e) => switchNetwork(e.target.value as StellarNetwork)}
    >
      <option value="testnet">Testnet</option>
      <option value="mainnet">Mainnet</option>
      <option value="futurenet">Futurenet</option>
    </select>
  );
}
```

When switching to a custom network, pass the full `CustomNetworkConfig` as the second argument:

```ts
switchNetwork("custom", {
  network: "custom",
  horizonUrl: "https://my-horizon.example.com",
  sorobanRpcUrl: "https://my-rpc.example.com",
  networkPassphrase: "My Network ; 2024",
});
```

The selected network is persisted to `localStorage` and survives page reloads.

---

### `useStellarNetwork()`

Read the active network and switch networks dynamically via `setNetwork()` — no page reload or provider remount required. All child hooks re-fetch automatically when the network changes.

```ts
const {
  network,            // StellarNetwork
  networkPassphrase,  // string
  horizonUrl,         // string
  sorobanRpcUrl,      // string
  config,             // NetworkConfig
  setNetwork,         // (network: StellarNetwork, customConfig?: CustomNetworkConfig) => void
} = useStellarNetwork();
```

Example — a testnet/mainnet toggle:

```tsx
import { useStellarNetwork } from "stellar-hooks";

function NetworkToggle() {
  const { network, setNetwork } = useStellarNetwork();

  return (
    <button onClick={() => setNetwork(network === "testnet" ? "mainnet" : "testnet")}>
      Currently: {network} — click to switch
    </button>
  );
}
```

---

### `useWalletKit()`

Detect installed Stellar wallets (Freighter, Lobstr, xBull) and expose a unified interface — connect, disconnect, and sign regardless of which wallet is active.

```ts
const {
  availableWallets,  // WalletId[] — e.g. ["freighter", "lobstr"]
  activeWallet,      // WalletId | null
  publicKey,         // string | null
  isConnecting,      // boolean
  error,             // Error | null

  setActiveWallet,   // (id: WalletId) => void
  connect,           // (walletId?: WalletId) => Promise<string | null>
  disconnect,        // () => void
  signTransaction,   // (xdr: string, opts?) => Promise<string>
} = useWalletKit();
```

Example — wallet picker:

```tsx
import { useWalletKit } from "stellar-hooks";

function WalletPicker() {
  const { availableWallets, activeWallet, publicKey, connect, disconnect } = useWalletKit();

  if (publicKey) {
    return (
      <div>
        <p>Connected via {activeWallet}: {publicKey}</p>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    );
  }

  if (availableWallets.length === 0) return <p>No Stellar wallets detected.</p>;

  return (
    <div>
      {availableWallets.map((id) => (
        <button key={id} onClick={() => connect(id)}>
          Connect {id}
        </button>
      ))}
    </div>
  );
}
```

Falls back gracefully when a wallet extension is not installed — it simply won't appear in `availableWallets`.

---

### `useStellarAccount(publicKey, options?)`

Fetch (and optionally poll) a full Stellar account from Horizon.

```ts
const {
  data,           // StellarAccountData | null
  isLoading,
  error,
  lastFetchedAt,  // Date | null
  refetch,
} = useStellarAccount("G...", {
  enabled: true,         // default: true
  refetchInterval: 5000, // poll every 5 s; 0 = disabled (default)
});

// data.balances   → StellarBalance[]
// data.sequence   → string
// data.subentryCount → number
// data.numSponsored  → number
// data.numSponsoring → number
// data.raw        → raw Horizon.AccountResponse
```

---

### `useStellarBalance(publicKey, options?)`

Convenience wrapper around `useStellarAccount` that surfaces the XLM balance and optionally a specific asset balance.

```ts
const {
  balances,     // StellarBalance[]
  xlmBalance,   // StellarBalance | null  (the native XLM entry)
  assetBalance, // StellarBalance | null  (the specific asset requested, if any)
  isLoading,
  error,
  refetch,
} = useStellarBalance("G...", { code: "USDC", issuer: "G..." });
```

### `useStellarAccounts(publicKeys[], options?)`

Fetch and poll multiple Stellar accounts in parallel — useful for multisig rosters, account pickers, or any list view. Issues one batched `Promise.all(loadAccount)` per tick and returns a per-key map.

```ts
const {
  accounts,      // Record<publicKey, StellarAccountData | null>
  errors,        // Record<publicKey, Error | null>
  isLoading,
  isError,
  error,         // First per-key error across the batch, or null
  refetch,
  lastFetchedAt,
} = useStellarAccounts([signerA, signerB, signerC], { refetchInterval: 10_000 });
```

- `null`/`undefined` entries in the input are skipped.
- Duplicate keys are deduplicated before the RPC call.
- A single failing account does NOT poison the rest of the batch — `errors[pk]` carries per-key errors.

---

### `useSorobanContract(options)`

Simulate → sign (via Freighter) → submit → poll a Soroban contract call. Full lifecycle in one hook.

```ts
const { call, status, result, hash, error, reset } = useSorobanContract({
  contractId: "CABC...XYZ",   // Soroban C... contract address
  method: "increment",
  args: [nativeToScVal(1, { type: "u32" })],
  fee: "100",                 // stroops (default: BASE_FEE)
  timeoutSeconds: 30,         // default: 30
});

// Statuses: "idle" | "building" | "signing" | "submitting" | "polling" | "success" | "error"
<button onClick={() => call()} disabled={status !== "idle"}>
  {status}
</button>
```

You may also pass a pre-configured `rpc.Server` instance via the `sorobanRpcServer` option to reuse an existing connection or custom transport:

```ts
const { call, status } = useSorobanContract({
  contractId: "CABC...XYZ",
  method: "hello",
  args: [nativeToScVal("world")],
  sorobanRpcServer: myCustomServer,
});
```

`result` contains the raw `xdr.ScVal` return value. Parse it with `scValToNative` from the SDK.

---

### `useTransaction(options?)`

Submit a pre-signed XDR and poll for confirmation. Useful when you sign outside React (e.g. hardware wallet, server-side).

```ts
const { submit, status, hash, isSuccess, isError, error, reset } = useTransaction({
  mode: "soroban",    // "soroban" (default) | "classic"
  timeoutSeconds: 60,
});

await submit(signedXdr);
```

---

### `useNetworkStatus(options?)`

Expose real-time Horizon and RPC health. Useful for showing network status indicators in dApp UIs.

```ts
const {
  horizonLatency,  // number — latency in ms; Infinity if offline
  rpcLatency,      // number — latency in ms; Infinity if offline
  isHorizonHealthy,// boolean
  isRpcHealthy,    // boolean
  ledger,          // number — latest ledger sequence
} = useNetworkStatus({
  refetchInterval: 10000, // poll every 10s (default)
});
```

This hook will gracefully handle timeouts and offline scenarios for each endpoint independently.

---

### `useTransactionHistory(publicKey, options?)`

Fetch paginated transaction history for a given Stellar account from Horizon.

```ts
const {
  transactions,    // Horizon.TransactionResponse[]
  fetchNextPage,   // () => void
  hasMore,         // boolean
  isLoading,       // boolean
  error,
} = useTransactionHistory("G...", {
  limit: 20,       // default: 10
  order: "desc",   // default: "desc"
});
```

---

### `useLedgerEntry(ledgerKey, options?)`

Read a raw Soroban ledger entry by its `xdr.LedgerKey` without constructing a contract call.

```ts
import { xdr, Address, Contract } from "@stellar/stellar-sdk";

const key = xdr.LedgerKey.contractData(
  new xdr.LedgerKeyContractData({
    contract: new Address(CONTRACT_ID).toScAddress(),
    key: xdr.ScVal.scvSymbol("Counter"),
    durability: xdr.ContractDataDurability.persistent(),
  })
);

const { data, isLoading, error, refetch } = useLedgerEntry(key, {
  refetchInterval: 3000,
});
```

---

### `usePayment(options)`

Build, sign, and submit a classic Stellar payment (native XLM or any Stellar asset) via Freighter in one hook.

```ts
const {
  submit,    // () => Promise<void> — build, sign, and submit the payment
  status,    // "idle" | "submitting" | "polling" | "success" | "error"
  hash,      // string | null — transaction hash on success
  isLoading, // boolean
  isSuccess, // boolean
  isError,   // boolean
  error,     // Error | null
  reset,     // () => void
} = usePayment({
  destination: "GBXXX...",
  asset: { type: "native" },        // XLM
  // asset: { type: "credit", code: "USDC", issuer: "G..." }, // any asset
  amount: "10",
  memo: "Thanks!",                  // optional, max 28 bytes
  fee: 100,                         // optional, stroops (default: 100)
  timeoutSeconds: 60,               // optional (default: 60)
  onSuccess: (hash) => console.log("Sent!", hash),
  onError:   (err)  => console.error(err),
});

return <button onClick={submit} disabled={isLoading}>Send XLM</button>;
```

---

### `usePathPayment(options)`

Build, sign, and submit a strict-send or strict-receive path payment via Freighter.

```ts
import { usePathPayment } from "stellar-hooks";

const {
  submit,    // () => Promise<void>
  status,    // TransactionStatus
  hash,      // string | null
  isLoading, // boolean
  isSuccess, // boolean
  isError,   // boolean
  error,     // StellarTransactionError | null
  reset,     // () => void
} = usePathPayment({
  mode: "strict-send",               // "strict-send" | "strict-receive"
  sendAsset: { type: "native" },     // XLM
  sendAmount: "10",
  destination: "GBXXX...",
  destAsset: { type: "credit", code: "USDC", issuer: "G..." },
  destMin: "9",                      // minimum received
  path: [],                          // [] = Horizon auto-selects
  fee: 100,                          // optional, stroops (default: 100)
  timeoutSeconds: 60,                // optional (default: 60)
  onSuccess: (hash) => console.log("Sent!", hash),
  onError:   (err)  => console.error(err),
});

return <button onClick={submit} disabled={isLoading}>Path Payment</button>;
```

---

### `useStellarToml(domain, options?)`

Fetch and parse a domain's `stellar.toml` file (SEP-1).

```ts
import { useStellarToml } from "stellar-hooks";

const {
  data,      // StellarTomlData | null — parsed stellar.toml contents
  isLoading, // boolean
  error,     // Error | null
  refetch,   // () => Promise<void>
} = useStellarToml("stellar.org", {
  cacheTTL: 300000,  // optional, cache TTL in ms (default: 5 min)
});

// data.CURRENCIES   → array of supported assets
// data.DOCUMENTATION → org info
// data.VALIDATORS   → validator list
```

---

### `useAssetMetadata(assetCode, assetIssuer)`

Resolve full asset metadata by composing `useStellarAccount` (to find the issuer's `home_domain`) and `useStellarToml` (to fetch the matching `CURRENCIES` entry).

```ts
import { useAssetMetadata } from "stellar-hooks";

const {
  metadata,  // AssetMetadata | null — { code, issuer, name, desc, image, ... }
  isLoading, // boolean
  error,     // Error | null
} = useAssetMetadata("USDC", "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN");

// metadata.name  → "USD Coin"
// metadata.image → logo URL
// metadata.desc  → description
```

---

### `useStellarOffers(publicKey, options?)`

Fetch open buy/sell offers from Horizon for a given account.

```ts
import { useStellarOffers } from "stellar-hooks";

const {
  offers,        // OfferRecord[] — open offers
  isLoading,     // boolean
  error,         // Error | null
  lastFetchedAt, // Date | null
  refetch,       // () => Promise<void>
} = useStellarOffers("G...", {
  enabled: true,          // default: true
  refetchInterval: 10000, // poll every 10 s; 0 = disabled (default)
});

// Each offer: { id, selling, buying, amount, price, seller, ... }
```

---

### `useOfferBook(options)`

Fetch the DEX order book for a given asset pair from Horizon.

```ts
import { useOfferBook } from "stellar-hooks";
import { Asset } from "@stellar/stellar-sdk";

const { data, isLoading, error } = useOfferBook({
  selling: Asset.native(),
  buying: new Asset("USDC", "GA5ZSE..."),
  limit: 20,              // optional (default: 20)
  refetchInterval: 5000,  // optional, poll every 5 s
});

// data.bids — buy orders
// data.asks — sell orders
```

---

### `useContractEvents(options)`

Poll Soroban contract events from the RPC endpoint.

```ts
import { useContractEvents } from "stellar-hooks";

const {
  data: events, // EventResponse[]
  isLoading,    // boolean
  error,        // Error | null
  refetch,      // () => Promise<void>
} = useContractEvents({
  contractId: "CABC...XYZ",
  startLedger: 100000,
  topics: [["transfer"]],     // optional topic filters
  type: "contract",            // optional: "system" | "contract" | "diagnostic"
  limit: 100,                 // optional (default: 100)
  refetchInterval: 5000,      // optional, poll every 5 s; 0 = disabled (default)
});
```

---

### `useEffects(publicKey, options?)`

Stream account effects from Horizon via SSE (Server-Sent Events).

```ts
import { useEffects } from "stellar-hooks";

const {
  effects,       // EffectRecord[]
  isLoading,     // boolean
  isStreaming,   // boolean — true while SSE is active
  error,         // Error | null
  lastFetchedAt, // Date | null
  refetch,       // () => Promise<void>
  stop,          // () => void — close the SSE stream
  start,         // () => void — reopen the SSE stream
} = useEffects("G...", {
  enabled: true,  // default: true
  limit: 20,      // default: 20
  order: "desc",  // default: "desc"
  stream: true,   // default: true — subscribe to live updates
});
```

---

### `useOperations(options)`

Fetch operations for an account or transaction from Horizon.

```ts
import { useOperations } from "stellar-hooks";

// By account
const { operations, isLoading, error, refetch } = useOperations({
  accountId: "G...",
  limit: 20,              // default: 10
  order: "desc",          // default: "desc"
  refetchInterval: 10000, // optional
});

// By transaction hash
const { operations } = useOperations({
  transactionHash: "abc123...",
});
```

---

### `useAssets(options?)`

Fetch and list Stellar assets via Horizon.

```ts
import { useAssets } from "stellar-hooks";

const {
  assets,    // AssetRecord[]
  isLoading, // boolean
  error,     // Error | null
  refetch,   // () => Promise<void>
} = useAssets({
  assetCode: "USDC",     // optional filter
  assetIssuer: "G...",   // optional filter
  limit: 10,             // default: 10, max: 200
  order: "asc",          // default: "asc"
  enabled: true,         // default: true
});
```

---

### `useTrade(options?)`

Place, modify, and cancel classic Stellar DEX offers.

```ts
import { useTrade } from "stellar-hooks";

const {
  placeOffer,  // (params: PlaceOfferParams) => Promise<void>
  modifyOffer, // (params: ModifyOfferParams) => Promise<void>
  cancelOffer, // (params: CancelOfferParams) => Promise<void>
  status,      // TransactionStatus
  hash,        // string | null
  isLoading,   // boolean
  isSuccess,   // boolean
  isError,     // boolean
  error,       // StellarTransactionError | null
  reset,       // () => void
} = useTrade({
  fee: 100,            // optional (default: 100)
  timeoutSeconds: 60,  // optional (default: 60)
  onSuccess: (hash) => console.log("Offer tx:", hash),
});

// Place a sell offer: sell 100 XLM for USDC at price 0.12
await placeOffer({
  type: "sell",
  selling: { type: "native" },
  buying: { type: "credit", code: "USDC", issuer: "G..." },
  amount: "100",
  price: "0.12",
});
```

---

### `useTrustline(options)`

Add, modify, or remove a Stellar trustline.

```ts
import { useTrustline } from "stellar-hooks";

const {
  submit,    // () => Promise<void>
  status,    // TransactionStatus
  hash,      // string | null
  isLoading, // boolean
  isSuccess, // boolean
  isError,   // boolean
  error,     // StellarTransactionError | null
  reset,     // () => void
} = useTrustline({
  code: "USDC",
  issuer: "GA5Z...",
  limit: "1000",   // optional; "0" removes the trustline
  fee: 100,        // optional (default: 100)
});

return <button onClick={submit} disabled={isLoading}>Add Trustline</button>;
```

---

### `useAccountFlags(options)`

Set or clear authorization flags on a Stellar issuer account.

```ts
import { useAccountFlags } from "stellar-hooks";

const {
  submit,    // () => Promise<void>
  status,    // TransactionStatus
  hash,      // string | null
  isLoading, // boolean
  isSuccess, // boolean
  isError,   // boolean
  error,     // StellarTransactionError | null
  reset,     // () => void
} = useAccountFlags({
  setFlags: ["authRequired", "authRevocable"],
  clearFlags: [],  // optional
});

return <button onClick={submit} disabled={isLoading}>Update Flags</button>;
```

Available flags: `"authRequired"`, `"authRevocable"`, `"authImmutable"`, `"authClawbackEnabled"`.

---

### `useAccountMerge(options)`

Merge the connected account into a destination account, transferring all remaining XLM.

```ts
import { useAccountMerge } from "stellar-hooks";

const {
  submit,    // () => Promise<void>
  status,    // TransactionStatus
  hash,      // string | null
  isLoading, // boolean
  error,     // StellarTransactionError | null
  reset,     // () => void
} = useAccountMerge({
  destination: "GBXXX...",
  memo: "Closing account",  // optional
});

return <button onClick={submit} disabled={isLoading}>Merge Account</button>;
```

---

### `useBumpSequence(options)`

Bump a Stellar account's sequence number forward.

```ts
import { useBumpSequence } from "stellar-hooks";

const {
  submit,    // () => Promise<void>
  status,    // TransactionStatus
  hash,      // string | null
  isLoading, // boolean
  error,     // StellarTransactionError | null
  reset,     // () => void
} = useBumpSequence({
  bumpTo: "1000000",  // new minimum sequence number
});

return <button onClick={submit} disabled={status !== "idle"}>Bump Sequence</button>;
```

---

### `useInflation(options?)`

Submit a legacy inflation operation.

```ts
import { useInflation } from "stellar-hooks";

const {
  submit,    // () => Promise<void>
  status,    // TransactionStatus
  hash,      // string | null
  isLoading, // boolean
  error,     // StellarTransactionError | null
  reset,     // () => void
} = useInflation({
  fee: 100,            // optional (default: 100)
  timeoutSeconds: 60,  // optional (default: 60)
  memo: "Inflation",   // optional
});

return <button onClick={submit} disabled={isLoading}>Vote Inflation</button>;
```

---

### `useManageData(options?)`

Set or delete key-value data entries on a Stellar account.

```ts
import { useManageData } from "stellar-hooks";

const {
  set,       // (name: string, value: string | Buffer) => Promise<void>
  remove,    // (name: string) => Promise<void>
  status,    // TransactionStatus
  hash,      // string | null
  isLoading, // boolean
  error,     // StellarTransactionError | null
  reset,     // () => void
} = useManageData();

await set("my-key", "my-value");  // store a data entry
await remove("my-key");           // delete a data entry
```

---

### `useClaimableBalances(publicKey)` / `useClaimBalance(options?)` / `useCreateClaimableBalance(options?)`

List, claim, and create claimable balances.

```ts
import {
  useClaimableBalances,
  useClaimBalance,
  useCreateClaimableBalance,
} from "stellar-hooks";

// List claimable balances for an account
const { balances, isLoading, refetch } = useClaimableBalances("G...");

// Claim a balance
const { claim, status, hash, error } = useClaimBalance({
  onSuccess: (hash) => { console.log("Claimed!", hash); refetch(); },
});

await claim(balances[0].id);

// Create a claimable balance
const { create, status: createStatus } = useCreateClaimableBalance();
```

---

### `useSorobanTokenBalance(contractId, publicKey, options?)`

Read a SAC (Stellar Asset Contract) token balance via Soroban RPC.

```ts
import { useSorobanTokenBalance } from "stellar-hooks";

const {
  balance,       // bigint | null — raw token balance (i128)
  formatted,     // string | null — e.g. "100.0000000"
  isLoading,     // boolean
  error,         // Error | null
  lastFetchedAt, // Date | null
  refetch,       // () => Promise<void>
} = useSorobanTokenBalance("CABC...XYZ", "G...", {
  enabled: true,          // default: true
  refetchInterval: 5000,  // poll every 5 s; 0 = disabled (default)
  decimals: 7,            // default: 7 (Stellar standard)
  cacheTTL: 30000,        // default: 30 s
});
```

---

### `useMultiSig(options?)`

Build a multi-signature Stellar transaction, collect signatures from multiple Freighter-connected signers, and submit.

```ts
import { useMultiSig } from "stellar-hooks";
import { Operation } from "@stellar/stellar-sdk";

const {
  build,          // (operations, options?) => Promise<string> — build unsigned XDR
  sign,           // (xdr?) => Promise<string> — add a signature
  submit,         // (signedXdr) => Promise<void> — submit to network
  unsignedXdr,    // string | null
  signatureCount, // number
  status,         // TransactionStatus
  hash,           // string | null
  isLoading,      // boolean
  error,          // StellarTransactionError | null
  reset,          // () => void
} = useMultiSig();

// Step 1 — build the transaction
const xdr = await build([Operation.payment({ ... })]);

// Step 2 — first signer signs
const signedOnce = await sign(xdr);

// Step 3 — second signer signs (after receiving XDR out-of-band)
const signedTwice = await sign(signedOnce);

// Step 4 — submit when threshold is met
await submit(signedTwice);
```

---

### `useCreateAccount(options?)`

Fund a new Stellar account via Friendbot (testnet/futurenet) or build a `CreateAccount` operation for mainnet.

```ts
import { useCreateAccount } from "stellar-hooks";

const {
  fundWithFriendbot,              // (publicKey: string) => Promise<void>
  buildCreateAccountTransaction,  // (source, dest, balance, seq, fee?) => Transaction
  isLoading,                      // boolean
  error,                          // StellarTransactionError | null
} = useCreateAccount();

// Fund on testnet
await fundWithFriendbot("GNEW_PUBLIC_KEY...");

// Build a createAccount tx for mainnet
const tx = buildCreateAccountTransaction(
  sourceAccountId,
  destinationPublicKey,
  "1",             // startingBalance in XLM
  sequenceNumber,
);
```

---

### `useLiquidityPool(poolId, options?)`

Fetch Stellar AMM liquidity pool data (reserves, total shares, fee) from Horizon.

```ts
import { useLiquidityPool } from "stellar-hooks";

const { pool, isLoading, error, refetch } = useLiquidityPool(
  "pool-id-hash",
  { refetchInterval: 10000 }
);

if (pool) {
  console.log(pool.total_shares);  // "50000.0000000"
  console.log(pool.fee_bp);        // 30
  pool.reserves.forEach((r) =>
    console.log(`${r.asset}: ${r.amount}`)
  );
}
```

---

### `useAccountLiquidityPositions(publicKey, options?)`

Fetch all AMM liquidity pool positions for a Stellar account.

```ts
import { useAccountLiquidityPositions } from "stellar-hooks";

const { positions, isLoading, error, refetch } =
  useAccountLiquidityPositions(publicKey);

return positions.map((pool) => (
  <div key={pool.id}>
    <p>Pool: {pool.id}</p>
    <p>Shares: {pool.total_shares}</p>
    {pool.reserves.map((r) => (
      <span key={r.asset}>{r.asset}: {r.amount}</span>
    ))}
  </div>
));
```

---

### `useWalletConnect(options)`

Connect to Stellar wallets via WalletConnect v2 (QR code / deep-link pairing).

```ts
import { useWalletConnect } from "stellar-hooks";

const {
  publicKey,       // string | null — connected Stellar address
  isConnected,     // boolean
  isConnecting,    // boolean
  uri,             // string | null — show as QR code while connecting
  error,           // Error | null
  connect,         // () => Promise<string | null>
  disconnect,      // () => Promise<void>
  signTransaction, // (xdr, opts?) => Promise<string>
} = useWalletConnect({
  projectId: "YOUR_REOWN_PROJECT_ID",
  metadata: {
    name: "My dApp",
    description: "A Stellar dApp",
    url: "https://mydapp.example.com",
    icons: ["https://mydapp.example.com/icon.png"],
  },
  chain: "stellar:testnet",  // optional (default: "stellar:testnet")
});
```

---

### `useWalletsKit(options)`

Multi-wallet support via `@creit-tech/stellar-wallets-kit` — connect to Freighter, xBull, Albedo, Lobstr, and more through a single hook.

```ts
import { useWalletsKit } from "stellar-hooks";
import { defaultModules } from "@creit-tech/stellar-wallets-kit/sdk";

const {
  publicKey,       // string | null
  isConnected,     // boolean
  isConnecting,    // boolean
  error,           // Error | null
  connect,         // () => Promise<string | null>
  disconnect,      // () => void
  signTransaction, // (xdr, opts?) => Promise<string>
  signAuthEntry,   // (authEntry, opts?) => Promise<string>
  signMessage,     // (message, opts?) => Promise<string>
} = useWalletsKit({
  modules: defaultModules(),
  selectedWalletId: "freighter",  // optional pre-selection
});
```

---

## Provider

Wrap your app (or the portion that needs Stellar) with `<StellarProvider>` to configure the network. Every hook that reads blockchain data consumes endpoint configuration from this provider.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `network` | `StellarNetwork` | `"testnet"` | The network to connect to. One of `"testnet"`, `"mainnet"`, `"futurenet"`, or `"custom"`. |
| `customConfig` | `CustomNetworkConfig` | — | Required when `network` is `"custom"`. Supplies Horizon URL, Soroban RPC URL, and the network passphrase for your deployment. |
| `children` | `React.ReactNode` | — | The component tree that will have access to Stellar context. |

### Built-in network presets

| Network | Horizon URL | Soroban RPC URL | Network Passphrase |
|---------|-------------|-----------------|-------------------|
| `testnet` | `https://horizon-testnet.stellar.org` | `https://soroban-testnet.stellar.org` | `Test SDF Network ; September 2015` |
| `mainnet` | `https://horizon.stellar.org` | `https://mainnet.sorobanrpc.com` | `Public Global Stellar Network ; September 2015` |
| `futurenet` | `https://horizon-futurenet.stellar.org` | `https://rpc-futurenet.stellar.org` | `Test SDF Future Network ; October 2022` |

These presets are also exported as `NETWORK_CONFIGS` if you need them outside React:

```ts
import { NETWORK_CONFIGS } from "stellar-hooks";

const { horizonUrl } = NETWORK_CONFIGS.mainnet;
```

### Usage examples

```tsx
// Testnet (default)
<StellarProvider network="testnet">
  <App />
</StellarProvider>

// Mainnet
<StellarProvider network="mainnet">
  <App />
</StellarProvider>

// Futurenet
<StellarProvider network="futurenet">
  <App />
</StellarProvider>

// Custom / self-hosted network
<StellarProvider
  network="custom"
  customConfig={{
    network: "custom",
    horizonUrl: "https://my-horizon.example.com",
    sorobanRpcUrl: "https://my-rpc.example.com",
    networkPassphrase: "My Network ; 2024",
  }}
>
  <App />
</StellarProvider>
```

### `CustomNetworkConfig`

Use this interface when connecting to a private or self-hosted Stellar network.

| Field | Type | Description |
|-------|------|-------------|
| `network` | `"custom"` | Must be `"custom"`. |
| `horizonUrl` | `string` | Horizon REST API base URL for this network. |
| `sorobanRpcUrl` | `string` | Soroban RPC endpoint for contract simulation and submission. |
| `networkPassphrase` | `string` | Network passphrase used when signing transactions. |

### Network persistence

`<StellarProvider>` automatically persists the active network in `localStorage` under the keys `stellar-hooks:network` and `stellar-hooks:custom-config`. On subsequent page loads the persisted choice is restored, overriding the `network` prop. To switch networks at runtime and persist the change, use [`useNetwork().switchNetwork`](#usenetwork).

---

## Types

All types are exported and fully documented via JSDoc.

```ts
import type {
  StellarNetwork,
  NetworkConfig,
  CustomNetworkConfig,
  StellarAccountData,
  StellarBalance,
  FreighterState,
  UseFreighterReturn,
  TransactionStatus,
  ContractCallOptions,
} from "stellar-hooks";
```

---

## Requirements

| Peer dependency | Version |
|---|---|
| react | ≥ 18 |
| react-dom | ≥ 18 |

The library ships with `@stellar/stellar-sdk` v13 and `@stellar/freighter-api` v6 as direct dependencies — you don't need to install them separately unless you need a different version.

---

## Migration

See [docs/guides/migration-guide.md](docs/guides/migration-guide.md) for a version-by-version guide to breaking changes and how to update your code.

---

## Contributing

1. `git clone https://github.com/YOUR_USERNAME/stellar-hooks`
2. `npm install`
3. `npm run dev` — builds in watch mode
4. Edit hooks in `src/hooks/`, types in `src/types/`
5. Open a PR
6. Run `npm run changeset` to create a changeset note for your change.
7. If your PR includes code changes, run `npm run build` before opening the PR.

Please review our Contributing Guide and Code of Conduct for more details before opening a pull request.

## Documentation

Full documentation with live examples is available at **[https://spiffamani.github.io/stellar-hooks/](https://spiffamani.github.io/stellar-hooks/)**

To preview the documentation site locally:

```bash
npm install
npm run docs:dev
```

The docs site will be available at `http://localhost:5173` (or the port VitePress assigns).

---

## Release process

This repository uses Changesets for automated changelog generation, version bumps, and npm publishing.

- Use `npm run changeset` to add a release note to your PR.
- After a changeset is merged into `main`, the GitHub Actions release workflow will publish the package automatically.
- To enable automated publishing, add `NPM_TOKEN` to repository secrets.

---

## Roadmap

- [x] `usePayment()` — send XLM / asset payments with one hook
- [x] `useClaimableBalance()` — list and claim claimable balances
- [x] `usePathPayment()` — strict send / receive path payment hook
- [x] `useStellarToml()` — fetch and parse a domain's `stellar.toml`
- [x] React Query / SWR adapters — `@stellar-hooks/query` and `@stellar-hooks/swr`

---

## FAQ

### Which Stellar networks are supported?

`testnet` (default), `mainnet`, `futurenet`, and any custom network via the `custom` mode with a `customConfig` prop on `<StellarProvider>`.

### Do I need to install `@stellar/stellar-sdk` separately?

No — it ships as a direct dependency. You only need to install it separately if you require a version different from the bundled one.

### Do I need Freighter to use these hooks?

Most hooks that interact with user accounts (`useFreighter`, `useSorobanContract`, `useStellarBalance`, etc.) rely on a Freighter-connected wallet. `useStellarAccount` and `useLedgerEntry` are read-only and work without a wallet.

### Can I use these hooks with React Native?

`useFreighter` depends on the Freighter browser extension API, so it works in web environments only. The other hooks should work anywhere you can run `@stellar/stellar-sdk`.

### What is the difference between `useStellarAccount` and `useStellarBalance`?

`useStellarBalance` is a lightweight wrapper around `useStellarAccount` that surfaces the native XLM balance at the top level for convenience.

### How do I poll for account or ledger changes?

Both `useStellarAccount` and `useLedgerEntry` accept a `refetchInterval` option (in ms). Set it to `5000` to poll every 5 seconds, or `0` (default) to disable polling.

### Can I use these hooks without a `<StellarProvider>`?

No — the hooks consume configuration from the provider context. Wrap your app with `<StellarProvider>` at the root.

---

## License

MIT
