# useRabet

Connect to and interact with the Rabet browser extension wallet.

## Import

```tsx
import { useRabet } from 'stellar-hooks'
```

## Usage

```tsx
const { isConnected, publicKey, connect, signTransaction } = useRabet({
  autoConnect: true,
})
```

## Related

- [useWallet](/hooks/use-wallet) - Unified wallet interface