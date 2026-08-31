# useAssetBalance

Fetch a specific asset balance for an account.

## Import

```tsx
import { useAssetBalance } from 'stellar-hooks'
```

## Usage

```tsx
const { assetBalance } = useAssetBalance(publicKey, {
  code: "USDC",
  issuer: "GA5Z...",
})
```

## Related

- [useStellarBalance](/hooks/use-stellar-balance) - Balance queries