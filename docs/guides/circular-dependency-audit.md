# Circular Dependency Audit Report

> **Last verified:** stellar-hooks v0.2.0 (2026-11-23)

> **Issue:** #837 — Audit circular dependency risk between hook modules
>
> Tool: [madge](https://github.com/pahen/madge) v8  
> Scanned: `src/` (TypeScript source tree, tests and stories excluded)  
> Command: `node scripts/check-circular-deps.mjs --warn`

---

## Findings (8 cycles detected)

```
1) context.tsx → devtools/devtoolsBridge.ts → types/index.ts → hooks/useOrderBook.ts
2) context.tsx → devtools/devtoolsBridge.ts → types/index.ts → hooks/useStrictSendPaths.ts
3) context.tsx → devtools/devtoolsBridge.ts → types/index.ts → hooks/useTrades.ts
4) types/index.ts → middleware/index.ts
5) types/index.ts → utils/cacheAdapter.ts → utils/index.ts
6) utils/cacheAdapter.ts → utils/index.ts
7) utils/errorStrings.ts → utils/errors.ts
8) types/index.ts → utils/cacheAdapter.ts → utils/index.ts → utils/formatAmount.ts
```

---

## Risk assessment

| # | Cycle | Runtime risk | Tree-shaking risk | Priority |
|---|---|---|---|---|
| 1–3 | `context → devtoolsBridge → types → hook` | Low — hook types are `import type` | Medium — bundlers may include devtools code in non-devtools builds | Medium |
| 4 | `types → middleware` | Low — middleware types only | Low | Low |
| 5, 8 | `types → cacheAdapter → utils/index → formatAmount` | Low — all initialise safely | Medium — `utils/index` re-exports everything | Low |
| 6 | `cacheAdapter → utils/index` | Low | Medium | Low |
| 7 | `errorStrings → errors` | Low — file already uses `import type` for the shared types | Low | Low |

None of the cycles cause runtime crashes in the current codebase because:
- All cross-module references between the cycles are **type-only** at runtime, OR
- The cyclic reference is not exercised during module initialisation.

However cycles 1–3 and 5/8 pose a bundling risk in strict tree-shaking scenarios.

---

## Recommended fixes (non-breaking)

### Cycles 1–3 — `types/index.ts` importing hook return types

`types/index.ts` imports `UseOrderBookReturn`, `UseStrictSendPathsReturn`, and
`UseTradesReturn` only for type export. Convert to `import type`:

```ts
// types/index.ts — change:
import { UseOrderBookReturn } from "../hooks/useOrderBook";
// to:
import type { UseOrderBookReturn } from "../hooks/useOrderBook";
```

This resolves the `devtoolsBridge → types → hook` chain entirely.

### Cycle 4 — `types/index.ts → middleware/index.ts`

Move `TransactionMiddleware` to a dedicated `types/middleware.ts` that does not
import from `types/index.ts`. Both files can then import from `types/middleware.ts`.

### Cycles 5, 6, 8 — `cacheAdapter ↔ utils/index`

`utils/index.ts` re-exports from `utils/cacheAdapter.ts`, and `cacheAdapter.ts`
imports helpers from `utils/index.ts` (via `utils/errors.ts`). Break the cycle by
having `cacheAdapter.ts` import directly from `utils/errors.ts` rather than via
the barrel `utils/index.ts`.

### Cycle 7 — `errorStrings ↔ errors`

Already mitigated with `import type`. Confirm all cross-imports are type-only and
add an ESLint rule to keep them that way:

```json
// .eslintrc.cjs — in rules:
"@typescript-eslint/consistent-type-imports": ["warn", { "prefer": "type-imports" }]
```

---

## How to run

```bash
# Fail CI on any cycle (add to ci.yml)
npm run check:circular

# Report cycles but don't fail (useful during migration)
npm run check:circular:warn

# Also dump the full dependency graph to dep-graph.json
npm run check:circular:graph
```

Scripts are defined in `package.json`. The check is implemented in
`scripts/check-circular-deps.mjs`.
