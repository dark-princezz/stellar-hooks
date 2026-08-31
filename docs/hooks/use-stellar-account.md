# useStellarAccount

Fetch and optionally poll a single Stellar account from Horizon.

## Import

```tsx
import { useStellarAccount } from 'stellar-hooks'
```

## Usage

### Basic Account Fetch

```tsx
function AccountDisplay() {
  const { account, isLoading, error } = useStellarAccount("GAAZI4...")

  if (isLoading) return <Spinner />
  if (error) return <ErrorBanner error={error} />
  if (!account) return <EmptyState />

  return (
    <div>
      <p>Sequence: {account.sequence}</p>
      <p>Balance: {account.balances[0].balance} XLM</p>
    </div>
  )
}
```

### With Polling

```tsx
const { account, isLoading } = useStellarAccount("GAAZI4...", {
  refetchInterval: 10000, // Poll every 10 seconds
})
```

### With Caching

```tsx
const { account } = useStellarAccount("GAAZI4...", {
  cacheKey: "user-account",
  cacheTTL: 60000, // Cache for 1 minute
})
```

### Conditional Fetching

```tsx
const { account } = useStellarAccount(publicKey, {
  enabled: !!publicKey, // Only fetch when publicKey exists
})
```

## API

### Parameters

```typescript
interface UseStellarAccountOptions {
  enabled?: boolean
  refetchInterval?: number
  deduplicate?: boolean
  debounceDelay?: number
  cacheKey?: string
  cacheTtl?: number
}
```

### Return Value

```typescript
interface UseStellarAccountReturn {
  account: StellarAccountData | null
  data: StellarAccountData | null
  isLoading: boolean
  isRefetching: boolean
  error: Error | null
  lastFetchedAt: Date | null
  refetch: () => Promise<void>
}
```

## Account Data Structure

```typescript
interface StellarAccountData {
  sequence: string
  balances: StellarBalance[]
  subentryCount: number
  numSponsored: number
  numSponsoring: number
  raw: Horizon.AccountResponse
}
```

## Related

- [useStellarAccounts](/hooks/use-stellar-accounts) - Batch account fetching
- [useStellarBalance](/hooks/use-stellar-balance) - Balance queries
- [Caching & Performance](/guide/caching) - Caching strategies