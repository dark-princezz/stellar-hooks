# useMultiOperationTransaction

Submit multi-operation transactions.

## Import

```tsx
import { useMultiOperationTransaction } from 'stellar-hooks'
```

## Usage

```tsx
const multiOp = useMultiOperationTransaction({
  operations: [
    Operation.payment({...}),
    Operation.manageData({...}),
  ],
})
```

## Related

- [useTransaction](/hooks/use-transaction) - Generic transaction hook