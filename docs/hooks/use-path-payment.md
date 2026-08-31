# usePathPayment

Send path payments (atomic swaps) on the Stellar DEX.

## Import

```tsx
import { usePathPayment } from 'stellar-hooks'
```

## Usage

```tsx
const pathPayment = usePathPayment({
  destination: "GBXXX...",
  sendAsset: { type: "native" },
  destAsset: { type: "credit", code: "USDC", issuer: "GA5Z..." },
  sendAmount: "100",
  destMin: "95",
})
```

## Related

- [usePayment](/hooks/use-payment) - Simple payments