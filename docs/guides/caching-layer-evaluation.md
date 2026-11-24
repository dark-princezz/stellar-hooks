# Architectural Evaluation: React Query & SWR Optional Caching Layers

> **Last verified:** stellar-hooks v0.2.0 (2026-11-23)

## Overview

Stellar and Soroban decentralized applications frequently encounter redundant network traffic. Multiple components across a component tree may request the same Stellar account, balance, ledger entry, or contract simulation within milliseconds of one another.

This document evaluates offering an **opt-in caching and request deduplication layer** for `stellar-hooks` to eliminate duplicate RPC and Horizon calls while maintaining zero runtime overhead for consumers who do not require external state managers.

---

## 1. Problem Statement

In classic hook implementations without a shared cache layer:
- **Redundant network requests**: Three components displaying the user's XLM balance each initiate independent HTTP requests to Horizon / Soroban RPC.
- **Race conditions**: Fast page navigation or rapid prop changes trigger concurrent requests where responses may arrive out of order.
- **Cache invalidation complexity**: Mutation operations (e.g. submitting a payment) do not automatically notify other read hooks of updated balances.

---

## 2. Evaluation of Architectural Approaches

### Option A: Direct Hard Dependency on `@tanstack/react-query` or `swr`
- **Pros**:
  - Full feature set immediately available (window focus revalidation, offline recovery, garbage collection).
- **Cons**:
  - **Heavy bundle footprint**: Increases core library bundle size significantly (~13 KB gzip for React Query).
  - **Strict peer dependencies**: Enforces specific versions of `@tanstack/react-query` or `swr` on all consumers, leading to peer dependency conflicts in monorepos.
  - **Violation of lean library philosophy**: Many lightweight dApps or widget embeds only need 1 or 2 hooks without complex cache managers.

### Option B: Built-in Lightweight In-Memory `CacheAdapter` Interface (Core)
- **Pros**:
  - **Zero extra dependencies**: Keeps `stellar-hooks` core tiny and fast.
  - **Pluggable**: Consumers can supply their own cache backend (in-memory Map, TanStack Query client, SWR cache, or Redis).
  - **Per-query and provider-wide**: Can be configured globally on `<StellarProvider cacheAdapter={...}>` or per query with `cacheKey` and `cacheTtl`.
- **Cons**:
  - Does not provide advanced features like window-focus revalidation or devtools out-of-the-box unless coupled with a full caching library.

### Option C: Opt-In Workspace Adapter Packages (`@stellar-hooks/query` & `@stellar-hooks/swr`)
- **Pros**:
  - **Best of both worlds**: Core library remains lightweight, while consumers of TanStack Query or SWR install dedicated adapter packages.
  - **Zero conflict**: Only users who install `@stellar-hooks/query` pay the bundle cost of TanStack Query.
  - **Native ecosystem idioms**: Returns native `UseQueryResult` or `SWRResponse` objects (`data`, `isLoading`, `mutate`, `refetch`, `error`).
- **Cons**:
  - Requires maintaining dedicated adapter packages alongside core hooks.

---

## 3. Comparison Matrix

| Criteria | Core Memory Cache | `@stellar-hooks/query` | `@stellar-hooks/swr` |
| :--- | :--- | :--- | :--- |
| **Additional Bundle Size** | 0 KB | ~12–14 KB (TanStack Query) | ~4–5 KB (SWR) |
| **Request Deduplication** | In-flight & TTL | In-flight, key-based | In-flight, key-based |
| **Background Revalidation** | Interval timer | Background interval + window focus | Background interval + window focus |
| **Cache Across Mounts** | Configurable TTL | Stale-while-revalidate (gcTime) | Stale-while-revalidate |
| **Mutations / Optimistic UI**| Manual | `useMutation` + invalidateQueries | `mutate(key, data, revalidate)` |
| **DevTools** | HookActivityOverlay | TanStack Query Devtools | React DevTools |

---

## 4. Implementation Design & Recommendation

We recommend and provide a two-tier strategy:

1. **Core Pluggable `CacheAdapter` Interface (`stellar-hooks`)**:
   Core provides the `CacheAdapter` interface and default TTL in-memory adapter. Consumers can pass `cacheAdapter` directly into `<StellarProvider>` or use `cacheKey` / `cacheTtl` in query hooks.

   ```tsx
   import { StellarProvider, createMemoryCacheAdapter } from "stellar-hooks";

   const cacheAdapter = createMemoryCacheAdapter();

   export function App() {
     return (
       <StellarProvider network="testnet" cacheAdapter={cacheAdapter}>
         <Dashboard />
       </StellarProvider>
     );
   }
   ```

2. **Opt-in Adapters for Existing Framework Users**:
   - For TanStack Query projects: Use `@stellar-hooks/query` (`useStellarAccountQuery`, `useStellarBalanceQuery`, `useLedgerEntryQuery`, `useFreighterQuery`).
   - For SWR projects: Use `@stellar-hooks/swr` (`useStellarAccount`, `useStellarBalance`, `useLedgerEntry`, `useContractEvents`).

---

## 5. Conclusion

By separating concerns between a lean, dependency-free core with pluggable `CacheAdapter` support and opt-in ecosystem adapters (`@stellar-hooks/query`, `@stellar-hooks/swr`), consumers gain complete architectural freedom to deduplicate and cache requests across instances without unwanted bundle bloat.
