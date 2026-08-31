# useCreateAccount

Create a new Stellar account by funding it with XLM.

## Import

```tsx
import { useCreateAccount } from 'stellar-hooks'
```

## Usage

```tsx
const createAccount = useCreateAccount({
  destination: "GNEW...",
  startingBalance: "1.5",
})
```

## Related

- [useTrustline](/hooks/use-trustline) - Trustline management