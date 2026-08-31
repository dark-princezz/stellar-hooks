# Error Handling

Learn how to handle errors effectively in stellar-hooks applications.

## Error Patterns

`stellar-hooks` uses different error patterns depending on the hook type:

- **Read hooks**: Simple `error: Error | null`
- **Transaction hooks**: Typed `StellarTransactionError`
- **Batch operations**: Per-item error collection
- **User actions**: `UserRejectedError` for wallet rejections

## Common Error Patterns

### Pattern 1: Standard Read Hooks

Most read-only hooks follow this pattern:

```tsx
const { data, isLoading, error, refetch } = useStellarAccount(publicKey)

if (isLoading) return <Spinner />
if (error) return <ErrorBanner message={error.message} onRetry={refetch} />
if (!data) return <EmptyState />

return <div>{data.sequence}</div>
```

### Pattern 2: Transaction Hooks

Transaction hooks use typed errors:

```tsx
const { submit, status, error, reset } = useTransaction()

if (error) {
  switch (error.type) {
    case 'network':
      return <NetworkError error={error} />
    case 'simulation':
      return <SimulationError error={error} />
    case 'submission':
      return <SubmissionError error={error} />
    case 'timeout':
      return <TimeoutError error={error} />
    default:
      return <GenericError error={error} />
  }
}
```

### Pattern 3: User Rejection

Handle wallet user rejection gracefully:

```tsx
import { UserRejectedError } from 'stellar-hooks'

const { connect } = useFreighter()

const handleConnect = async () => {
  try {
    await connect()
  } catch (err) {
    if (err instanceof UserRejectedError) {
      console.log('User rejected connection')
      // Show user-friendly message
      alert('Connection was cancelled. Please try again if you want to connect.')
    } else {
      console.error('Connection failed:', err)
    }
  }
}
```

## Error Types

### UserRejectedError

Thrown when users reject wallet operations:

```typescript
try {
  await signTransaction(xdr)
} catch (err) {
  if (err instanceof UserRejectedError) {
    // User cancelled the operation
  }
}
```

### StellarTransactionError

Typed error for transaction operations:

```typescript
interface StellarTransactionError {
  type: 'network' | 'simulation' | 'submission' | 'timeout' | 'on_chain'
  message: string
  details?: unknown
}
```

## Best Practices

### 1. Always Check Error State

```tsx
const { data, error } = useStellarAccount(publicKey)

if (error) {
  // Handle error before rendering data
  return <ErrorComponent error={error} />
}

// Safe to use data
return <div>{data.sequence}</div>
```

### 2. Provide Retry Mechanisms

```tsx
const { data, error, refetch } = useStellarAccount(publicKey)

if (error) {
  return (
    <ErrorBanner 
      error={error}
      onRetry={() => refetch()}
    />
  )
}
```

### 3. Use Loading States Appropriately

```tsx
const { isLoading, error, data } = useStellarAccount(publicKey)

if (isLoading) return <Spinner />
if (error) return <ErrorComponent error={error} />
if (!data) return <EmptyState />

return <DataComponent data={data} />
```

### 4. Handle Network Errors

```tsx
const { error } = useStellarAccount(publicKey)

if (error?.type === 'network') {
  return (
    <NetworkErrorBanner>
      Network request failed. Please check your connection.
      <button onClick={() => window.location.reload()}>Retry</button>
    </NetworkErrorBanner>
  )
}
```

## Error Recovery

### Automatic Retry

For transient errors, implement automatic retry:

```tsx
const { error, refetch } = useStellarAccount(publicKey)

useEffect(() => {
  if (error?.type === 'network') {
    const retryDelay = setTimeout(() => {
      refetch()
    }, 5000)
    return () => clearTimeout(retryDelay)
  }
}, [error, refetch])
```

### User-Initiated Retry

```tsx
const { error, refetch } = useStellarAccount(publicKey)

if (error) {
  return (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={() => refetch()}>Retry</button>
    </div>
  )
}
```

## Wallet-Specific Errors

### Freighter Connection Timeout

```tsx
const { isInstalled, isLoading } = useFreighter()

useEffect(() => {
  if (isLoading && !isInstalled) {
    const timeout = setTimeout(() => {
      console.warn('Freighter detection taking longer than expected')
    }, 5000)
    return () => clearTimeout(timeout)
  }
}, [isLoading, isInstalled])
```

### Network Mismatch

```tsx
const { networkPassphraseMismatch, networkPassphraseWarning } = useFreighter()

if (networkPassphraseMismatch) {
  return (
    <div style={{ color: 'red', padding: '1rem' }}>
      <h3>Network Mismatch</h3>
      <p>{networkPassphraseWarning}</p>
    </div>
  )
}
```

## Transaction Error Handling

### Simulation Errors

```tsx
const { call, error } = useSorobanContract({
  contractId,
  method: "transfer",
  args: [...],
})

if (error?.type === 'simulation') {
  return (
    <div>
      <p>Contract simulation failed</p>
      <p>Details: {error.message}</p>
      <button onClick={() => call()}>Retry</button>
    </div>
  )
}
```

### Submission Errors

```tsx
const { submit, error } = usePayment({...})

if (error?.type === 'submission') {
  return (
    <div>
      <p>Transaction submission failed</p>
      <p>This might be due to network issues or invalid transaction data</p>
    </div>
  )
}
```

## Error Boundaries

Wrap your components in error boundaries:

```tsx
class StellarErrorBoundary extends React.Component {
  state = { hasError: false }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Stellar error caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />
    }
    return this.props.children
  }
}

<StellarErrorBoundary>
  <YourApp />
</StellarErrorBoundary>
```

## Next Steps

- [Troubleshooting](/guide/troubleshooting) - Common issues and solutions
- [API Reference](/hooks/) - Hook-specific error handling