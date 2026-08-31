# useFreighter

Connect to and interact with the Freighter browser wallet.

## Import

```tsx
import { useFreighter } from 'stellar-hooks'
```

## Usage

### Basic Connection

```tsx
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
  return (
    <div style={{ color: 'red', padding: '1rem' }}>
      <h3>Network Mismatch</h3>
      <p>{networkPassphraseWarning}</p>
    </div>
  )
}
```

### Sign Transactions

```tsx
const { signTransaction } = useFreighter()

const handleSign = async (xdr: string) => {
  try {
    const signedXdr = await signTransaction(xdr, {
      networkPassphrase: "Test SDF Network ; September 2015",
    })
    console.log('Signed:', signedXdr)
  } catch (err) {
    console.error('Signing failed:', err)
  }
}
```

### Sign Messages

```tsx
const { signMessage, isSigningMessage } = useFreighter()

const handleSignMessage = async (message: string) => {
  try {
    const signature = await signMessage(message)
    console.log('Signed:', signature)
  } catch (err) {
    console.error('Message signing failed:', err)
  }
}

<button onClick={() => handleSignMessage("Hello")} disabled={isSigningMessage}>
  {isSigningMessage ? 'Signing...' : 'Sign Message'}
</button>
```

## API

### Parameters

```typescript
interface UseFreighterOptions {
  autoConnect?: boolean
  expectedNetworkPassphrase?: string
}
```

### Return Value

```typescript
interface UseFreighterReturn {
  isInstalled: boolean
  isConnected: boolean
  publicKey: string | null
  network: string | null
  networkPassphrase: string | null
  networkPassphraseMismatch: boolean
  networkPassphraseWarning: string | null
  isLoading: boolean
  isSigningMessage: boolean
  isAutoConnecting: boolean
  error: Error | null
  connect: () => Promise<void>
  disconnect: () => void
  signTransaction: (xdr: string, opts?: SignTransactionOptions) => Promise<string>
  signAuthEntry: (entryPreimageXdr: string) => Promise<string>
  signBlob: (blob: string, opts?: { accountToSign?: string }) => Promise<string>
  signMessage: (message: string, opts?: { accountToSign?: string }) => Promise<string>
}
```

## Related

- [useWallet](/hooks/use-wallet) - Unified multi-wallet interface
- [useFreighterAccounts](/hooks/use-freighter-accounts) - Multi-account support
- [Error Handling](/guide/error-handling) - Error handling patterns