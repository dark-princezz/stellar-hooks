# Types

Type definitions used throughout stellar-hooks.

## Branded Types

### StellarPublicKey

Branded type for Stellar public keys:

```typescript
import { asPublicKey, type StellarPublicKey } from 'stellar-hooks'

const publicKey: StellarPublicKey = asPublicKey("GAAZI4...")
```

### StellarContractId

Branded type for Soroban contract IDs:

```typescript
import { asContractId, type StellarContractId } from 'stellar-hooks'

const contractId: StellarContractId = asContractId("CABC...")
```

### StellarXdrString

Branded type for XDR strings:

```typescript
import { unsafeAsXdrString, type StellarXdrString } from 'stellar-hooks'

const xdr: StellarXdrString = unsafeAsXdrString("AAAA...")
```

## Network Types

### StellarNetwork

```typescript
type StellarNetwork = 'testnet' | 'mainnet' | 'futurenet' | 'custom'
```

### NetworkConfig

```typescript
interface NetworkConfig {
  network: StellarNetwork
  horizonUrl: string
  sorobanRpcUrl: string
  networkPassphrase: string
}
```

## Transaction Types

### TransactionStatus

```typescript
type TransactionStatus = 
  | 'idle'
  | 'building'
  | 'signing'
  | 'submitting'
  | 'polling'
  | 'success'
  | 'error'
```

### StellarTransactionError

```typescript
interface StellarTransactionError {
  type: 'network' | 'simulation' | 'submission' | 'timeout' | 'on_chain'
  message: string
  details?: unknown
}
```

## Asset Types

### PaymentAsset

```typescript
type PaymentAsset =
  | { type: 'native' }
  | { type: 'credit'; code: string; issuer: StellarPublicKey }
```

## Related

- [API Reference](/api/) - Complete API documentation