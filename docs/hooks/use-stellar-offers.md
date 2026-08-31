# useStellarOffers

Fetch offers for a specific account.

## Import

```tsx
import { useStellarOffers } from 'stellar-hooks'
```

## Usage

```tsx
const { offers, isLoading } = useStellarOffers(publicKey, {
  refetchInterval: 10000,
})
```

## Related

- [useOffers](/hooks/use-offers) - DEX offers