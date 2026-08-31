# useNetwork

Read the active network configuration and switch networks at runtime.

## Import

```tsx
import { useNetwork } from 'stellar-hooks'
```

## Usage

### Basic Network Info

```tsx
function NetworkInfo() {
  const { network, networkPassphrase, horizonUrl, sorobanRpcUrl } = useNetwork()

  return (
    <div>
      <p>Network: {network}</p>
      <p>Passphrase: {networkPassphrase}</p>
      <p>Horizon: {horizonUrl}</p>
      <p>RPC: {sorobanRpcUrl}</p>
    </div>
  )
}
```

### Network Switching

```tsx
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

### Custom Network

```tsx
const { switchNetwork } = useNetwork()

switchNetwork("custom", {
  network: "custom",
  horizonUrl: "https://your-horizon.example.com",
  sorobanRpcUrl: "https://your-rpc.example.com",
  networkPassphrase: "Your Custom Network ; 2024",
})
```

## Related

- [useStellarNetwork](/hooks/use-stellar-network) - Dynamic network switching
- [Network Management](/guide/network) - Network management guide