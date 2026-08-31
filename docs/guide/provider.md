# Provider Setup

The `StellarProvider` is the root component that makes stellar-hooks available throughout your application.

## Overview

The provider handles:
- Network configuration
- Context provision for all hooks
- Network persistence
- Custom server instances

## Basic Usage

```tsx
import { StellarProvider } from 'stellar-hooks'

function App() {
  return (
    <StellarProvider network="testnet">
      <YourApplication />
    </StellarProvider>
  )
}
```

## Provider Hierarchy

The provider should be at the root of your application, wrapping all components that use stellar-hooks:

```tsx
// main.tsx
import { StellarProvider } from 'stellar-hooks'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StellarProvider network="testnet">
    <App />
  </StellarProvider>
)
```

## Multiple Providers

You can use multiple providers for different parts of your application:

```tsx
<StellarProvider network="testnet">
  <TestnetApp />
</StellarProvider>

<StellarProvider network="mainnet">
  <MainnetApp />
</StellarProvider>
```

## Custom Server Instances

For advanced use cases, you can provide custom server instances:

```tsx
import { StellarProvider } from 'stellar-hooks'
import { Horizon } from '@stellar/stellar-sdk'
import { rpc } from '@stellar/stellar-sdk/rpc'

const customHorizon = new Horizon.Server('https://custom-horizon.example.com')
const customRpc = new rpc.Server('https://custom-rpc.example.com')

<StellarProvider
  network="custom"
  customConfig={{
    network: "custom",
    horizonUrl: "https://custom-horizon.example.com",
    sorobanRpcUrl: "https://custom-rpc.example.com",
    networkPassphrase: "Custom Network ; 2024",
  }}
>
  <App />
</StellarProvider>
```

## Context Access

Hooks access the provider context automatically. You can also access it directly:

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

## Error Handling

The provider throws an error if:

- Custom network configuration is provided when network is not "custom"
- Required custom configuration fields are missing
- Invalid network configuration

```tsx
try {
  <StellarProvider network="invalid">
    <App />
  </StellarProvider>
} catch (error) {
  console.error('Provider error:', error)
}
```

## Performance Considerations

The provider uses React Context, which is efficient for most applications. For performance-critical applications:

- Use provider at the root level
- Avoid frequent network switches
- Use appropriate caching strategies in hooks

## Next Steps

- [Network Management](/guide/network) - Learn about dynamic network switching
- [Wallet Integration](/guide/wallets) - Connect your first wallet