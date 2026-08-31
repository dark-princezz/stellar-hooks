# useSorobanServer

Get a configured Soroban RPC server instance for custom queries.

## Import

```tsx
import { useSorobanServer } from 'stellar-hooks'
```

## Usage

```tsx
const server = useSorobanServer()

const ledgerInfo = await server.getLatestLedger()
const simulation = await server.simulateTransaction(txXdr)
```

## Related

- [useSorobanContract](/hooks/use-soroban-contract) - Contract interaction