# Supported Oracle Contract Interfaces (prismn-914)

Standalone documentation for [#914](https://github.com/dark-princezz/stellar-hooks/issues/914): clarify which oracle contract standards/interfaces `useOraclePrice` is compatible with and how to point it at a custom oracle.

## Current expectation (to confirm against implementation)
`useOraclePrice` is intended to read price data from Soroban oracle contracts that expose a price query method compatible with common Stellar/Soroban oracle interfaces.

## Commonly supported interface patterns

### 1. SEP-style / Reflector-like oracle methods (typical)
Compatible implementations generally expose one or more of:
- `lastprice(asset)` / `last_price(asset)` - latest price record for asset
- `price(asset, timestamp)` - price at or near timestamp
- `prices(asset, records)` / `prices(asset, start, count)` - historical series

Returned records commonly include fields equivalent to:
- `price` (integer scaled value)
- `timestamp` (unix seconds/ms depending on contract)

### 2. Custom Soroban oracle contracts
`useOraclePrice` can target a custom oracle when the contract provides an equivalent read method and return shape. Adapter/configuration should allow:
- contract ID/address
- method name (e.g. `lastprice`, `get_price`)
- asset argument encoding (native/XLM, Stellar asset, or contract-specific enum/struct)
- decimals/scale handling for returned price

## Pointing at a custom oracle

```ts
// Conceptual example - align with actual hook API in implementation
const { price, loading, error } = useOraclePrice({
  contractId: 'C...CUSTOM_ORACLE...',
  asset: { type: 'stellar', code: 'USDC', issuer: 'G...' },
  // adapter options (if supported):
  method: 'lastprice',
  decimals: 7,
  network: 'testnet',
});
```

## Compatibility checklist
- [ ] Contract deployed on Soroban/Soroban RPC reachable by app.
- [ ] Read method name and args match hook/adapter configuration.
- [ ] Asset identifier encoding matches contract expectation.
- [ ] Price scale/decimals normalized before display.
- [ ] Error handling covers missing asset, stale oracle, and contract invocation failures.

## Recommendation
Document the exact supported method signatures and return types in the hook API docs once the implementation is finalized, and include at least one example for a standard oracle and one for a custom adapter.
