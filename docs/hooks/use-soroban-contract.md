# useSorobanContract

Interact with Soroban smart contracts.

## Import

```tsx
import { useSorobanContract } from 'stellar-hooks'
```

## Usage

### Basic Contract Call

```tsx
import { useSorobanContract } from 'stellar-hooks'
import { nativeToScVal } from '@stellar/stellar-sdk'

function ContractComponent() {
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

### With Result Parsing

```tsx
const contract = useSorobanContract<number>({
  contractId: "CABC...XYZ",
  method: "get_value",
  args: [],
  parseResult: (scVal) => scVal.u32().toNumber(),
})
```

### Simulation-Only

```tsx
const { simulate } = useSorobanContract({
  contractId: "CABC...XYZ",
  method: "transfer",
  args: [...],
})

const handleCheck = async () => {
  const simulation = await simulate()
  if (simulation.error) {
    console.error('Simulation failed:', simulation.error)
  } else {
    console.log('Estimated cost:', simulation.estimatedCost)
  }
}
```

### With Custom RPC Server

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

## API

### Parameters

```typescript
interface ContractCallOptions<TResult = unknown> {
  contractId: StellarContractId
  method: string
  args: unknown[]
  fee?: string
  timeoutSeconds?: number
  sorobanRpcServer?: rpc.Server
  onSuccess?: (hash: string) => void
  onError?: (error: StellarTransactionError) => void
  parseResult?: (scVal: xdr.ScVal) => TResult
  optimisticResult?: TResult
}
```

### Return Value

```typescript
interface UseContractCallReturn<TResult> {
  call: () => Promise<void>
  simulate: () => Promise<SimulationResult>
  status: TransactionStatus
  result: TResult | null
  hash: string | null
  error: StellarTransactionError | null
  simulation: SimulationResult | null
  estimatedCost: SorobanSimulationEstimate | null
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  reset: () => void
}
```

## Related

- [useSorobanRead](/hooks/use-soroban-read) - Read-only contract calls
- [useLedgerEntry](/hooks/use-ledger-entry) - Direct ledger access
- [Soroban Guide](/guide/soroban) - Soroban development guide