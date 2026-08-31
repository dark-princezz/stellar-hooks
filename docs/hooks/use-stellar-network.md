# useStellarNetwork

Dynamic network switching without provider remount.

## Import

```tsx
import { useStellarNetwork } from 'stellar-hooks'
```

## Usage

```tsx
const { network, setNetwork } = useStellarNetwork()

return (
  <button onClick={() => setNetwork(network === "testnet" ? "mainnet" : "testnet")}>
    Switch Network
  </button>
)
```

## Related

- [useNetwork](/hooks/use-network) - Network configuration