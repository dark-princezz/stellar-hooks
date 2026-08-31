# useSorobanRead

Read-only Soroban contract calls with automatic refetching.

## Import

```tsx
import { useSorobanRead } from 'stellar-hooks'
```

## Usage

```tsx
const { data, isLoading } = useSorobanRead(
  "CABC...XYZ",
  "get_value",
  [],
  { parseResult: (scVal) => scVal.u32().toNumber() }
)
```

## Related

- [useSorobanContract](/hooks/use-soroban-contract) - Full contract interaction