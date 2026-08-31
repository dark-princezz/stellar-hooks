# useTrade

Execute trades on the Stellar DEX.

## Import

```tsx
import { useTrade } from 'stellar-hooks'
```

## Usage

```tsx
const trade = useTrade({
  destination: "GBXXX...",
  selling: { type: "native" },
  buying: { type: "credit", code: "USDC", issuer: "GA5Z..." },
  amount: "100",
})
```

## Related

- [usePathPayment](/hooks/use-path-payment) - Path payments