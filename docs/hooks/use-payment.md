# usePayment

Build, sign, and submit Stellar payments.

## Import

```tsx
import { usePayment } from 'stellar-hooks'
```

## Usage

### Basic Payment

```tsx
function PaymentComponent() {
  const payment = usePayment({
    destination: "GBXXX...",
    asset: { type: "native" },
    amount: "10",
  })

  return (
    <button onClick={() => payment.submit()} disabled={payment.isLoading}>
      Send 10 XLM
    </button>
  )
}
```

### Custom Asset Payment

```tsx
const payment = usePayment({
  destination: "GBXXX...",
  asset: { 
    type: "credit", 
    code: "USDC", 
    issuer: "GA5Z..." 
  },
  amount: "100",
})
```

### Payment with Memo

```tsx
const payment = usePayment({
  destination: "GBXXX...",
  asset: { type: "native" },
  amount: "10",
  memo: "Thanks for your business!",
})
```

### With Callbacks

```tsx
const payment = usePayment({
  destination: "GBXXX...",
  asset: { type: "native" },
  amount: "10",
  onSuccess: (hash) => console.log('Confirmed:', hash),
  onError: (error) => console.error('Failed:', error),
})
```

### Using Specific Wallet

```tsx
const payment = usePayment({
  destination: "GBXXX...",
  asset: { type: "native" },
  amount: "10",
  walletId: "albedo", // Use Albedo instead of default
})
```

## API

### Parameters

```typescript
interface UsePaymentOptions {
  destination: StellarPublicKey
  asset: PaymentAsset
  amount: string
  memo?: string
  fee?: number
  timeoutSeconds?: number
  walletId?: WalletId
  onSuccess?: (hash: string) => void
  onError?: (error: StellarTransactionError) => void
}

type PaymentAsset =
  | { type: "native" }
  | { type: "credit"; code: string; issuer: StellarAssetIssuer }
```

### Return Value

```typescript
interface UsePaymentReturn {
  submit: () => Promise<void>
  status: TransactionStatus
  hash: string | null
  error: StellarTransactionError | null
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  reset: () => void
}
```

## Transaction Status

```typescript
type TransactionStatus = 
  | "idle"
  | "submitting"
  | "polling"
  | "success"
  | "error"
```

## Related

- [useTransaction](/hooks/use-transaction) - Generic transaction building
- [usePathPayment](/hooks/use-path-payment) - Path payments
- [Transaction Building](/guide/transactions) - Transaction guide