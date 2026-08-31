# useStellarBalance

Fetch account balances with optional asset filtering.

## Import

```tsx
import { useStellarBalance } from 'stellar-hooks'
```

## Usage

```tsx
const { xlmBalance, isLoading } = useStellarBalance(publicKey)

if (isLoading) return <Spinner />
return <p>Balance: {xlmBalance?.balance ?? '0'} XLM</p>
```

## Related

- [useStellarAccount](/hooks/use-stellar-account) - Account data
- [useAssetBalance](/hooks/use-asset-balance) - Specific asset balance