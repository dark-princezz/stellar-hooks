# API Reference

Complete API reference for stellar-hooks.

## Provider

### StellarProvider

The root provider that makes stellar-hooks available throughout your application.

```tsx
import { StellarProvider } from 'stellar-hooks'

<StellarProvider network="testnet">
  <App />
</StellarProvider>
```

## Types

### Common Types

#### StellarPublicKey

Branded type for Stellar public keys:

```typescript
import { asPublicKey, type StellarPublicKey } from 'stellar-hooks'

const publicKey: StellarPublicKey = asPublicKey("GAAZI4...")
```

#### StellarContractId

Branded type for Soroban contract IDs:

```typescript
import { asContractId, type StellarContractId } from 'stellar-hooks'

const contractId: StellarContractId = asContractId("CABC...")
```

#### StellarXdrString

Branded type for XDR strings:

```typescript
import { unsafeAsXdrString, type StellarXdrString } from 'stellar-hooks'

const xdr: StellarXdrString = unsafeAsXdrString("AAAA...")
```

## Utilities

### Cache Functions

```typescript
import { getCache, setCache, clearCache } from 'stellar-hooks'

// Get cached value
const data = getCache<YourType>('cache-key')

// Set cached value with TTL
setCache('cache-key', data, 60000) // 1 minute TTL

// Clear all cache
clearCache()
```

### XDR Utilities

```typescript
import { decodeXdr, formatXdrResult, detectXdrType } from 'stellar-hooks/utils/xdr'

// Decode XDR
const decoded = decodeXdr(xdrString)

// Format XDR result
const formatted = formatXdrResult(decoded)

// Detect XDR type
const type = detectXdrType(xdrString)
```

## Network Configs

Predefined network configurations:

```typescript
import { NETWORK_CONFIGS } from 'stellar-hooks'

const testnetConfig = NETWORK_CONFIGS.testnet
const mainnetConfig = NETWORK_CONFIGS.mainnet
```

## Related

- [Hooks Reference](/hooks/) - Complete hooks documentation
- [Guides](/guide/) - Development guides