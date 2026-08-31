# Network Switching & Mismatch Handling

`stellar-hooks` lets you target **testnet**, **mainnet**, or **futurenet** (plus fully custom networks). Because a Stellar transaction is only valid on the network whose passphrase it was signed for, the single most important rule is:

> **The app's configured network must match the network your wallet is connected to.** A mismatch means every signature is on the wrong network — often with funds at risk.

This guide explains where the app's network comes from, how the library detects a wallet/app mismatch, and how to handle it in your UI.

## Where the app's network comes from

The active network is owned by `<StellarProvider>` and is resolved in one place:

```tsx
<StellarProvider network="testnet">{/* ... */}</StellarProvider>
```

- `network="testnet" | "mainnet" | "futurenet"` selects a **preset** from `NETWORK_CONFIGS`.
- `network="custom"` (plus `customConfig`) lets you supply your own `horizonUrl`, `sorobanRpcUrl`, and `networkPassphrase`.
- The provider **defaults to `testnet`** when no prop is passed.

Each preset pins three values that every network-aware hook depends on:

| Network | Passphrase | Horizon | Soroban RPC |
|---|---|---|---|
| `testnet` | `Test SDF Network ; September 2015` | `https://horizon-testnet.stellar.org` | `https://soroban-testnet.stellar.org` |
| `mainnet` | `Public Global Stellar Network ; September 2015` | `https://horizon.stellar.org` | `https://mainnet.sorobanrpc.com` |
| `futurenet` | `Test SDF Future Network ; October 2022` | `https://horizon-futurenet.stellar.org` | `https://rpc-futurenet.stellar.org` |

You can read — and programmatically change — this configuration with `useNetwork`:

```tsx
import { useNetwork } from "stellar-hooks";

const { network, networkPassphrase, horizonUrl, sorobanRpcUrl, switchNetwork } = useNetwork();

switchNetwork("mainnet");      // switches the app to mainnet
switchNetwork("custom", {      // switches to a custom network
  horizonUrl: "...",
  sorobanRpcUrl: "...",
  networkPassphrase: "...",
});
```

Switching that way has three effects:

1. The provider recomputes `config` (new Horizon / RPC / passphrase).
2. In-flight requests are invalidated via an internal version/epoch bump, so stale results are dropped.
3. The selection is persisted to `localStorage` and restored on the next load.

> Note: `useNetwork` configures the **app**. It does not change what the **freighter wallet** is connected to — that is a separate, wallet-side setting.

## How a wallet/app mismatch is detected

The wallet reports which network it is connected to. `useFreighter` reads that and compares the wallet's **network passphrase** to the **app's configured passphrase** (`config.networkPassphrase`):

```tsx
import { useFreighter } from "stellar-hooks";

const {
  isConnected,
  publicKey,
  network,                    // network the wallet reports (e.g. "TESTNET")
  networkPassphrase,          // passphrase the wallet reports
  networkPassphraseMismatch,  // boolean: does it differ from the app?
  networkPassphraseWarning,   // human-readable explanation, or null
  connect,
} = useFreighter();
```

The comparison is strict and string-based on the passphrase:

- `networkPassphraseMismatch` is `true` when the wallet is connected **and** the wallet's passphrase differs from the app's configured passphrase.
- `networkPassphraseWarning` is a ready-to-render message when that mismatch is present (and `null` otherwise).

## How hooks behave on a mismatch

The mismatch is a **guard rail, not an exception**. The library does not throw or silently re-target — it reports the condition through `useFreighter` so your code stays the single source of truth:

- **Read hooks** — query the network the *app* is configured for (they never sign), so a wallet mismatch does not corrupt reads. But account data shown may not be the same network the wallet holds.
- **Write hooks** (`usePayment`, `useStellarTransaction`, `useSorobanContract.write`, ...) **build** the transaction with **`config.networkPassphrase`** (the app's), then hand the envelope to the wallet to sign. `useFreighter.signTransaction` signs with an explicit passphrase only if one is passed; otherwise it falls back to the wallet's current network. Either way, if the wallet is on a different network than the app, the signature covers an envelope for one network while the user believes it is for another — it will be rejected by the mismatched network.
- `useFreighter` keeps doing its normal work; it just flags the condition.

Because the app and the wallet are independent, the correct resolution is to align the two explicitly (below). Never assume they match just because both are "testnet" — a renamed or custom network with the same label but a different passphrase is still a mismatch.

## Handling the mismatch in your UI

### 1. Render the warning, gate signing

`networkPassphraseWarning` is a complete sentence you can drop straight into a banner. While `networkPassphraseMismatch` is `true`, disable signing affordances so a user cannot broadcast on the wrong network:

```tsx
import { useFreighter } from "stellar-hooks";

function WalletPanel() {
  const {
    isConnected,
    publicKey,
    connect,
    networkPassphraseMismatch,
    networkPassphraseWarning,
  } = useFreighter();

  if (!isConnected) return <button onClick={connect}>Connect Freighter</button>;

  return (
    <div>
      <p>Connected as {publicKey}</p>
      {networkPassphraseMismatch && networkPassphraseWarning && (
        <div role="alert">
          <p>{networkPassphraseWarning}</p>
        </div>
      )}
    </div>
  );
}
```

While the banner is visible, disable any submit/sign buttons in your app so a user cannot broadcast on the wrong network.


### 2. Align either side

Two ways to resolve a mismatch — pick whichever fits your product:

- **Change the app** to the wallet's network (read-only dApps, demo mode). `useFreighter().network` reports the wallet's own label (e.g. `"TESTNET"`), which you should normalize to a `StellarNetwork` before calling `switchNetwork`:
  ```tsx
  const { switchNetwork } = useNetwork();
  const { network: walletNetwork } = useFreighter();

  const PRESETS: Record<string, "testnet" | "mainnet" | "futurenet"> = {
    TESTNET: "testnet",
    MAINNET: "mainnet",
    "Future Network": "futurenet",
  };

  switchNetwork(PRESETS[walletNetwork!] ?? "testnet");
  ```
- **Ask the user** to switch the wallet, then call `connect()` again so `useFreighter` re-probes:
  ```tsx
  const { connect } = useFreighter();
  // after the user switches: await connect(); // re-reads wallet network
  ```

Sign only after `networkPassphraseMismatch === false`.

### 3. React to `switchNetwork` in connected hooks

Because a network change bumps the request version/epoch, connected read hooks invalidate and refetch automatically. Write hooks built with `useSorobanContract`, `usePayment`, etc. re-derive `config.networkPassphrase` from context, so a later call signs for whatever network is current — always confirm the banner is gone before enabling the submit button.

## Env vars

`StellarProvider` accepts a `customConfig` object for custom networks; there is no required environment variable. Example apps commonly let you select `testnet`/`mainnet`/`futurenet` at runtime via `useNetwork`, which is the recommended approach over baking a network into the build.

## Summary

- The **app** picks a network via `<StellarProvider network>`; `useNetwork` reads/switches it.
- The **wallet** picks its own network; `useFreighter` exposes it.
- `networkPassphraseMismatch` / `networkPassphraseWarning` tell you when the two disagree.
- Treat a mismatch as a hard gate on signing; align one side before proceeding.

## See Also

- [Provider Setup](/guide/provider) — `StellarProvider` props and custom networks
- [useNetwork](/hooks/use-network) — reading and switching the app network
- [useFreighter](/hooks/use-freighter) — wallet connection and mismatch fields
- [Error Handling](/guide/error-handling) — the wallet guard-rail pattern
