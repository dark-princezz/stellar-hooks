# ADR: Monorepo Split into core, react, and wallets Packages

> **Last verified:** stellar-hooks v0.2.0 (2026-11-23)

**Issue:** [#833](https://github.com/dark-princezz/stellar-hooks/issues/833)  
**Status:** Accepted  
**Date:** 2026-09-28

---

## Context

`stellar-hooks` currently ships as a single package containing:

1. **Framework-agnostic logic** — RPC helpers, XDR builders, network configs,
   utility functions (`parseAccountResponse`, `parseBalance`, cache helpers,
   error classes, etc.)
2. **React bindings** — All `use*` hooks plus the `<StellarProvider>` context
   tree.
3. **Wallet adapters** — Per-wallet adapter factories (Freighter, Lobstr, xBull,
   Albedo, Rabet, Ledger) plus the plugin registry.

Consumers who only need, say, the Soroban RPC utilities from a Node.js script,
or a Vue/Svelte binding author who wants to reuse the network presets, must
currently take React as a dependency and receive a bundle that includes every
wallet adapter whether they need it or not.

---

## Decision

Split the repository into three first-class packages under `packages/`:

| Package | npm name | Contains |
|---------|----------|----------|
| Core | `@stellar-hooks/core` | Network configs, RPC helpers, XDR builders, utility functions, error classes, branded types, cache adapter, middleware pipeline |
| React | `stellar-hooks` *(existing)* | All `use*` hooks, `<StellarProvider>`, devtools — depends on `@stellar-hooks/core` |
| Wallets | `@stellar-hooks/wallets` | Wallet adapter factories, registry, capability helpers — depends on `@stellar-hooks/core`, zero React dependency |

The existing `stellar-hooks` entry point re-exports everything it does today so
the change is **fully backward-compatible at the public API surface**.

---

## Package boundaries

### `@stellar-hooks/core`

Exports (no React, no wallet APIs):

```ts
// Network
export { NETWORK_CONFIGS } from "./network";
export type { StellarNetwork, NetworkConfig, CustomNetworkConfig };

// Utilities
export { parseAccountResponse, parseBalance, sleep, backoff };
export { getCache, setCache, clearCache };
export { validatePublicKey, validateContractId, ValidationError };

// Errors
export { StellarHookError, UserRejectedError, ErrorCode, ... };

// XDR helpers
export { decodeXdr, formatXdrResult, detectXdrType };

// Types
export type { StellarAccountData, StellarBalance, TransactionStatus, ... };
```

### `@stellar-hooks/wallets`

Exports (no React):

```ts
export { createFreighterAdapter, createLobstrAdapter, createXBullAdapter, ... };
export { registerWalletAdapter, resolveWalletAdapter, ... };
export type { WalletAdapter, WalletMeta, WalletId, ... };
```

### `stellar-hooks` (React package)

Keeps its current public API. Internally, imports from `@stellar-hooks/core`
instead of `../utils` and `../types`.

---

## Bundle size impact

| Scenario | Before | After (estimated) |
|----------|--------|-------------------|
| Node.js script needing only network config | ~220 KB (full bundle) | ~8 KB (`@stellar-hooks/core` only) |
| Vue/Svelte app needing RPC helpers | ~220 KB | ~8 KB |
| Existing React dApp | unchanged — re-exports everything | unchanged |

---

## Migration path for consumers

The split is opt-in. Existing `stellar-hooks` consumers change nothing.
New consumers who only need core utilities install `@stellar-hooks/core`;
those building non-React bindings add `@stellar-hooks/wallets` as well.

---

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Import path divergence confuses contributors | Automated lint rule enforces that `src/` never imports `../wallets` directly — must go through the wallet layer |
| Versioning drift between packages | All three packages share the same version via Changesets `linked` config |
| Accidental peer-dep leakage | CI enforces that `@stellar-hooks/core` has zero React in its dependency closure |

---

## Implementation status

`@stellar-hooks/core` has been bootstrapped in `packages/core` as the first step
of this split (see issue [#836](https://github.com/dark-princezz/stellar-hooks/issues/836)).
The full React-to-core migration will be tracked in follow-up issues.
