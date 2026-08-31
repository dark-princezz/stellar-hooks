# useStellarAccounts

Fetch multiple Stellar accounts in parallel.

## Import

```tsx
import { useStellarAccounts } from 'stellar-hooks'
```

## Usage

```tsx
const { accounts, isLoading, errors } = useStellarAccounts([pk1, pk2, pk3], {
  refetchInterval: 10000,
})
```

## Related

- [useStellarAccount](/hooks/use-stellar-account) - Single account fetching