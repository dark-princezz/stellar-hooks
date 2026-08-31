# useOperations

Fetch Horizon operations with filtering.

## Import

```tsx
import { useOperations } from 'stellar-hooks'
```

## Usage

```tsx
const { operations, isLoading } = useOperations({
  forAccount: publicKey,
  limit: 10,
})
```

## Related

- [useTransactionHistory](/hooks/use-transaction-history) - Transaction history