# useInvoice

Create an invoice reference and watch for incoming Stellar payments carrying that memo, tracking whether payment is pending, partial, paid, or overpaid.

## Import

```tsx
import { useInvoice } from 'stellar-hooks'
```

## Usage

```tsx
function MerchantCheckout({ orderTotal, merchantAddress }: { orderTotal: string, merchantAddress: string }) {
  const {
    memo,
    status,
    receivedAmount,
    expectedAmount,
    isPaid,
    isPartial,
    isOverpaid,
    payments,
  } = useInvoice({
    recipient: merchantAddress,
    expectedAmount: orderTotal,
    memoType: "text",
    pollInterval: 3000,
  })

  return (
    <div>
      <h3>Order Total: {expectedAmount} XLM</h3>
      <p>Include Memo in Payment: <code>{memo}</code></p>
      <p>Status: <strong>{status.toUpperCase()}</strong></p>
      <p>Received: {receivedAmount} / {expectedAmount} XLM</p>

      {isPaid && <p className="success">🎉 Payment confirmed! Thank you for your order.</p>}
      {isPartial && <p className="warning">⚠️ Partial payment received. Please send the remaining balance.</p>}
      {isOverpaid && <p className="info">ℹ️ Overpayment detected. A refund will be initiated.</p>}
    </div>
  )
}
```

## API

### Parameters

```typescript
interface UseInvoiceOptions {
  recipient?: string
  expectedAmount: string | number
  assetCode?: string
  assetIssuer?: string
  memo?: string
  memoType?: "text" | "id" | "hash"
  horizonUrl?: string
  pollInterval?: number
  enabled?: boolean
  expiresAt?: number
  onPaymentReceived?: (payment: InvoiceMatchedPayment, totalReceived: number) => void
  onPaid?: (totalReceived: number) => void
}
```

### Return Value

```typescript
interface UseInvoiceReturn {
  memo: string
  memoType: "text" | "id" | "hash"
  recipient: string
  expectedAmount: string
  receivedAmount: string
  status: "pending" | "partial" | "paid" | "overpaid" | "expired"
  isPaid: boolean
  isPartial: boolean
  isOverpaid: boolean
  isExpired: boolean
  payments: InvoiceMatchedPayment[]
  isLoading: boolean
  error: Error | null
  checkNow: () => Promise<void>
  reset: (newMemo?: string) => void
}
```
