# useLedgerEntries

Fetch multiple ledger entries in parallel.

## Import

```tsx
import { useLedgerEntries } from 'stellar-hooks'
```

## Usage

```tsx
const { entries, isLoading } = useLedgerEntries([key1, key2, key3])
```

## Related

- [useLedgerEntry](/hooks/use-ledger-entry) - Single ledger entry