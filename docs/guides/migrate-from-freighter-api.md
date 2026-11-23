# Migrating from `@stellar/freighter-api`

> **Last verified:** stellar-hooks v0.2.0 (2026-11-23)

If you call `@stellar/freighter-api` directly, `useFreighter()` gives you the same wallet with React state
handled for you: connection, address, network, loading and error are values you read instead of
promises you track. It is built on `@stellar/freighter-api` v6, so the calls below map one to one.

```ts
import { useFreighter } from "stellar-hooks";
```

## Cheat sheet

| `@stellar/freighter-api` | `useFreighter()` |
| --- | --- |
| `isConnected()` | `isInstalled` |
| `isAllowed()` / `setAllowed()` / `requestAccess()` | `isConnected` and `connect()` |
| `getAddress()` | `publicKey` |
| `getNetwork()` / `getNetworkDetails()` | `network`, `networkPassphrase` |
| `signTransaction(xdr, opts)` | `signTransaction(xdr, opts)` |
| `signAuthEntry(entry, opts)` | `signAuthEntry(entry)` |
| `signMessage(msg, opts)` | `signMessage(msg, opts)` (and `signBlob`) |
| `WatchWalletChanges` | built in: state follows the wallet |
| `{ error }` in every result | thrown errors and `error` state |

## 1. Detecting the extension and connecting

Direct:

```ts
import { isConnected, isAllowed, requestAccess, getAddress } from "@stellar/freighter-api";

const installed = (await isConnected()).isConnected;
if (installed) {
  const allowed = (await isAllowed()).isAllowed;
  const { address, error } = allowed ? await getAddress() : await requestAccess();
  if (error) throw new Error(error.message);
  setAddress(address);
}
```

With the hook:

```tsx
const { isInstalled, isConnected, publicKey, connect, isLoading, error } = useFreighter();

if (!isInstalled) return <p>Install Freighter</p>;
if (!isConnected) return <button onClick={connect} disabled={isLoading}>Connect</button>;
return <p>{publicKey}</p>;
```

The `isAllowed()` then `requestAccess()` sequence is inside `connect()`. Pass `autoConnect: true` to
reconnect returning users silently on mount (`isAutoConnecting` is true while that check runs).

## 2. Reading the network

Direct:

```ts
const { network, networkPassphrase } = await getNetworkDetails();
if (networkPassphrase !== EXPECTED) showWarning();
```

With the hook, `network` and `networkPassphrase` are state, and the mismatch check is built in. Inside
`<StellarProvider network="testnet">` the expected passphrase is taken from the provider:

```tsx
const { networkPassphraseMismatch, networkPassphraseWarning } = useFreighter();
return networkPassphraseMismatch ? <p role="alert">{networkPassphraseWarning}</p> : null;
```

## 3. Signing a transaction

Direct:

```ts
const { signedTxXdr, error } = await signTransaction(xdr, { networkPassphrase, address });
if (error) throw new Error(error.message);
```

With the hook the signed XDR is returned and failures are thrown. A user declining the prompt is a
`UserRejectedError`, so you can tell it apart from a real failure:

```ts
import { UserRejectedError } from "stellar-hooks";

try {
  const signed = await signTransaction(xdr);
} catch (e) {
  if (e instanceof UserRejectedError) return; // user closed the prompt
  throw e;
}
```

`networkPassphrase` and `address` default to the hook's current values; pass them only to override.
In most apps you will not call this at all: `usePayment`, `useSorobanContract` and the other write hooks
build, sign (through Freighter or the active wallet), submit and poll for you.

## 4. Signing a message (sign-in with Stellar)

Direct:

```ts
const { signedMessage, error } = await signMessage(challenge, { address });
```

With the hook:

```tsx
const { signMessage, isSigningMessage } = useFreighter();
const signature = await signMessage(challenge);
```

`isSigningMessage` drives a disabled/"Signing…" button state without extra `useState`.

## 5. Watching for wallet changes

Direct, you subscribe and clean up yourself:

```ts
const watcher = new WatchWalletChanges(3000);
watcher.watch(({ address, network }) => update(address, network));
// ...and watcher.stop() on unmount
```

With the hook there is nothing to subscribe to or stop: `publicKey`, `network` and
`networkPassphrase` update when the wallet changes and the subscription is cleaned up on unmount.

## What you can drop

- Your own `useEffect` that polls `isConnected()` and `getAddress()`.
- `useState` for address, network, loading and error.
- Mapping Freighter's `{ error }` result shape to thrown errors.

## Differences to know about

- Results are unwrapped: you get the string back, not `{ signedTxXdr, error }`.
- `signAuthEntry` takes only the entry; the address comes from the connected account.
- The deprecated `accountToSign` option is replaced by `address`
  (see [freighter-api-migration.md](../freighter-api-migration.md)).
- Want more wallets than Freighter later? Switch to [`useWalletKit` or `useWallet`](./migrate-from-stellar-wallets-kit.md); the
  calls you just moved to (`connect`, `publicKey`, `signTransaction`) keep the same names.
