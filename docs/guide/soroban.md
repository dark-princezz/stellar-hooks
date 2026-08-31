# Soroban Contracts

Interact with Soroban smart contracts using stellar-hooks.

## Overview

Soroban is Stellar's smart contract platform. stellar-hooks provides a complete interface for:

- Contract invocation (read and write operations)
- Transaction simulation
- Resource estimation
- Authorization handling
- Confirmation polling

## Read-Only Contract Calls

Use `useSorobanRead` for read-only operations:

```tsx
import { useSorobanRead } from 'stellar-hooks'

function ContractReader() {
  const { data, isLoading, error } = useSorobanRead(
    "CABC...XYZ",
    "get_value",
    [],
    { parseResult: (scVal) => scVal.u32().toNumber() }
  )

  if (isLoading) return <Spinner />
  if (error) return <ErrorComponent error={error} />

  return <div>Contract value: {data}</div>
}
```

## Write Contract Operations

Use `useSorobanContract` for full contract interactions:

```tsx
import { useSorobanContract } from 'stellar-hooks'
import { nativeToScVal } from '@stellar/stellar-sdk'

function ContractInteractor() {
  const { call, status, result, error } = useSorobanContract({
    contractId: "CABC...XYZ",
    method: "increment",
    args: [nativeToScVal(1, { type: "u32" })],
    fee: "100",
    timeoutSeconds: 30,
  })

  return (
    <div>
      <button onClick={() => call()} disabled={status !== "idle"}>
        {status}
      </button>
      {error && <p>Error: {error.message}</p>}
      {result && <p>Result: {result}</p>}
    </div>
  )
}
```

## Contract Lifecycle

The contract interaction lifecycle:

1. **Building** - Construct the transaction
2. **Simulation** - Simulate on RPC (resource estimation)
3. **Signing** - Sign with connected wallet
4. **Submission** - Submit to network
5. **Polling** - Wait for confirmation

## Resource Estimation

Simulation provides resource estimates:

```tsx
const { estimatedCost, simulation } = useSorobanContract({...})

if (simulation) {
  console.log('Estimated CPU:', simulation.results[0].cpuInstructions)
  console.log('Estimated Memory:', simulation.results[0].memoryBytes)
}
```

## Authorization

Soroban contracts often require authorization. stellar-hooks handles this automatically:

```tsx
const { call } = useSorobanContract({
  contractId,
  method: "protected_method",
  args: [...],
})

// Authorization is handled automatically when the wallet is connected
await call()
```

## Advanced Configuration

### Custom RPC Server

```tsx
import { rpc } from '@stellar/stellar-sdk/rpc'

const customRpc = new rpc.Server('https://custom-rpc.example.com')

const { call } = useSorobanContract({
  contractId,
  method: "my_method",
  args: [...],
  sorobanRpcServer: customRpc,
})
```

### Result Parsing

Parse contract results to TypeScript types:

```tsx
const contract = useSorobanContract<number>({
  contractId,
  method: "get_count",
  parseResult: (scVal) => scVal.u32().toNumber(),
})
```

### Optimistic Results

Show optimistic UI updates:

```tsx
const { call } = useSorobanContract({
  contractId,
  method: "increment",
  args: [...],
  optimisticResult: currentValue + 1,
})
```

## Contract Events

Stream contract events:

```tsx
import { useContractEvents } from 'stellar-hooks'

const { events, isLoading, error } = useContractEvents({
  contractId: "CABC...XYZ",
  fromLedger: 12345,
  toLedger: 12350,
})
```

## Ledger Entry Access

Access contract storage directly:

```tsx
import { useLedgerEntry } from 'stellar-hooks'
import { xdr } from '@stellar/stellar-sdk'

const key = xdr.LedgerKey.contractData(
  new xdr.LedgerKeyContractData({
    contract: new Address(CONTRACT_ID).toScAddress(),
    key: xdr.ScVal.scvSymbol("Counter"),
    durability: xdr.ContractDataDurability.persistent(),
  })
)

const { data, isLoading } = useLedgerEntry(key)
```

## Best Practices

### 1. Always Simulate First

```tsx
const { simulate, call } = useSorobanContract({...})

const handleCall = async () => {
  const simulation = await simulate()
  if (simulation.error) {
    console.error('Simulation failed:', simulation.error)
    return
  }
  await call()
}
```

### 2. Handle Network Mismatch

```tsx
const { networkPassphraseMismatch } = useFreighter()

if (networkPassphraseMismatch) {
  return <div>Please switch your wallet to the correct network</div>
}
```

### 3. Use Appropriate Timeouts

```tsx
const { call } = useSorobanContract({
  contractId,
  method: "heavy_operation",
  args: [...],
  timeoutSeconds: 120, // Longer timeout for complex operations
})
```

## Next Steps

- [Transaction Building](/guide/transactions) - Build custom transactions
- [useSorobanContract](/hooks/use-soroban-contract) - Complete API reference