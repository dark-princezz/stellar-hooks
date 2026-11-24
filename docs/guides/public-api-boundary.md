# Public vs Internal API Boundary

> **Last verified:** stellar-hooks v0.2.0 (2026-11-23)

**Issue:** [#835](https://github.com/dark-princezz/stellar-hooks/issues/835)

---

## Overview

`stellar-hooks` distinguishes between **public** exports that are covered by
semver and **internal** utilities that are implementation details subject to
change at any time.

The boundary is enforced at the Node.js / bundler level via the `"exports"`
field in `package.json`. Any path not listed there will be rejected by modern
tooling (Node ≥ 12.7 with `--experimental-vm-modules`, webpack 5, Vite, esbuild).

---

## Public API — what you can safely import

### Main entry point

```ts
import { useFreighter, StellarProvider, NETWORK_CONFIGS } from "stellar-hooks";
```

Everything exported from `stellar-hooks` (the root entry) is public and
covered by [semantic versioning](../semver-policy.md).

### Per-hook deep imports

Each hook is also available as its own deep-import for tree-shaking:

```ts
import { useFreighter } from "stellar-hooks/useFreighter";
import { useStellarBalance } from "stellar-hooks/useStellarBalance";
```

All paths listed under `"exports"` in `package.json` are public.

### Framework-agnostic core

```ts
import { NETWORK_CONFIGS, parseAccountResponse } from "@stellar-hooks/core";
```

Everything exported from `@stellar-hooks/core` is public.

---

## Internal API — what you must NOT import

The following subpath patterns are **not public** and are blocked:

| Pattern | Reason |
|---------|--------|
| `stellar-hooks/src/...` | Source files — not part of the distributed package |
| `stellar-hooks/dist/utils/...` | Internal utility modules |
| `stellar-hooks/dist/hooks/useStellarQuery` | Internal query abstraction |
| `stellar-hooks/internal` | Explicit "internal" namespace guard |
| `stellar-hooks/internal/*` | Any subpath under the internal namespace |

Attempting to import these paths will:

1. **Fail at bundle time** in environments that respect the `"exports"` field
   (webpack 5, Vite, esbuild, Node ≥ 18).
2. **Throw a descriptive `Error`** at runtime in environments that do not
   enforce `"exports"` (legacy bundlers).

---

## Marking internal utilities in source

Internal TypeScript files that should never be imported directly are annotated
with a JSDoc `@internal` tag at the top of the file:

```ts
/**
 * @internal
 * This module is an implementation detail of stellar-hooks.
 * It is not part of the public API and may change without notice.
 */
```

TypeScript consumers who have `stripInternal: true` in their `tsconfig.json`
will not see these symbols in generated `.d.ts` files.

---

## Adding a new public export

1. Implement the hook or utility in `src/`.
2. Export it from `src/index.ts`.
3. Add a deep-import entry to the `"exports"` map in `package.json`.
4. Document it in the appropriate doc page.
5. Add a changeset entry (`npm run changeset`).

---

## FAQ

**Can I import from `stellar-hooks/dist/...` directly?**

No. The `dist/` directory is not in the public `"exports"` map. Any path under
`dist/` that is not explicitly exported is an internal implementation detail.

**The error says "internal path" but I'm importing a real hook — what's wrong?**

Check that you're using the correct export path. All public hooks are listed in
[the API reference](../api/README.md) and the `"exports"` map in `package.json`.

**I need a utility that isn't exported. What should I do?**

Open an issue or PR to request its promotion to the public API. If it's
genuinely useful to consumers, we're happy to export it properly.
