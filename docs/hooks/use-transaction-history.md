# useTransactionHistory

Fetch transaction history for an account.

## Import

```tsx
import { useTransactionHistory } from 'stellar-hooks'
```

## Usage

```tsx
const { transactions, isLoading } = useTransactionHistory(publicKey, {
  limit: 10,
})
```

## Related

- [useOperations](/hooks/use-operations) - Operations