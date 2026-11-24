# React Native Compatibility Audit

> **Last verified:** stellar-hooks v0.2.0 (2026-11-23)

> **Issue:** #838 — Investigate React Native compatibility for core hooks
>
> This document catalogues every hook and utility that relies on browser-only globals
> (`window`, `document`, `localStorage`, `navigator`, `fetch`) and records what
> polyfill or alternate implementation is needed to run under React Native.

---

## Executive summary

The vast majority of stellar-hooks is environment-agnostic and works in React Native
without changes. The browser-only surface area falls into three tightly scoped
categories:

| Category | Hooks / files affected | Mitigation |
|---|---|---|
| **`localStorage` / persisted state** | `context.tsx`, `useWallet.ts`, `useFreighterAccounts.ts`, `utils/logger.ts` | ✅ Fixed in #840 — pass `storageAdapter={createAsyncStorageAdapter(AsyncStorage)}` |
| **Freighter extension detection** (`window.__FREIGHTER__`, `window.location`) | `wallets/freighter.ts`, `hooks/useFreighter.ts`, `wallets/deepLink.ts` | Browser-extension hooks are web-only by definition; use `useWallet` + deep-link adapter on mobile |
| **Other extension-based wallets** (`window.xBull`, `window.lobstrSignTransaction`, Rabet, Albedo, Ledger HID) | `wallets/xbull.ts`, `wallets/lobstr.ts`, `wallets/rabet.ts`, `wallets/albedo.ts`, `wallets/ledger.ts`, `wallets/xbull-walletconnect.ts`, `wallets/lobstr-walletconnect.ts` | Extension wallets always return `isInstalled() = false` on RN; WalletConnect variants work if polyfills are provided (see below) |

---

## Detailed findings

### 1. `src/context.tsx` — **fixed in #840**

**Browser API used:** `localStorage` (direct reads and writes for network persistence)

**Status:** Resolved. The `StellarHooksProvider` / `StellarProvider` now accept a
`storageAdapter` prop. Passing `createAsyncStorageAdapter(AsyncStorage)` from
`@react-native-async-storage/async-storage` removes all direct `localStorage` calls.

```tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStorageAdapter, StellarProvider } from "stellar-hooks";

<StellarProvider
  network="testnet"
  storageAdapter={createAsyncStorageAdapter(AsyncStorage)}
>
  <App />
</StellarProvider>
```

---

### 2. `src/hooks/useWallet.ts` — **fixed in #840**

**Browser API used:** `localStorage` (wallet type persistence for `autoConnect`)

**Status:** Resolved. Raw `localStorage` calls replaced with `createLocalStorageAdapter()`
which is a no-op when `localStorage` is undefined. React Native users who want
`autoConnect` persistence should pass a custom adapter — see `context.tsx` note above.

---

### 3. `src/hooks/useFreighterAccounts.ts`

**Browser API used:** `window.localStorage` for known-address history

**Status:** ⚠️ **Needs attention.** The internal `loadAddresses` / `saveAddresses`
helpers call `window.localStorage` directly. This hook is Freighter-specific and
will never be useful on React Native, but the `window.localStorage` guards should
be made consistent with the storage adapter pattern for SSR safety.

**Recommended action:** Replace the internal helpers with `createLocalStorageAdapter()`
to eliminate the explicit `window` reference (low priority — hook is browser-only).

---

### 4. `src/utils/logger.ts`

**Browser API used:** `localStorage` for the `stellar-hooks:debug` debug flag

**Status:** ⚠️ **Low impact.** The logger already guards all `localStorage` access
with `typeof window !== "undefined" && typeof localStorage !== "undefined"`, so it
is already safe in React Native — the debug flag simply cannot be persisted. No
action required.

---

### 5. Extension-based wallet adapters (Freighter, xBull, Lobstr, Rabet, Albedo, Ledger)

**Browser APIs used:**
- `window.__FREIGHTER__` — Freighter extension detection
- `window.xBullSDK` / `window.xBull` — xBull extension detection
- `window.lobstrSignTransaction` — Lobstr extension detection
- `window.rabet` — Rabet extension detection
- `window.albedo` (via `@albedo-link/intent`) — Albedo detection
- `window.location.href` — deep-link URI navigation (new in #839)
- `navigator.hid` — Ledger HID transport

**Status:** These wallets are browser-extension APIs by definition and will never
be available on React Native. All adapters already guard with `typeof window !== "undefined"`,
so `isInstalled()` returns `false` on React Native and `useWallet` / `useWalletKit`
will simply not list them — no runtime crash occurs.

**Recommended action for mobile:** Use the new `createDeepLinkWalletAdapter()` (#839)
for mobile wallet connections instead. The adapter calls `config.openUri` which can
be overridden with `Linking.openURL` from `react-native`:

```ts
import { Linking } from "react-native";
import { createDeepLinkWalletAdapter } from "stellar-hooks";

const lobstrMobile = createDeepLinkWalletAdapter({
  id: "lobstr-mobile",
  name: "LOBSTR Mobile",
  scheme: "lobstr://",
  iconUrl: "https://lobstr.co/img/lobstr-icon.png",
  installUrl: "https://lobstr.co/download",
  openUri: (uri) => Linking.openURL(uri),
  resolvePublicKey: async () => { /* app-link callback */ },
});
```

---

### 6. `src/hooks/useIntersectionObserver.ts`

**Browser API used:** `IntersectionObserver` (DOM API)

**Status:** ⚠️ **Browser-only hook.** `IntersectionObserver` does not exist in
React Native. The hook is not used internally by any Stellar-specific hook, so
it has no impact on RN compatibility. If you need similar behaviour in RN, use
a `FlatList` `onViewableItemsChanged` callback instead.

---

### 7. `src/hooks/useHorizonStream.ts`, `useEffects.ts`, `useLedgerStream.ts`

**Browser API used:** `EventSource` (SSE streaming)

**Status:** ⚠️ **Needs polyfill.** The Stellar SDK's streaming helpers use
`EventSource` under the hood. React Native does not include `EventSource`.
Install a polyfill:

```bash
npm install react-native-event-source
```

```ts
// Add before importing stellar-hooks (e.g. in index.js)
import EventSource from "react-native-event-source";
global.EventSource = EventSource;
```

---

### 8. `src/hooks/useWalletConnect.ts`, `wallets/lobstr-walletconnect.ts`, `wallets/xbull-walletconnect.ts`

**Browser API used:** `window` (via `@walletconnect/sign-client`)

**Status:** WalletConnect v2 supports React Native via `@walletconnect/react-native-compat`.
Add its polyfill before importing WalletConnect:

```ts
import "@walletconnect/react-native-compat";
```

---

### 9. `src/hooks/useSep24.ts`

**Browser API used:** `window.open()` (opens the anchor's interactive deposit/withdrawal flow)

**Status:** ⚠️ **Needs adaptation.** Replace `window.open` with `Linking.openURL`
from `react-native`. This hook will need a React Native–specific implementation
or an `openWindow` option similar to the `openUri` pattern in `createDeepLinkWalletAdapter`.

---

### 10. `src/devtools/devtoolsBridge.ts`

**Browser API used:** `window.postMessage` (Chrome DevTools extension bridge)

**Status:** Browser DevTools are not applicable in React Native. The bridge is only
active when the DevTools extension is installed and already guards with
`typeof window !== "undefined"`. No action required.

---

## Summary checklist for React Native adoption

| Task | Status |
|---|---|
| Pass `storageAdapter={createAsyncStorageAdapter(AsyncStorage)}` to `<StellarProvider>` | ✅ Available since #840 |
| Use `createDeepLinkWalletAdapter()` for mobile wallet connections | ✅ Available since #839 |
| Pass `openUri: (uri) => Linking.openURL(uri)` to the deep-link adapter | Required by consumer |
| Add `EventSource` polyfill if using streaming hooks | Needs `react-native-event-source` |
| Add `@walletconnect/react-native-compat` if using WalletConnect | Needs polyfill |
| Replace `window.open` in `useSep24` with injectable callback | Future work |

---

## Hooks confirmed safe on React Native (no changes needed)

All hooks that only use `@stellar/stellar-sdk` network calls are safe:

- `useStellarAccount` / `useStellarAccounts` / `useStellarBalance`
- `useSorobanContract` / `useSorobanRead` / `useLedgerEntry` / `useLedgerEntries`
- `useTransaction` / `usePayment` / `usePathPayment`
- `useStellarToml` / `useAssetMetadata`
- `useOrderBook` / `useTrades` / `useStrictSendPaths`
- `useLiquidityPool` / `useAccountLiquidityPositions`
- `useTrustline` / `useTrustlines` / `useAssetBalance`
- `useNetworkStatus` / `useFeeStats` / `useTransactionHistory`
- `useMultiSig` / `useMultiSigThreshold`
- `useClaimableBalance` / `useClaimBalance` / `useCreateClaimableBalance`
- `useSorobanTokenBalance` / `useContractEvents` / `useContractId`
- `useHorizonServer` / `useSorobanServer`
- `useNetwork` / `useStellarNetwork` / `useNetworkConfig`
- `useFreighter` *(connection only — `isInstalled()` always false on RN)*
