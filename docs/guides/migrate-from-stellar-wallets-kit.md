# Migrating from Stellar Wallets Kit

[Stellar Wallets Kit](https://github.com/Creit-Tech/Stellar-Wallets-Kit) (`@creit-tech/stellar-wallets-kit`)
gives you one API over many wallets. stellar-hooks has two ways to get the same result, depending on how much
you want to keep from the kit:

| You want | Use |
| --- | --- |
| The kit's modal and module system, with React state | [`useWalletsKit()`](#option-a-keep-the-kit-usewalletskit), a hook around the kit |
| Built-in adapters and your own picker UI, no kit | [`useWallet()`](#option-b-use-built-in-adapters-usewallet) (or the lighter `useWalletKit()`) |

The kit's own API changed between major versions (an instance with `openModal`, then a static `StellarWalletsKit`
with `authModal`). Both are shown where they differ; use the one matching your installed version.

## Concept map

| Stellar Wallets Kit | stellar-hooks |
| --- | --- |
| `new StellarWalletsKit({ modules, network, selectedWalletId })` / `StellarWalletsKit.init(...)` | `useWalletsKit({ modules, network, selectedWalletId })`, or no setup with `useWallet()` |
| Wallet modules (`allowAllModules()`, `defaultModules()`) | Built-in adapters (Freighter, Lobstr, xBull, Albedo, Rabet, Ledger) detected automatically; extra ones via the `adapters` option |
| `openModal({ onWalletSelected })` / `authModal()` | `connect()` (kit modal) or `connect(walletId)` (your own buttons) |
| `setWallet(id)` | `setActiveWallet(id)` / `connect(id)` |
| `getAddress()` | `publicKey` |
| `signTransaction(xdr, { address, networkPassphrase })` | `signTransaction(xdr, { address, networkPassphrase })` |
| `signAuthEntry`, `signMessage` | same names |
| Supported wallets list (`getSupportedWallets()`) | `availableWallets` (ids) or `wallets` (`id`, `name`, `meta`, `isInstalled`) |
| State/disconnect events | `isConnecting`, `error` state, `disconnect()` |

## Option A: keep the kit (`useWalletsKit`)

Kit only (v1, instance API):

```tsx
const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  selectedWalletId: FREIGHTER_ID,
  modules: allowAllModules(),
});

async function connect() {
  await kit.openModal({
    onWalletSelected: async (option) => {
      kit.setWallet(option.id);
      const { address } = await kit.getAddress();
      setAddress(address);
    },
  });
}
```

With the hook:

```tsx
import { useWalletsKit } from "stellar-hooks";
import { defaultModules } from "@creit-tech/stellar-wallets-kit/modules/utils";

function Connect() {
  const { connect, disconnect, isConnected, isConnecting, publicKey, signTransaction, error } =
    useWalletsKit({ modules: defaultModules() });

  if (isConnected) return <button onClick={disconnect}>{publicKey}</button>;
  return <button onClick={connect} disabled={isConnecting}>Connect wallet</button>;
}
```

Notes:

- The hook initialises the kit once from the options you pass, listens to its state events, and restores a
  persisted session, so the `useEffect`/`useState` plumbing goes away.
- `connect()` opens the kit's auth modal and resolves to the address or `null` (failures are in `error`).
- The network defaults to the `<StellarProvider network="...">` passphrase; pass `network` only to override.
- `disconnect()` clears the hook's state.
- `useWalletsKit` needs `@creit-tech/stellar-wallets-kit` installed; stellar-hooks does not bundle it.

## Option B: use built-in adapters (`useWallet`)

If you used the kit mainly for "let the user pick a wallet", the built-in adapters cover it without the extra dependency
and let you render your own picker:

```tsx
import { useWallet } from "stellar-hooks";

function WalletPicker() {
  const { wallets, publicKey, connect, disconnect, isConnecting, error } = useWallet();

  if (publicKey) return <button onClick={disconnect}>Disconnect {publicKey}</button>;

  return (
    <>
      {wallets.map(({ id, name, isInstalled }) => (
        <button key={id} disabled={!isInstalled || isConnecting} onClick={() => connect(id)}>
          {isInstalled ? `Connect ${name}` : `Install ${name}`}
        </button>
      ))}
      {error && <p role="alert">{error.message}</p>}
    </>
  );
}
```

`useWalletKit()` is the smaller variant with `availableWallets`, `activeWallet`, `setActiveWallet`, `connect`, `disconnect` and
`signTransaction`.

### Wallets the kit has that the adapters may not

Check the wallet is in the list returned by `useWallet().wallets`. For one that is not, either keep using the kit
through Option A, or register your own adapter (see
[CONTRIBUTING_WALLET_ADAPTERS.md](../../CONTRIBUTING_WALLET_ADAPTERS.md)).

## Signing and sending

Whichever option you pick, the write hooks (`usePayment`, `usePathPayment`, `useSorobanContract`,
`useTransaction`) take a `walletId` and sign with the active wallet, so you rarely call `signTransaction` yourself:

```tsx
const { submit, status, hash } = usePayment({
  destination, asset: { type: "native" }, amount: "10", walletId: "freighter",
});
```

## Differences to know about

- The kit shows a ready-made modal; with `useWallet` you render the picker, in exchange for full control of the UI.
- Errors: a user closing a prompt is a `UserRejectedError` in the hooks, not an untyped rejection.
- `signTransaction` returns the signed XDR string directly rather than `{ signedTxXdr }`.
- There is no instance to pass around; wallet state is shared through the provider and hooks.

## Checklist

1. Add `<StellarProvider network="...">` at the root.
2. Replace the kit setup with `useWalletsKit({ modules })` (Option A) or `useWallet()` (Option B).
3. Replace modal/`getAddress` code with `connect` and `publicKey`.
4. Replace direct signing with the write hooks, or `signTransaction` where you need raw XDR.
5. Test connect, disconnect and one signed transaction per wallet you support on testnet.
