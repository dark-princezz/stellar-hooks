# Choosing between built-in context and an external store

stellar-hooks keeps its own state (network, hook results) in `<StellarProvider>`. Wallet and account
state can additionally be mirrored into the store your app already uses.

## When the default provider is enough

- The wallet connection is read in a handful of components, close to where `useFreighter()` is called.
- You do not need wallet state outside React (route guards, analytics, non-React code).
- You do not already run Zustand, Jotai or Redux, and do not want another moving part.

Start here. `useFreighter()` and `useStellarAccount()` already give you connection, public key and balances.

## When an external store is worth it

- Many distant components, or non-React code, need the public key or balances.
- State must persist or be inspected together with the rest of your app state (devtools, time travel).
- The app is already standardised on one of the libraries below and you want one source of truth.

## Adapters

All adapters share one reducer and state shape (`WalletState`: `status`, `publicKey`, `network`,
`balances`, `error`), so behaviour is identical. None of the libraries is a dependency of stellar-hooks.

| Library | Export | Usage |
| --- | --- | --- |
| Zustand | `createWalletStore()` | `useStore(walletStore, (s) => s.publicKey)` |
| Jotai | `createWalletAtoms(atom)` | pass Jotai's own `atom`; compose `walletAtom`, `publicKeyAtom`, ... |
| Redux Toolkit | `walletSlice` | `configureStore({ reducer: { wallet: walletSlice.reducer } })` |

### Keeping the store in sync

```tsx
import { useSyncWalletState, walletActions } from "stellar-hooks";

function WalletSync() {
  useSyncWalletState(store.dispatch, { balances });
  return null;
}
```

`useSyncWalletState` takes any `(action) => void`, so it works with Redux `store.dispatch`, a Zustand
wrapper (`(a) => walletStore.setState(walletReducer(walletStore.getState(), a))`) or a Jotai
`set(dispatchAtom, action)` call. Mount it once near the root.

## Trade-offs

- Mirroring adds one render pass when the connection changes; keep derived data in selectors.
- Disconnecting clears the public key and balances, so stale account data never outlives a session.
- Do not copy secrets (signing keys, mnemonics) into any store; only public data belongs here.
