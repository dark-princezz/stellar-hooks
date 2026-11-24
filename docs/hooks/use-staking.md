# Staking and bridge hooks

## `useStake` / `useUnstake`

```tsx
const { stake, isPending, error } = useStake({ contractId: 'CSTAKE...' })
const { unstake, lockup } = useUnstake({ contractId: 'CSTAKE...', lockup: { unlocksAt } })
```

Call `stake(from, amount)` / `unstake(from, amount)` on the contract. `unstake` is
refused client-side while the supplied `lockup.unlocksAt` is in the future.

## `useRewards`

```tsx
const { formatted, assetCode, claim } = useRewards({ contractId: 'CSTAKE...' })
```

Reads `claimable(account)` and calls `claim(account)`. The contract method names
above are assumptions; adapt them to your contract.

## `useBridgeQuote` / `useBridgeTransfer`

```tsx
const { quote } = useBridgeQuote({ baseUrl, params })
const { transfer, transferId } = useBridgeTransfer({ baseUrl })
```

These talk to a REST bridge API (`GET /quote`, `POST /transfers`). Pass
`parseResponse` to adapt a different provider's response shape.
