# useTrustline

Create or modify trustlines for custom assets.

## Import

```tsx
import { useTrustline } from 'stellar-hooks'
```

## Usage

```tsx
const trustline = useTrustline({
  asset: { type: "credit", code: "USDC", issuer: "GA5Z..." },
  limit: "10000",
})
```

## Related

- [useCreateAccount](/hooks/use-create-account) - Account creation