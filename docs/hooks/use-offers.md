# useOffers

Fetch DEX offers for a specific trading pair.

## Import

```tsx
import { useOffers } from 'stellar-hooks'
```

## Usage

```tsx
const { offers, isLoading } = useOffers({
  selling: { type: "native" },
  buying: { type: "credit", code: "USDC", issuer: "GA5Z..." },
})
```

## Related

- [useStellarOffers](/hooks/use-stellar-offers) - Account offers