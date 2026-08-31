# Configuration

Configure `stellar-hooks` for your application's needs.

## StellarProvider

The `StellarProvider` is the root component that makes stellar-hooks available throughout your application.

### Basic Setup

```tsx
import { StellarProvider } from 'stellar-hooks'

<StellarProvider network="testnet">
  <App />
</StellarProvider>
```

### Network Options

```tsx
<StellarProvider network="mainnet">
  <App />
</StellarProvider>
```

Available networks:
- `"testnet"` - Stellar testnet
- `"mainnet"` - Stellar mainnet  
- `"futurenet"` - Stellar futurenet
- `"custom"` - Custom network configuration

### Custom Network Configuration

For detailed information on custom RPC and Horizon endpoint configuration, see the [RPC Endpoint Configuration](/guides/rpc-endpoint-configuration) guide.

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

### Predefined Network Configs

You can use predefined network configurations:

```tsx
import { StellarProvider, NETWORK_CONFIGS } from 'stellar-hooks'

<StellarProvider config={NETWORK_CONFIGS.testnet}>
  <App />
</StellarProvider>
```

## Provider Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `network` | `StellarNetwork` | `"testnet"` | Network to connect to |
| `customConfig` | `CustomNetworkConfig` | `undefined` | Custom network configuration (required when network="custom") |
| `config` | `NetworkConfig` | `undefined` | Full network configuration object (overrides network) |

## Type Definitions

```typescript
type StellarNetwork = "testnet" | "mainnet" | "futurenet" | "custom"

interface CustomNetworkConfig {
  network: "custom"
  horizonUrl: string
  sorobanRpcUrl: string
  networkPassphrase: string
}

interface NetworkConfig {
  network: StellarNetwork
  horizonUrl: string
  sorobanRpcUrl: string
  networkPassphrase: string
}
```

## Network Persistence

The active network is persisted to `localStorage` under the key `stellar-hooks:network`. This means:

- Network selection survives page reloads
- Users don't need to re-select their preferred network
- Works across browser tabs

To clear the persisted network:

```typescript
localStorage.removeItem('stellar-hooks:network')
```

## Best Practices

### Development vs Production

```tsx
const network = import.meta.env.PROD ? "mainnet" : "testnet"

<StellarProvider network={network}>
  <App />
</StellarProvider>
```

### Environment Variables

```tsx
// .env
VITE_STELLAR_NETWORK=testnet
VITE_CUSTOM_HORIZON_URL=https://custom-horizon.example.com
```

```tsx
<StellarProvider
  network={import.meta.env.VITE_STELLAR_NETWORK}
  customConfig={
    import.meta.env.VITE_STELLAR_NETWORK === "custom" ? {
      horizonUrl: import.meta.env.VITE_CUSTOM_HORIZON_URL,
      sorobanRpcUrl: import.meta.env.VITE_CUSTOM_RPC_URL,
      networkPassphrase: import.meta.env.VITE_CUSTOM_PASSPHRASE,
    } : undefined
  }
>
  <App />
</StellarProvider>
```

## Next Steps

- [Network Management](/guide/network) - Learn about dynamic network switching
- [Wallet Integration](/guide/wallets) - Connect your first wallet