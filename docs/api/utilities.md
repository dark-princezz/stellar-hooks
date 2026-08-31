# Utilities

Utility functions for caching, XDR handling, and more.

## Cache Functions

### getCache

Get a cached value by key:

```typescript
import { getCache } from 'stellar-hooks'

const data = getCache<YourType>('cache-key')
```

### setCache

Set a cached value with optional TTL:

```typescript
import { setCache } from 'stellar-hooks'

setCache('cache-key', data, 60000) // 1 minute TTL
```

### clearCache

Clear all cached values:

```typescript
import { clearCache } from 'stellar-hooks'

clearCache()
```

## XDR Utilities

### decodeXdr

Decode an XDR string to a Stellar SDK object:

```typescript
import { decodeXdr } from 'stellar-hooks/utils/xdr'

const decoded = decodeXdr(xdrString)
```

### formatXdrResult

Format an XDR result for display:

```typescript
import { formatXdrResult } from 'stellar-hooks/utils/xdr'

const formatted = formatXdrResult(decoded)
```

### detectXdrType

Detect the type of an XDR string:

```typescript
import { detectXdrType } from 'stellar-hooks/utils/xdr'

const type = detectXdrType(xdrString)
```

## Network Configs

Predefined network configurations:

```typescript
import { NETWORK_CONFIGS } from 'stellar-hooks'

const testnetConfig = NETWORK_CONFIGS.testnet
const mainnetConfig = NETWORK_CONFIGS.mainnet
const futurenetConfig = NETWORK_CONFIGS.futurenet
```

## Related

- [API Reference](/api/) - Complete API documentation