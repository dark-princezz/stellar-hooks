# useNetworkConfig

Read the full network configuration object.

## Import

```tsx
import { useNetworkConfig } from 'stellar-hooks'
```

## Usage

```tsx
const config = useNetworkConfig()

console.log('Network:', config.network)
console.log('Horizon URL:', config.horizonUrl)
```

## Related

- [useNetwork](/hooks/use-network) - Network configuration