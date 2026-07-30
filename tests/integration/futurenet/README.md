# Futurenet integration tests

Opt-in suite that hits **live Futurenet** Horizon and Soroban RPC to catch
SDK/network drift that mocked unit tests miss.

These tests are **not** part of `npm test` / default CI.

## Run

```bash
npm run test:futurenet
```

Requires network access to:

- `https://horizon-futurenet.stellar.org`
- `https://rpc-futurenet.stellar.org`
- `https://friendbot-futurenet.stellar.org` (account funding)

## What is covered

| Area | Checks |
|------|--------|
| `NETWORK_CONFIGS.futurenet` | URLs / passphrase match live network |
| Horizon SDK | `root()`, account load after Friendbot, memoized server |
| Soroban RPC | `getHealth()`, memoized server |
| Fee stats | Live `/fee_stats` + `normalizeFeeStats` (snake_case → camelCase) |

## Manual CI

A `workflow_dispatch` workflow is available under
**Actions → Futurenet integration** for on-demand runs.
