# Network Management

Learn how to manage Stellar networks in your application.

## Network Basics

Stellar operates on different networks:
- **Testnet** - Development network with free test XLM
- **Mainnet** - Production network with real value
- **Futurenet** - Testing network for Soroban features
- **Custom** - Your own network configuration

## Static Network Configuration

Set the network when creating the provider:

```tsx
<StellarProvider network="testnet">
  <App />
</StellarProvider>
```

## Dynamic Network Switching

Use the `useNetwork` hook to switch networks at runtime:

```tsx
import { useNetwork } from 'stellar-hooks'

function NetworkSwitcher() {
  const { network, switchNetwork } = useNetwork()

  return (
    <select
      value={network}
      onChange={(e) => switchNetwork(e.target.value as StellarNetwork)}
    >
      <option value="testnet">Testnet</option>
      <option value="mainnet">Mainnet</option>
      <option value="futurenet">Futurenet</option>
    </select>
  )
}
```

## useStellarNetwork

For more control, use `useStellarNetwork`:

```tsx
import { useStellarNetwork } from 'stellar-hooks'

function NetworkToggle() {
  const { network, setNetwork } = useStellarNetwork()

  return (
    <button onClick={() => setNetwork(network === "testnet" ? "mainnet" : "testnet")}>
      Currently: {network} — click to switch
    </button>
  )
}
```

## Network Persistence

Network selection is automatically persisted to `localStorage`. This means:

- User's network choice survives page reloads
- Works across browser tabs
- No need for manual state management

To clear persisted network:

```typescript
localStorage.removeItem('stellar-hooks:network')
```

## Custom Networks

Configure custom networks for your specific needs:

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

## Network-Specific Features

### Testnet
- Free XLM from Friendbot
- Faster confirmation times
- Ideal for development and testing

### Mainnet
- Real value transactions
- Standard confirmation times
- Production use only

### Futurenet
- Latest Soroban features
- Testing ground for new protocol features
- May be reset periodically

## Advanced Configuration

### Custom RPC and Horizon Endpoints

For detailed information on configuring custom RPC and Horizon endpoints, see the [RPC Endpoint Configuration](/guides/rpc-endpoint-configuration) guide. This guide covers:

- Using default SDF endpoints for each network
- Configuring custom RPC endpoints
- Overriding individual endpoints
- Runtime network selection
- Environment variable configuration
- Verifying your configuration

## Network Mismatch Detection

Detect when wallets are on the wrong network:

```tsx
import { useFreighter } from 'stellar-hooks'

function NetworkCheck() {
  const { networkPassphraseMismatch, networkPassphraseWarning } = useFreighter()

  if (networkPassphraseMismatch) {
    return (
      <div style={{ color: 'red', padding: '1rem' }}>
        <h3>Network Mismatch</h3>
        <p>{networkPassphraseWarning}</p>
      </div>
    )
  }

  return null
}
```

## Best Practices

### Development Workflow

1. Develop on testnet with Freighter
2. Test thoroughly before mainnet deployment
3. Use network switching to test both environments
4. Validate network configuration in production

### Environment-Specific Configuration

```tsx
const network = import.meta.env.PROD ? "mainnet" : "testnet"

<StellarProvider network={network}>
  <App />
</StellarProvider>
```

### Network Validation

Always validate network settings in production:

```tsx
function validateNetwork(network: string): boolean {
  const validNetworks = ["testnet", "mainnet", "futurenet", "custom"]
  return validNetworks.includes(network)
}
```

## Next Steps

- [Wallet Integration](/guide/wallets) - Connect wallets to your application
- [Error Handling](/guide/error-handling) - Handle network-related errors