# useTransaction

Build, sign, and submit custom Stellar transactions.

## Import

```tsx
import { useTransaction } from 'stellar-hooks'
```

## Usage

### Basic Transaction

```tsx
import { Operation } from '@stellar/stellar-sdk'

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
    ])
  }

  return (
    <button onClick={handleSubmit} disabled={status !== "idle"}>
      Submit Transaction
    </button>
  )
}
```

### Multi-Operation Transaction

```tsx
const { submit } = useTransaction({
  fee: 300,
})

await submit([
  Operation.payment({...}),
  Operation.manageData({...}),
  Operation.bumpSequence({...}),
])
```

### With Fee Bump

```tsx
const { submit } = useTransaction({
  feeBump: {
    fee: "1000",
    sponsor: "GSPONSOR...",
  },
})
```

## Related

- [usePayment](/hooks/use-payment) - Payment-specific hook
- [Transaction Building](/guide/transactions) - Transaction guide