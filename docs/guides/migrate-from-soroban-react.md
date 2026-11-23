# Migrating from soroban-react

> **Last verified:** stellar-hooks v0.2.0 (2026-11-23)

This guide maps [`soroban-react`](https://github.com/soroban-react/soroban-react) (`@soroban-react/core`,
`@soroban-react/contracts`, wallet connector packages) to `stellar-hooks`. The soroban-react side is
described from its documented 9.x API; check names against the version you run.

## The short version

| soroban-react | stellar-hooks |
| --- | --- |
| `<SorobanReactProvider chains activeChain connectors appName>` | `<StellarProvider network="testnet">` |
| `useSorobanReact()` | `useWalletKit()` / `useWallet()` for the wallet, `useNetworkConfig()` for the network |
| `address` | `publicKey` |
| `connect()` / `disconnect()` | `connect(walletId?)` / `disconnect()` |
| `connectors`, `activeConnector`, `setActiveConnectorAndConnect` | `availableWallets`, `activeWallet`, `setActiveWallet`, `connect(id)` |
| `activeChain` (`{ id, networkPassphrase, sorobanRpcUrl, ... }`) | `useNetworkConfig()` (`network`, `horizonUrl`, `sorobanRpcUrl`, `networkPassphrase`) |
| `server` / `sorobanServer` | `useHorizonServer()` / `useSorobanServer()` |
| `contractInvoke({ signAndSend: false })` | `useSorobanRead(contractId, method, args)` |
| `contractInvoke({ signAndSend: true })` | `useSorobanContract({ contractId, method, args })` then `call()` |
| `useContractValue` | `useSorobanRead` |

## 1. Provider

soroban-react takes a list of chains and connectors:

```tsx
import { SorobanReactProvider } from "@soroban-react/core";
import { testnet } from "@soroban-react/chains";
import { freighter } from "@soroban-react/freighter";

<SorobanReactProvider chains={[testnet]} activeChain={testnet} connectors={[freighter()]} appName="My app">
  <App />
</SorobanReactProvider>;
```

stellar-hooks has one network and detects wallets itself, so the provider is one prop:

```tsx
import { StellarProvider } from "stellar-hooks";

<StellarProvider network="testnet">
  <App />
</StellarProvider>;
```

Behavior differences:

- There is no `chains` array. To switch networks at runtime use `useStellarNetwork().setNetwork()`; see the
  [network switching guide](./network-switching.md).
- There is no connectors list to configure. Freighter, Lobstr and xBull show up in `availableWallets` when
  they are installed. To add or remove wallets see
  [CONTRIBUTING_WALLET_ADAPTERS.md](../../CONTRIBUTING_WALLET_ADAPTERS.md).

## 2. Connecting a wallet

```tsx
// soroban-react
const { address, connect, disconnect, connectors, setActiveConnectorAndConnect } = useSorobanReact();
```

```tsx
// stellar-hooks
import { useWalletKit } from "stellar-hooks";

const { publicKey, availableWallets, connect, disconnect } = useWalletKit();

availableWallets.map((id) => <button key={id} onClick={() => connect(id)}>Connect {id}</button>);
```

Behavior differences:

- `connect()` returns the public key (or `null`) instead of resolving to nothing; failures land in `error`.
- A user declining a prompt is a `UserRejectedError` (see the [error handling guide](./error-handling.md)),
  not a generic thrown error.
- If you only support Freighter, `useFreighter()` is smaller and adds `autoConnect` and
  `networkPassphraseMismatch`.

## 3. Reading contract state

```tsx
// soroban-react
const value = await contractInvoke({
  contractAddress,
  method: "get_count",
  args: [],
  sorobanContext,
  signAndSend: false,
});
```

```tsx
// stellar-hooks: a hook that simulates, re-fetches when the arguments change, and caches
import { useSorobanRead } from "stellar-hooks";

const { data, isLoading, error, refetch } = useSorobanRead<number>(contractId, "get_count", []);
```

Behavior differences:

- Reads are declarative and re-run automatically; there is no imperative call to await. Use `refetch()` for a
  manual refresh and `enabled: false` to hold a read until its inputs exist.
- Results are cached for 30 seconds by default (`cacheTTL`), and `parseResult` converts the `ScVal`.

## 4. Writing (invoke, sign, submit)

```tsx
// soroban-react
await contractInvoke({
  contractAddress,
  method: "increment",
  args: [nativeToScVal(1, { type: "u32" })],
  sorobanContext,
  signAndSend: true,
});
```

```tsx
// stellar-hooks
import { nativeToScVal } from "@stellar/stellar-sdk";
import { useSorobanContract } from "stellar-hooks";

const { call, status, hash, error } = useSorobanContract({
  contractId,
  method: "increment",
  args: [nativeToScVal(1, { type: "u32" })],
});

<button onClick={() => call()} disabled={status !== "idle"}>{status}</button>;
```

Behavior differences:

- Status is explicit: `idle`, `building`, `signing`, `submitting`, `polling`, `success`, `error`. Drive
  your UI from it instead of tracking a promise.
- The hook simulates, signs, submits and polls for confirmation; it does not return before the transaction is
  confirmed or failed.
- soroban-react's `reconnectAfterTx` has no equivalent, and nothing needs it.

## 5. Other things you may be using

| soroban-react | stellar-hooks |
| --- | --- |
| `useRegisteredContract` | Pass the contract id directly to the hook that needs it. |
| `contractTransaction` | `useTransaction()` to submit a pre-built signed XDR. |
| `useSorobanReact().serverHorizon` | `useHorizonServer()` |

## Migration checklist

1. Install `stellar-hooks` and remove the `@soroban-react/*` packages.
2. Replace the provider; delete the chain and connector setup.
3. Replace `useSorobanReact()` calls with `useWalletKit()` and `useNetworkConfig()`.
4. Replace `contractInvoke` reads with `useSorobanRead` and writes with `useSorobanContract`.
5. Test connect, a read, and a write on testnet before shipping.
