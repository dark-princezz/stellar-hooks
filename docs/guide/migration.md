# Migration Guide

Migrate from previous versions or other Stellar libraries.

## From stellar-hooks v0.1.x

### Breaking Changes

#### 1. Import Path Changes

```typescript
// Old
import { useFreighter } from 'stellar-hooks/useFreighter'

// New
import { useFreighter } from 'stellar-hooks'
```

#### 2. Freighter API v2 Migration

```typescript
// Old (v3 API)
const { address } = await getAddress()

// New (v2 API)
const { address } = await getPublicKey()
```

#### 3. Network Configuration

```typescript
// Old
<StellarProvider network={networkConfig}>

// New
<StellarProvider network="testnet">
```

### Migration Steps

1. Update import paths
2. Update network configuration
3. Update Freighter API calls
4. Test thoroughly

## From @stellar/freighter-api

### Direct Migration

```typescript
// Before
import { isConnected, getAddress, signTransaction } from '@stellar/freighter-api'

const connected = await isConnected()
const { address } = await getAddress()
const { signedTxXdr } = await signTransaction(xdr)

// After
import { useFreighter } from 'stellar-hooks'

const { isConnected, publicKey, signTransaction } = useFreighter()

await connect()
const signedXdr = await signTransaction(xdr)
```

### Benefits of Migration

- React state management
- Automatic re-fetching
- Type safety
- Error handling
- Network management

## From Stellar SDK Direct Usage

### Account Fetching

```typescript
// Before
import { Horizon } from '@stellar/stellar-sdk'

const server = new Horizon.Server('https://horizon-testnet.stellar.org')
const account = await server.loadAccount(publicKey)

// After
import { useStellarAccount } from 'stellar-hooks'

const { account, isLoading, error } = useStellarAccount(publicKey)
```

### Transaction Building

```typescript
// Before
import { TransactionBuilder, Operation } from '@stellar/stellar-sdk'

const account = await server.loadAccount(source)
const transaction = new TransactionBuilder(account, { fee: "100" })
  .addOperation(Operation.payment({...}))
  .build()

// After
import { usePayment } from 'stellar-hooks'

const payment = usePayment({
  destination: "GB...",
  asset: { type: "native" },
  amount: "10",
})
```

## Common Migration Patterns

### 1. Provider Setup

```typescript
// Add to your root component
import { StellarProvider } from 'stellar-hooks'

<StellarProvider network="testnet">
  <App />
</StellarProvider>
```

### 2. Replace API Calls with Hooks

```typescript
// Before
const account = await fetchAccount(publicKey)

// After
const { account } = useStellarAccount(publicKey)
```

### 3. Replace State Management

```typescript
// Before
const [account, setAccount] = useState(null)
useEffect(() => {
  fetchAccount(publicKey).then(setAccount)
}, [publicKey])

// After
const { account } = useStellarAccount(publicKey)
```

### 4. Add Error Handling

```typescript
// Before
try {
  const account = await fetchAccount(publicKey)
} catch (error) {
  console.error(error)
}

// After
const { account, error } = useStellarAccount(publicKey)

if (error) {
  return <ErrorComponent error={error} />
}
```

## Advanced Migration

### Custom Server Configuration

```typescript
// Before
const customServer = new Horizon.Server('https://custom.example.com')

// After
<StellarProvider
  network="custom"
  customConfig={{
    horizonUrl: "https://custom.example.com",
    sorobanRpcUrl: "https://custom-rpc.example.com",
    networkPassphrase: "Custom Network ; 2024",
  }}
>
```

### Multi-Wallet Support

```typescript
// Before
if (freighterInstalled) {
  // Use Freighter
} else if (albedoInstalled) {
  // Use Albedo
}

// After
import { useWalletKit } from 'stellar-hooks'

const { availableWallets, connect } = useWalletKit()
// Use whichever wallet is available
```

## Testing Migration

```typescript
// Before
describe('Account fetching', () => {
  it('fetches account data', async () => {
    const account = await fetchAccount('G...')
    expect(account).toBeDefined()
  })
})

// After
describe('Account fetching', () => {
  it('fetches account data', async () => {
    const { result } = renderHook(() => useStellarAccount('G...'))
    await act(() => result.current.refetch())
    expect(result.current.data).toBeDefined()
  })
})
```

## Rollback Strategy

If you encounter issues during migration:

1. Keep old code in parallel
2. Gradually migrate component by component
3. Test thoroughly before removing old code
4. Use feature flags if needed

```typescript
const USE_NEW_HOOKS = true

if (USE_NEW_HOOKS) {
  const { account } = useStellarAccount(publicKey)
  // New implementation
} else {
  const account = await fetchAccount(publicKey)
  // Old implementation
}
```

## Next Steps

- [API Reference](/hooks/) - Browse available hooks
- [Troubleshooting](/guide/troubleshooting) - Common migration issues