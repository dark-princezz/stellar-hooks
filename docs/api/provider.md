# Provider

The `StellarProvider` is the root component that makes stellar-hooks available throughout your application.

## Props

```typescript
interface StellarProviderProps {
  network?: StellarNetwork
  customConfig?: CustomNetworkConfig
  children: React.ReactNode
}
```

### network

The network to use: `"testnet"`, `"mainnet"`, `"futurenet"`, or `"custom"`.

```tsx
<StellarProvider network="testnet">
  <App />
</StellarProvider>
```

### customConfig

Custom network configuration when `network="custom"`:

```typescript
interface CustomNetworkConfig {
  network: string
  horizonUrl: string
  sorobanRpcUrl: string
  networkPassphrase: string
}
```

```tsx
<StellarProvider
  network="custom"
  customConfig={{
    network: "custom",
    horizonUrl: "https://your-horizon.example.com",
    sorobanRpcUrl: "https://your-rpc.example.com",
    networkPassphrase: "Your Custom Network ; 2024",
  }}
>
  <App />
</StellarProvider>
```

## Context Access

Access the provider context using `useStellarContext`:

```tsx
import { useStellarContext } from 'stellar-hooks'

function MyComponent() {
  const { config, network } = useStellarContext()
  
  return (
    <div>
      <p>Current network: {network}</p>
      <p>Horizon URL: {config.horizonUrl}</p>
    </div>
  )
}
```

## Network Persistence

Network selection is automatically persisted to `localStorage`. To clear persisted network:

```typescript
localStorage.removeItem('stellar-hooks:network')
```

## Related

- [Provider Setup](/guide/provider) - Provider setup guide
- [Network Management](/guide/network) - Network configuration guide