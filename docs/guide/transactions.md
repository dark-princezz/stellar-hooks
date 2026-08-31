# Transaction Building

Build and submit Stellar transactions using stellar-hooks.

## Overview

stellar-hooks provides multiple approaches to transaction building:

- **High-level hooks** - For common operations (payments, path payments)
- **Generic transaction hook** - For custom transaction building
- **Low-level SDK access** - For complete control

## High-Level Payment Hook

### Simple Payment

```tsx
import { usePayment } from 'stellar-hooks'

function PaymentComponent() {
  const payment = usePayment({
    destination: "GBXXX...",
    asset: { type: "native" },
    amount: "10",
    memo: "Thanks!",
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

### Payment with Callbacks

```tsx
const payment = usePayment({
  destination: "GBXXX...",
  asset: { type: "native" },
  amount: "10",
  onSuccess: (hash) => console.log('Confirmed:', hash),
  onError: (error) => console.error('Failed:', error),
})
```

## Path Payments

```tsx
import { usePathPayment } from 'stellar-hooks'

const pathPayment = usePathPayment({
  destination: "GBXXX...",
  sendAsset: { type: "native" },
  destAsset: { 
    type: "credit", 
    code: "USDC", 
    issuer: "GA5Z..." 
  },
  sendAmount: "100",
  destMin: "95", // Minimum amount to receive
})
```

## Generic Transaction Hook

For custom transaction building:

```tsx
import { useTransaction } from 'stellar-hooks'
import { Operation, Asset } from '@stellar/stellar-sdk'

function CustomTransaction() {
  const { submit, status, hash } = useTransaction({
    fee: 200,
    memo: "Custom transaction",
  })

  const handleSubmit = async () => {
    await submit([
      Operation.payment({
        destination: "GBXXX...",
        asset: Asset.native(),
        amount: "10",
      }),
      Operation.manageData({
        name: "key",
        value: "value",
      }),
    ])
  }

  return (
    <button onClick={handleSubmit} disabled={status !== "idle"}>
      Submit Transaction
    </button>
  )
}
```

## Transaction Options

### Fee Configuration

```tsx
const { submit } = useTransaction({
  fee: 300, // Fee in stroops
})
```

### Memo Support

```tsx
const { submit } = useTransaction({
  memo: "Payment #123",
})
```

### Fee Bump

```tsx
const { submit } = useTransaction({
  feeBump: {
    fee: "1000",
    sponsor: "GSPONSOR...",
  },
})
```

### Timeout Configuration

```tsx
const { submit } = useTransaction({
  timeoutSeconds: 120, // 2 minutes
})
```

## Transaction Status

Track transaction lifecycle:

```tsx
const { status, hash, isLoading, isSuccess, isError, error } = useTransaction()

switch (status) {
  case "idle":
    return <button onClick={submit}>Submit</button>
  case "building":
    return <p>Building transaction...</p>
  case "signing":
    return <p>Waiting for signature...</p>
  case "submitting":
    return <p>Submitting to network...</p>
  case "polling":
    return <p>Waiting for confirmation...</p>
  case "success":
    return <p>Success! Hash: {hash}</p>
  case "error":
    return <p>Error: {error?.message}</p>
}
```

## Multi-Operation Transactions

```tsx
import { useMultiOperationTransaction } from 'stellar-hooks'

const multiOp = useMultiOperationTransaction({
  operations: [
    Operation.payment({...}),
    Operation.manageData({...}),
    Operation.bumpSequence({...}),
  ],
})
```

## Advanced Building

### Custom Horizon Server

```tsx
import { useHorizonServer } from 'stellar-hooks'

const server = useHorizonServer()

const account = await server.loadAccount(publicKey)
const transaction = new TransactionBuilder(account, {
  fee: "100",
  networkPassphrase: "Test SDF Network ; September 2015",
})
  .addOperation(...)
  .setTimeout(30)
  .build()
```

### Manual Signing

```tsx
const { signTransaction } = useFreighter()

const signedXdr = await signTransaction(transaction.toXDR(), {
  networkPassphrase: "Test SDF Network ; September 2015",
})
```

## Best Practices

### 1. Validate Before Building

```tsx
const validatePayment = (destination: string, amount: string) => {
  if (!destination.startsWith('G')) {
    throw new Error('Invalid destination address')
  }
  if (parseFloat(amount) <= 0) {
    throw new Error('Amount must be positive')
  }
}
```

### 2. Check Balance Before Sending

```tsx
const { xlmBalance } = useStellarBalance(publicKey)

const handlePayment = async () => {
  const balance = parseFloat(xlmBalance?.balance || '0')
  if (balance < parseFloat(amount) + 0.00001) {
    alert('Insufficient balance')
    return
  }
  await payment.submit()
}
```

### 3. Handle Network Errors

```tsx
const { error } = useTransaction()

if (error?.type === 'network') {
  return (
    <div>
      <p>Network error. Please check your connection.</p>
      <button onClick={() => window.location.reload()}>Retry</button>
    </div>
  )
}
```

## Next Steps

- [usePayment](/hooks/use-payment) - Payment hook reference
- [useTransaction](/hooks/use-transaction) - Generic transaction hook
- [Error Handling](/guide/error-handling) - Handle transaction errors