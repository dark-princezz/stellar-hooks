# Wallet Connection

Examples of connecting to different Stellar wallets.

## Freighter Connection

```tsx
import { useFreighter } from 'stellar-hooks'

function FreighterConnect() {
  const { isInstalled, isConnected, publicKey, connect, disconnect } = useFreighter()

  if (!isInstalled) {
    return (
      <div>
        <p>Freighter not detected. Please install it from freighter.app</p>
        <a href="https://freighter.app" target="_blank">Install Freighter</a>
      </div>
    )
  }

  if (!isConnected) {
    return <button onClick={connect}>Connect Freighter</button>
  }

  return (
    <div>
      <p>Connected: {publicKey}</p>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  )
}
```

## Multi-Wallet Support

```tsx
import { useWalletKit } from 'stellar-hooks'

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
    return <p>No Stellar wallets detected. Please install a wallet.</p>
  }

  return (
    <div>
      <h3>Select a wallet:</h3>
      {availableWallets.map((id) => (
        <button key={id} onClick={() => connect(id)}>
          Connect {id}
        </button>
      ))}
    </div>
  )
}
```

## Auto-Connect

```tsx
import { useFreighter } from 'stellar-hooks'

function AutoConnectApp() {
  const { isConnected, publicKey, isAutoConnecting } = useFreighter({
    autoConnect: true,
  })

  if (isAutoConnecting) {
    return <p>Reconnecting to wallet...</p>
  }

  if (!isConnected) {
    return <button onClick={() => connect()}>Connect Wallet</button>
  }

  return <p>Welcome back, {publicKey}</p>
}
```

## Network Mismatch Detection

```tsx
import { useFreighter } from 'stellar-hooks'

function NetworkCheck() {
  const { networkPassphraseMismatch, networkPassphraseWarning } = useFreighter({
    expectedNetworkPassphrase: "Test SDF Network ; September 2015",
  })

  if (networkPassphraseMismatch) {
    return (
      <div style={{ 
        backgroundColor: '#fee2e2', 
        border: '1px solid #fca5a5', 
        padding: '1rem', 
        borderRadius: '4px' 
      }}>
        <h3 style={{ color: '#991b1b' }}>Network Mismatch</h3>
        <p>{networkPassphraseWarning}</p>
        <p>Please switch your wallet to the correct network.</p>
      </div>
    )
  }

  return null
}
```

## Signing Messages

```tsx
import { useFreighter } from 'stellar-hooks'

function MessageSigning() {
  const { isConnected, publicKey, signMessage, isSigningMessage } = useFreighter()

  const handleSign = async () => {
    try {
      const message = `Sign in to MyApp at ${new Date().toISOString()}`
      const signature = await signMessage(message)
      console.log('Signature:', signature)
      // Send signature to backend for verification
    } catch (err) {
      console.error('Signing failed:', err)
    }
  }

  if (!isConnected) {
    return <p>Please connect your wallet first</p>
  }

  return (
    <div>
      <button onClick={handleSign} disabled={isSigningMessage}>
        {isSigningMessage ? 'Signing...' : 'Sign Message'}
      </button>
    </div>
  )
}
```

## Related

- [useFreighter](/hooks/use-freighter) - Freighter hook reference
- [useWalletKit](/hooks/use-wallet-kit) - Multi-wallet hook reference
- [Wallet Integration](/guide/wallets) - Wallet integration guide