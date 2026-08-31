# useEffects

Fetch account effects from Horizon.

## Import

```tsx
import { useEffects } from 'stellar-hooks'
```

## Usage

```tsx
const { effects, isLoading } = useEffects({
  forAccount: publicKey,
  limit: 10,
})
```

## Related

- [useOperations](/hooks/use-operations) - Operations