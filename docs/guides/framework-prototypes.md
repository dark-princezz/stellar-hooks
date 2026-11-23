# Svelte and SolidJS Prototypes

Two small bindings are included in the repository to test how well the framework-agnostic [`@stellar-hooks/core`](https://github.com/dark-princezz/stellar-hooks/tree/main/packages/core) API fits fine-grained reactivity models. They are prototypes: APIs may change, and neither package is published as a supported release yet.

## What the prototypes cover

| Package | Primitives | Purpose |
| --- | --- | --- |
| `@stellar-hooks/svelte` | `useStellarAccount`, `useSorobanTokenBalance` | Check whether Svelte stores can wrap core fetchers without duplicated caching logic. |
| `@stellar-hooks/solid` | `createStellarAccount`, `createSorobanTokenBalance`, `createFreighterWallet` | Check whether signals can express wallet and account state without React-specific context. |

Both packages accept reactive inputs (a Svelte `Readable` or a Solid accessor) and expose loading, error, and last-fetched state. Polling is opt-in and cleaned up when the consumer goes away.

## Trying them locally

From the repository root:

```bash
npm install
npm run build -w @stellar-hooks/svelte
npm run build -w @stellar-hooks/solid
```

Then follow the usage examples in each package README. The Svelte package is documented in [issue #1160](https://github.com/dark-princezz/stellar-hooks/issues/1160) and the SolidJS package in [issue #1161](https://github.com/dark-princezz/stellar-hooks/issues/1161).

## What we are evaluating

- Whether `fetchAccount` and `fetchSorobanTokenBalance` expose enough information for reactive wrappers.
- Whether network configuration should remain a prop on every primitive or move into a shared framework-level provider.
- Which error types from core need to be public for consistent UI handling.
- Whether caching belongs in core or in each binding.

Feedback on these questions is more useful than bug reports against the prototype APIs while they are experimental.
