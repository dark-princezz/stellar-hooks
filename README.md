# stellar-hooks

[![npm version](https://img.shields.io/badge/npm-v0.1.0-blue?style=flat-square)](https://www.npmjs.com/package/stellar-hooks)
[![license](https://img.shields.io/github/license/dark-princezz/stellar-hooks.svg?style=flat-square)](LICENSE)
[![bundle size](https://img.shields.io/badge/bundle%20size-12.5%20KB-blue?style=flat-square)](https://github.com/dark-princezz/stellar-hooks)


> React hooks for Stellar and Soroban. The `wagmi` you've been waiting for.


`stellar-hooks` wires the [Stellar JS SDK v13](https://github.com/stellar/js-stellar-sdk) and the Freighter wallet API into a set of ergonomic React hooks so you can build Stellar dApps without copy-pasting the same boilerplate across repos.

---

## Quick start

```bash
npm install stellar-hooks
```

Wrap your app with the provider and read a balance in a single component:

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

That's it — install, connect, read a balance.

---

## Features

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
| [`useNetworkConfig()`](#usenetworkconfig) ↓ | Read the full active network configuration object from the provider context. |
| [`useHorizonServer()`](#usehorizonserver) ↓ | Return the configured Horizon server instance for custom queries. |
| [`useNetworkStatus()`](#usenetworkstatusoptions) ↓ | Monitor Horizon and RPC health for network status indicators in dApp UIs. |

#### Account & ledger data (read)

| Hook | Description |
|------|-------------|
| [`useStellarAccount()`](#usestellaraccountpublickey-options) ↓ | Fetch (and optionally poll) a full account from Horizon. |
| `useStellarAccounts()` | Fetch and poll multiple accounts in parallel (no serial waterfall). |
| [`useStellarBalance()`](#usestellarbalancepublickey-options) ↓ | XLM and per-asset balances (wrapper around `useStellarAccount`). |
| `useSorobanTokenBalance()` | Read SAC (Stellar Asset Contract) token balances via Soroban RPC. |
| [`useLedgerEntry()`](#useledgerentryledgerkey-options) ↓ | Read a raw Soroban ledger entry by its `xdr.LedgerKey`. |
| `useOperations()` | Fetch operations for an account or transaction from Horizon; supports `includeFailed` and cursor-based pagination. |
| `useEffects()` | Stream account effects from Horizon. |
| `useAssets()` | Fetch and list Stellar assets via Horizon. |
| `useAssetMetadata()` | Fetch asset metadata from a domain's `stellar.toml`. |
| [`useStellarToml()`](#usestellartomldomain-options) ↓ | Fetch and parse a domain's `stellar.toml` (SEP-1); surfaces the federation server, signing key, currencies, and other well-known fields. |
| `useOffers()` | Fetch open offers for a Stellar account with pagination helpers. |
| `useStellarOffers()` | Fetch open offers for a Stellar account. |
| [`useOrderBook()`](#useorderbookselling-buying-options) ↓ | Query the Stellar DEX order book for any asset pair; supports live polling. |
| [`useTrades()`](#usestrictpublickey-options) ↓ | Fetch DEX trade history for an account with optional asset pair filtering. |
| [`useStrictSendPaths()`](#usestrictsendpathssourceasset-sourceamount-destinationassets-options) ↓ | Discover payment paths and exchange rates via Horizon's strict-send endpoint before committing to a swap. |
| `useClaimableBalances()` | List claimable balances for an account. |
| [`useAssetBalance()`](#useassetbalancepublickey-asset-options) ↓ | Fetch a specific asset balance (native or issued) for a given public key. |
| [`useTrustlines()`](#usetrustlinespublickey) ↓ | List and manage trustlines for an account. |
| [`useTransactionHistory()`](#usetransactionhistorypublickey-options) ↓ | Fetch paginated transaction history for an account from Horizon. |
| `useSequenceNumber()` | Track and auto-increment the sequence number for an account. |
| `useFeeStats()` | Fetch recent fee statistics (percentiles) from Horizon. |
| `useOfferBook()` | Fetch the order book for a given asset pair. |
| `useLiquidityPool()` | Fetch a liquidity pool's details by pool ID. |
| `useAccountLiquidityPositions()` | List liquidity pool positions for a given account. |
| `useAssetSearch()` | Search Stellar assets via the StellarExpert API. |

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

For a cross-hook breakdown of how `error`, `isError`, `refetch`, and `reset` behave, see the [Error Handling Patterns](docs/guides/error-handling.md) guide.

| Hook | Description |
|------|-------------|
| [`useSorobanContract()`](#usesorobancontractoptions) ↓ | Simulate → sign → submit → poll a Soroban contract call in one hook. |
| [`useLedgerEntry()`](#useledgerentryledgerkey-options) ↓ | Read a raw Soroban ledger entry without constructing a contract call. |
| [`useSorobanServer()`](#usesorobanserver) ↓ | Get a configured `SorobanRpc.Server` instance from the provider context. |
| `useContractEvents()` | Poll Soroban contract events from RPC. |
| `useContractId()` | Compute a contract ID from an asset descriptor (issuer + code). |

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

### `useNetworkConfig()`

Read the full active network configuration object from the provider context without drilling props around your tree.

```tsx
import { useNetworkConfig } from "stellar-hooks";

function NetworkBadge() {
  const { network, horizonUrl, sorobanRpcUrl, networkPassphrase } = useNetworkConfig();

  return <pre>{JSON.stringify({ network, horizonUrl, sorobanRpcUrl, networkPassphrase }, null, 2)}</pre>;
}
```

### `useHorizonServer()`

Return the configured Horizon server instance for custom queries beyond the built-in hooks.

```tsx
import { useHorizonServer } from "stellar-hooks";

function CustomHorizonExample() {
  const server = useHorizonServer();

  async function loadAccountOffers(publicKey: string) {
    return server.offers().forAccount(publicKey).call();
  }

  return null;
}
```

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

---

### `useAssetBalance(publicKey, asset, options?)`

Fetch a specific asset balance (native XLM or issued asset) for a given public key.

```ts
const { balance, isLoading, error } = useAssetBalance("G...", "native");
// balance → StellarBalance | null

const { balance } = useAssetBalance("G...", { code: "USDC", issuer: "G..." });
```

Supports the same `refetchInterval` and `enabled` options as `useStellarAccount`.

---

### `useTrustlines(publicKey)`

List and manage trustlines for an account.

```ts
const { trustlines, addTrustline, removeTrustline, status } = useTrustlines("G...");

await addTrustline({ code: "USDC", issuer: "G..." });  // add a trustline
await removeTrustline({ code: "USDC", issuer: "G..." }); // remove (set limit to 0)

// status: "idle" | "submitting" | "success" | "error"
// Each mutation signs via Freighter and submits through Horizon.
```

---

### `useAccountMerge()`

Merge the funded account into a destination account via Freighter. This
permanently closes the source account and transfers its entire XLM balance —
the operation is irreversible.

```ts
const { submit, status, hash, error } = useAccountMerge({
  destination: "GDEST...",
  memo: "closing out", // optional
});

await submit();
```

---

### `useSorobanServer()`

Get a configured `SorobanRpc.Server` instance from the `StellarProvider` context.

```ts
const server = useSorobanServer();
// Equivalent to: new SorobanRpc.Server(config.sorobanRpcUrl)

// Useful for ad-hoc RPC calls outside of the existing hooks:
const account = await server.getAccount("G...");
const ledgerEntries = await server.getLedgerEntries(key);
```

Throws a descriptive error if used outside `<StellarProvider>`.

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
  AssetDescriptor,
  UseAssetBalanceReturn,
  TrustlineAsset,
  UseTrustlinesReturn,
  UseAccountMergeReturn,
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

See [MIGRATION.md](MIGRATION.md) for a version-by-version guide to breaking changes and how to update your code.

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

Shipped:

- [x] `useFreighter()` — Freighter wallet connection, signing, and `signMessage`
- [x] `useWalletKit()` / `useWalletsKit()` / `useWalletConnect()` — multi-wallet adapters (Freighter, Lobstr, xBull, Albedo)
- [x] `useStellarAccount()` / `useStellarAccounts()` / `useStellarBalance()` — account and balance reads
- [x] `useTransaction()` / `useStellarTransaction()` — submit and poll transactions
- [x] `usePayment()` — build, sign, and submit classic payments
- [x] `usePathPayment()` — strict send / strict receive path payments
- [x] `useClaimableBalance()` — claim and create claimable balances
- [x] `useTrustline()` / `useTrustlines()` — trustline reads and management
- [x] `useSorobanContract()` / `useLedgerEntry()` / `useSorobanServer()` — Soroban contract calls and raw ledger reads
- [x] `useContractEvents()` — poll Soroban contract events from RPC
- [x] `useContractId()` — derive a contract ID from an asset descriptor
- [x] `useOrderBook()` / `useOffers()` / `useTrades()` / `useStrictSendPaths()` — DEX data
- [x] `useLiquidityPool()` / `useAccountLiquidityPositions()` — liquidity pool data
- [x] `useStellarToml()` — SEP-1 `stellar.toml` fetching and parsing
- [x] `useMultiSig()` — multi-sig signature collection and submission
- [x] `useNetworkStatus()` / `useFeeStats()` — network health and fee statistics
- [x] React Query and SWR adapter packages
- [x] Devtools hook-activity overlay

Planned:

- [ ] `useFederation()` — SEP-2 federated address resolution
- [ ] `useWebAuth()` — SEP-10 challenge/response authentication
- [ ] `useAnchorTransfer()` — SEP-6 / SEP-24 deposit and withdrawal flows
- [ ] `useAnchorQuote()` — SEP-38 firm quotes
- [ ] Streaming (SSE) variants for account, operation, and effect hooks
- [ ] React Native support for the wallet hooks

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

---

### `useTrades(publicKey, options?)`

Fetch DEX trade history for a given Stellar account from Horizon's `/accounts/{id}/trades` endpoint.
Supports optional asset pair filtering and cursor-based pagination.

```ts
import { useTrades } from "stellar-hooks";
import { Asset } from "@stellar/stellar-sdk";

// Basic usage — account trade history
const {
  trades,        // TradeRecord[]
  isLoading,     // boolean
  error,         // Error | null
  lastFetchedAt, // Date | null
  refetch,       // () => Promise<void>
} = useTrades("G...", {
  limit: 20,              // default: 10
  order: "desc",          // default: "desc"
  cursor: "12345",        // optional, for pagination
  refetchInterval: 10000, // optional, poll every 10 s
});

// With asset pair filter
const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const { trades } = useTrades("G...", {
  baseAsset: Asset.native(),
  counterAsset: new Asset("USDC", USDC_ISSUER),
});
```

Each `TradeRecord` exposes: `id`, `ledger_close_time`, `base_amount`, `base_asset_type`,
`counter_amount`, `counter_asset_type`, `base_is_seller`, `price`, and more.

---

### `useOrderBook(selling, buying, options?)`

Query the Stellar DEX order book for a given selling/buying asset pair.
Supports both native XLM and any issued asset. Optionally polls at `refetchInterval` for live price feeds.

```ts
import { useOrderBook } from "stellar-hooks";
import { Asset } from "@stellar/stellar-sdk";

const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

function SwapPriceDisplay() {
  const { bids, asks, isLoading, error, refetch } = useOrderBook(
    Asset.native(),
    new Asset("USDC", USDC_ISSUER),
    { limit: 10, refetchInterval: 5000 },
  );

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Error: {error.message}</p>;

  const bestBid = bids[0]?.price ?? "—";
  const bestAsk = asks[0]?.price ?? "—";

  return (
    <div>
      <p>Best Bid: {bestBid} USDC</p>
      <p>Best Ask: {bestAsk} USDC</p>
    </div>
  );
}
```

| Property | Type | Description |
|----------|------|-------------|
| `bids` | `OrderBookLevel[]` | Buy-side price levels (highest first) |
| `asks` | `OrderBookLevel[]` | Sell-side price levels (lowest first) |
| `raw` | `OrderBookRecord \| null` | Full raw Horizon response |
| `isLoading` | `boolean` | `true` while fetching |
| `error` | `Error \| null` | Last fetch error |
| `lastFetchedAt` | `Date \| null` | Timestamp of last successful fetch |
| `refetch` | `() => Promise<void>` | Manually trigger a re-fetch |

---

### `useStrictSendPaths(sourceAsset, sourceAmount, destinationAssets, options?)`

Discover available payment paths and exchange rates via Horizon's `/paths/strict-send` endpoint
before the user commits to a swap. Automatically re-queries when inputs change, with a configurable
debounce (default **300 ms**).

```ts
import { useStrictSendPaths } from "stellar-hooks";
import { Asset } from "@stellar/stellar-sdk";

const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

function SwapRatePreview({ sendAmount }: { sendAmount: string }) {
  const { paths, isLoading, error } = useStrictSendPaths(
    Asset.native(),
    sendAmount,
    [new Asset("USDC", USDC_ISSUER)],
    { debounceMs: 300 }, // default
  );

  if (isLoading) return <p>Finding best rate…</p>;
  if (error) return <p>Error: {error.message}</p>;

  const best = paths[0];
  if (!best) return <p>No paths found.</p>;

  return (
    <p>
      Send {best.source_amount} XLM → Receive ~{best.destination_amount} USDC
    </p>
  );
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `debounceMs` | `number` | `300` | Delay in ms before re-querying on input change |
| `enabled` | `boolean` | `true` | Set `false` to disable fetching |

| Return value | Type | Description |
|---|---|---|
| `paths` | `PathRecord[]` | Available paths sorted by Horizon (best first) |
| `isLoading` | `boolean` | `true` while a query is in flight |
| `error` | `Error \| null` | Last fetch error |
| `lastFetchedAt` | `Date \| null` | Timestamp of last successful fetch |

---

### `useStellarToml(domain, options?)`

Fetch and parse a domain's `stellar.toml` file via the [SEP-1](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0001.md)
resolver. The full parsed document is returned as `data`, with the most-used well-known fields lifted
to the top level. Results are cached per domain for **5 minutes** by default.

```tsx
import { useStellarToml } from "stellar-hooks";

function AnchorInfo() {
  const {
    data,
    federationServer,
    signingKey,
    currencies,
    documentation,
    isLoading,
    error,
  } = useStellarToml("stellar.org");

  if (isLoading) return <p>Loading stellar.toml…</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <h3>{documentation?.ORG_NAME ?? "Unknown org"}</h3>
      <p>Federation: {federationServer ?? "not published"}</p>
      <p>Signing key: {signingKey ?? "none"}</p>
      <ul>
        {currencies.map((c) => (
          <li key={`${c.code}-${c.issuer}`}>{c.code}</li>
        ))}
      </ul>
      <p>Version: {data?.VERSION}</p>
    </div>
  );
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cacheTTL` | `number` | `300000` | Cache lifetime in ms for the resolved document |
| `allowHttp` | `boolean` | `false` | Allow resolving over plain HTTP instead of HTTPS |
| `timeout` | `number` | SDK default | Request timeout in ms passed to the resolver |

| Return value | Type | Description |
|---|---|---|
| `data` | `StellarTomlData \| null` | Full parsed document; unlisted fields via index signature |
| `federationServer` | `string \| null` | `FEDERATION_SERVER` (SEP-2) |
| `signingKey` | `string \| null` | `SIGNING_KEY` used to verify the domain's signatures |
| `webAuthEndpoint` | `string \| null` | `WEB_AUTH_ENDPOINT` (SEP-10) |
| `transferServer` | `string \| null` | `TRANSFER_SERVER` (SEP-6) |
| `kycServer` | `string \| null` | `KYC_SERVER` (SEP-12) |
| `networkPassphrase` | `string \| null` | `NETWORK_PASSPHRASE` the domain operates on |
| `currencies` | `StellarTomlCurrency[]` | `[[CURRENCIES]]` entries, empty array when absent |
| `documentation` | `StellarTomlDocumentation \| null` | `[DOCUMENTATION]` organisation metadata |
| `isLoading` | `boolean` | `true` while the document is being resolved |
| `error` | `Error \| null` | Last resolve error |
| `refetch` | `() => Promise<void>` | Force a refetch, bypassing the cache |

Passing `null` or `undefined` as the domain keeps the hook idle and clears any previous result.
