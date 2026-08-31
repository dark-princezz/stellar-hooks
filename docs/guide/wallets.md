# Wallet Integration

Connect Stellar wallets to your application using stellar-hooks.

## Supported Wallets

`stellar-hooks` supports multiple Stellar wallets:

- **Freighter** - Browser extension (recommended)
- **Albedo** - Web-based wallet
- **xBull** - Browser extension
- **Rabet** - Browser extension
- **WalletKit** - Multi-wallet detection
- **WalletsKit** - Extended multi-wallet support

## Freighter (Recommended)

Freighter is the most popular Stellar wallet extension and is the default choice for most applications.

### Basic Setup

```tsx
import { useFreighter } from 'stellar-hooks'

function FreighterConnect() {
  const { isConnected, publicKey, connect, disconnect } = useFreighter()

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

### Auto-Connect

Automatically reconnect returning users:

```tsx
const { isConnected, publicKey, isAutoConnecting } = useFreighter({
  autoConnect: true,
})

if (isAutoConnecting) return <p>Reconnecting…</p>
if (isConnected) return <p>Welcome back, {publicKey}</p>
```

### Network Mismatch Detection

```tsx
const { networkPassphraseMismatch, networkPassphraseWarning } = useFreighter({
  expectedNetworkPassphrase: "Test SDF Network ; September 2015",
})

if (networkPassphraseMismatch) {
  return <div style={{ color: 'red' }}>{networkPassphraseWarning}</div>
}
```

## Multi-Wallet Support

### useWalletKit

Detect and connect to any installed wallet:

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

  if (availableWallets.length === 0) return <p>No Stellar wallets detected.</p>

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

### useWallet

Unified interface for wallet operations:

```tsx
import { useWallet } from 'stellar-hooks'

const { availableWallets, activeWallet, publicKey, connect, signTransaction } = useWallet({
  walletId: "freighter", // Optional specific wallet
  autoConnect: true,
})
```

## Individual Wallet Hooks

### Albedo

```tsx
import { useAlbedo } from 'stellar-hooks'

const { isConnected, publicKey, connect, signTransaction } = useAlbedo()
```

### xBull

```tsx
import { useXBull } from 'stellar-hooks'

const { isConnected, publicKey, connect, signTransaction } = useXBull()
```

### Rabet

```tsx
import { useRabet } from 'stellar-hooks'

const { isConnected, publicKey, connect, signTransaction } = useRabet({
  autoConnect: true,
})
```

## Signing Operations

All wallet hooks support signing operations:

### Sign Transactions

```tsx
const { signTransaction } = useFreighter()

const signedXdr = await signTransaction(transactionXdr, {
  networkPassphrase: "Test SDF Network ; September 2015",
})
```

### Sign Messages

```tsx
const { signMessage } = useFreighter()

const signature = await signMessage("Hello Stellar")
```

### Sign Auth Entries

```tsx
const { signAuthEntry } = useFreighter()

const signedAuthEntry = await signAuthEntry(authEntryXdr)
```

## Multi-Account Support

For wallets that support multiple accounts:

```tsx
import { useFreighterAccounts } from 'stellar-hooks'

const { known, active, switchAccount, isSwitching } = useFreighterAccounts()

return (
  <select
    value={active ?? ""}
    disabled={isSwitching}
    onChange={async (e) => {
      const result = await switchAccount(e.target.value)
      if (result !== e.target.value) {
        alert(`Wrong account selected`)
      }
    }}
  >
    {known.map((pk) => <option key={pk} value={pk}>{pk.slice(0, 8)}…</option>)}
  </select>
)
```

## Best Practices

### Wallet Detection

Always check if a wallet is installed before prompting connection:

```tsx
const { isInstalled } = useFreighter()

if (!isInstalled) {
  return (
    <div>
      <p>Please install Freighter wallet</p>
      <a href="https://freighter.app" target="_blank">Install Freighter</a>
    </div>
  )
}
```

### Error Handling

Handle user rejection gracefully:

```tsx
import { UserRejectedError } from 'stellar-hooks'

try {
  await connect()
} catch (err) {
  if (err instanceof UserRejectedError) {
    console.log('User rejected connection')
  } else {
    console.error('Connection failed:', err)
  }
}
```

### Network Consistency

Ensure wallet and app networks match:

```tsx
const { networkPassphraseMismatch } = useFreighter()

if (networkPassphraseMismatch) {
  // Prevent operations on wrong network
  return <div>Please switch your wallet to the correct network</div>
}
```

## Next Steps

- [Error Handling](/guide/error-handling) - Handle wallet-related errors
- [Transaction Building](/guide/transactions) - Build and sign transactions