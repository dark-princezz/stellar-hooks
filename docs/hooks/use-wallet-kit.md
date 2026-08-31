# useWalletKit

Multi-wallet detection and unified interface.

## Import

```tsx
import { useWalletKit } from 'stellar-hooks'
```

## Usage

### Basic Multi-Wallet Detection

```tsx
function WalletPicker() {
  const { availableWallets, activeWallet, publicKey, connect, disconnect } = useWalletKit()

  if (publicKey) {
    return (
      <div>
        <p>Connected via {activeWallet}: {publicKey}</p>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    )
  }

  if (availableWallets.length === 0) {
    return <p>No Stellar wallets detected.</p>
  }

  return (
    <div>
      {availableWallets.map((id) => (
        <button key={id} onClick={() => connect(id)}>
          Connect {id}
        </button>
      ))}
    </div>
  )
}
```

## Related

- [useWallet](/hooks/use-wallet) - Unified wallet interface
- [useFreighter](/hooks/use-freighter) - Freighter-specific hook
- [Wallet Integration](/guide/wallets) - Wallet integration guide