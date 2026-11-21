# useRefund

Build and validate return/refund payments to the original sender of a received payment.

## Import

```tsx
import { useRefund, buildRefundPayment, validateRefund } from 'stellar-hooks'
```

## Usage

```tsx
function RefundButton({ receivedPayment }: { receivedPayment: ReceivedPaymentInfo }) {
  const { buildRefund, validate, isPreparing, error } = useRefund({
    payment: receivedPayment,
    onSuccess: (result) => console.log('Refund built:', result),
  })

  const validation = validate()

  const handleRefund = () => {
    try {
      const refundOp = buildRefund({ refundAmount: "10.00" })
      console.log('Payment operation ready for submission:', refundOp.operation)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <button onClick={handleRefund} disabled={!validation.isValid || isPreparing}>
        Refund Sender ({validation.validatedRefundAmount} XLM)
      </button>
      {error && <p className="error">{error.message}</p>}
    </div>
  )
}
```

## Utilities

### `validateRefund(originalPayment, options)`
Checks that the sender address is valid and that the proposed refund amount does not exceed the originally received amount.

### `buildRefundPayment(originalPayment, options)`
Creates a Stellar SDK payment `Operation` (and optional full `Transaction`) returning funds to the sender.
