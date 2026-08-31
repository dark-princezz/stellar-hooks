# useContractEvents

Stream contract events from the ledger.

## Import

```tsx
import { useContractEvents } from 'stellar-hooks'
```

## Usage

```tsx
const { events, isLoading } = useContractEvents({
  contractId: "CABC...XYZ",
  fromLedger: 12345,
  toLedger: 12350,
})
```

## Related

- [useSorobanContract](/hooks/use-soroban-contract) - Contract interaction