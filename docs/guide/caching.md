# Caching & Performance

Optimize your application with caching strategies.

## Built-in Caching

stellar-hooks includes intelligent caching for:

- Account data
- Balance queries
- stellar.toml files
- Ledger entries
- Contract storage

## Cache Configuration

### Cache TTL

Set cache time-to-live for individual hooks:

```tsx
const { data } = useStellarAccount(publicKey, {
  cacheTTL: 60000, // 1 minute
})
```

### Cache Keys

Provide custom cache keys for advanced scenarios:

```tsx
const { data } = useStellarAccount(publicKey, {
  cacheKey: "user-account",
})
```

### Cache Control

Disable caching when needed:

```tsx
const { data } = useStellarAccount(publicKey, {
  cacheKey: null, // Disable caching
})
```

## Polling Strategies

### Polling Intervals

Set up automatic data refresh:

```tsx
const { data } = useStellarAccount(publicKey, {
  refetchInterval: 10000, // Poll every 10 seconds
})
```

### Smart Polling

Disable overlapping requests:

```tsx
const { data } = useStellarAccount(publicKey, {
  refetchInterval: 5000,
  deduplicate: true, // Skip if previous request still active
})
```

### Debounce Delays

Avoid rapid re-fetches:

```tsx
const { data } = useStellarAccount(publicKey, {
  debounceDelay: 500, // Wait 500ms before fetching
})
```

## Performance Best Practices

### 1. Use Appropriate Polling

```tsx
// Bad: Poll too frequently
const { data } = useStellarAccount(publicKey, {
  refetchInterval: 100, // 100ms is too frequent
})

// Good: Reasonable polling
const { data } = useStellarAccount(publicKey, {
  refetchInterval: 10000, // 10 seconds
})
```

### 2. Enable Caching for Stable Data

```tsx
// Account data doesn't change often
const { data } = useStellarAccount(publicKey, {
  cacheTTL: 60000, // Cache for 1 minute
})
```

### 3. Use Batch Operations

```tsx
// Bad: Multiple individual requests
const account1 = useStellarAccount(pk1)
const account2 = useStellarAccount(pk2)
const account3 = useStellarAccount(pk3)

// Good: Single batch request
const { accounts } = useStellarAccounts([pk1, pk2, pk3])
```

### 4. Conditional Fetching

```tsx
const { data } = useStellarAccount(publicKey, {
  enabled: !!publicKey, // Only fetch when publicKey exists
})
```

## Memory Management

### Clear Cache

Clear cached data when needed:

```tsx
import { clearCache } from 'stellar-hooks'

const handleLogout = () => {
  clearCache()
  // Other logout logic
}
```

### Specific Cache Keys

Clear specific cache entries:

```tsx
import { getCache, setCache } from 'stellar-hooks'

const clearAccountCache = (publicKey: string) => {
  const cacheKey = `account-${publicKey}`
  localStorage.removeItem(cacheKey)
}
```

## Advanced Caching

### Custom Cache Implementation

```tsx
import { getCache, setCache } from 'stellar-hooks'

const customCache = {
  get: (key: string) => {
    const data = localStorage.getItem(`custom:${key}`)
    return data ? JSON.parse(data) : null
  },
  set: (key: string, value: unknown, ttl: number) => {
    localStorage.setItem(`custom:${key}`, JSON.stringify(value))
    setTimeout(() => {
      localStorage.removeItem(`custom:${key}`)
    }, ttl)
  }
}
```

### Cache Invalidation

Invalidate cache on specific events:

```tsx
const { data, refetch } = useStellarAccount(publicKey)

useEffect(() => {
  const handleAccountUpdate = () => {
    refetch() // Invalidate cache
  }

  // Listen for account update events
  window.addEventListener('account-update', handleAccountUpdate)
  return () => window.removeEventListener('account-update', handleAccountUpdate)
}, [refetch])
```

## Performance Monitoring

### Hook Activity Overlay

Monitor hook activity during development:

```tsx
import { HookActivityOverlay } from 'stellar-hooks'

<StellarProvider network="testnet">
  <HookActivityOverlay />
  <App />
</StellarProvider>
```

### Performance Profiling

```tsx
const { data, lastFetchedAt } = useStellarAccount(publicKey)

useEffect(() => {
  if (lastFetchedAt) {
    const fetchTime = Date.now() - lastFetchedAt.getTime()
    console.log(`Account fetch took ${fetchTime}ms`)
  }
}, [lastFetchedAt])
```

## Next Steps

- [API Reference](/hooks/) - Hook-specific caching options
- [Testing](/guide/testing) - Test caching behavior