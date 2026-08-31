# useHorizonServer

Get a configured Horizon server instance for custom queries.

## Import

```tsx
import { useHorizonServer } from 'stellar-hooks'
```

## Usage

```tsx
const server = useHorizonServer()

const offers = await server.offers().forAccount(publicKey).call()
```

## Related

- [Network Management](/guide/network) - Network configuration