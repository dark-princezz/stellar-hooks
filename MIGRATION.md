# Migration Guide

This document tracks breaking changes between `stellar-hooks` releases and how to update your code.

For a guide on migrating **from raw `@stellar/stellar-sdk` code to `stellar-hooks`**, see [docs/guides/migration-guide.md](docs/guides/migration-guide.md).

---

## v0.1.0 (Initial Release)

This is the first public release of `stellar-hooks`. There are no prior versions to migrate from.

### Highlights

- `<StellarProvider>` with `mainnet`, `testnet`, `futurenet`, and `custom` network configs
- Core hooks: `useFreighter`, `useStellarAccount`, `useStellarBalance`, `useSorobanContract`, `useTransaction`, `useLedgerEntry`
- Payment hooks: `usePayment`, `usePathPayment`
- Transaction helpers: `useAccountFlags`, `useAccountMerge`, `useBumpSequence`, `useInflation`, `useManageData`, `useTrustline`, `useCreateAccount`
- DEX hooks: `useTrade`, `useStellarOffers`, `useOfferBook`
- Discovery hooks: `useStellarToml`, `useAssetMetadata`, `useContractEvents`, `useEffects`, `useOperations`, `useAssets`
- Wallet adapters: `useWalletsKit`, `useWalletConnect`
- Branded types: `StellarPublicKey`, `StellarContractId`, `StellarXdrString`, `StellarTxHash`, `StellarAssetIssuer`
- Zod schemas for runtime validation of Horizon and Soroban RPC responses

---

## v0.2.0

### Breaking changes

#### `useAccountMerge` — migrated to options + `submit()` convention

The hook no longer exposes a `merge(destination, opts)` function. Instead, it follows the same `options` + `submit()` pattern used by every other write hook in the library.

**Before:**
```ts
const { merge, status, hash, error } = useAccountMerge();
await merge("GDEST...", { confirm: true });
```

**After:**
```ts
const { submit, status, hash, error } = useAccountMerge({
  destination: "GDEST...",
  memo: "closing out", // optional
  fee: 100,            // optional, default 100
  timeoutSeconds: 60,  // optional, default 60
});

await submit();
```

**Why:** The old `merge(destination, { confirm: true })` API was inconsistent with every other write hook in the library. The new API aligns with `usePayment`, `useTrade`, `useTrustline`, etc., all of which accept options in the hook call and expose a no-arg `submit()`.

### Deprecations

- `merge` and `confirm` (removed in v0.2.0 — use `submit` and the `destination` option instead).

### New features

- `useAccountMerge` now supports memo text, configurable fee, timeout, and `onSuccess` / `onError` callbacks.

---
