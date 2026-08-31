# useOrderBook

Fetch the order book for a trading pair.

## Import

```tsx
import { useOrderBook } from 'stellar-hooks'
```

## Usage

```tsx
const { bids, asks, isLoading } = useOrderBook({
  selling: { type: "native" },
  buying: { type: "credit", code: "USDC", issuer: "GA5Z..." },
})
```

## Related

- [useOffers](/hooks/use-offers) - DEX offers