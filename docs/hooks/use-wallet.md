# useWallet

Unified multi-wallet interface for Stellar dApps.

## Import

```tsx
import { useWallet } from 'stellar-hooks'
```

## Usage

### Basic Usage

```tsx
function WalletApp() {
  const { availableWallets, activeWallet, publicKey, connect, disconnect } = useWallet()

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

### Auto-Connect

```tsx
const { publicKey, isConnected } = useWallet({
  autoConnect: true,
})

if (isConnected) return <p>Welcome back, {publicKey}</p>
```

### Sign Operations

```tsx
const { signTransaction, signMessage } = useWallet()

const signedXdr = await signTransaction(transactionXdr, {
  networkPassphrase: "Test SDF Network ; September 2015",
})

const signature = await signMessage("Hello Stellar")
```

## Related

- [useFreighter](/hooks/use-freighter) - Freighter-specific hook
- [useWalletKit](/hooks/use-wallet-kit) - Multi-wallet detection
- [Wallet Integration](/guide/wallets) - Wallet integration guide