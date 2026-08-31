# useCreateClaimableBalance

Create a claimable balance.

## Import

```tsx
import { useCreateClaimableBalance } from 'stellar-hooks'
```

## Usage

```tsx
const create = useCreateClaimableBalance({
  asset: { type: "native" },
  amount: "10",
  claimants: [...],
})
```

## Related

- [useClaimableBalance](/hooks/use-claimable-balance) - Fetch claimable balances