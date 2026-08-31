# Soroban Contract

Complete Soroban contract interaction example.

```tsx
import { StellarProvider, useFreighter, useSorobanContract } from 'stellar-hooks'
import { nativeToScVal } from '@stellar/stellar-sdk'

function ContractInteractor() {
  const { isConnected, publicKey, connect } = useFreighter()
  
  const [contractId, setContractId] = useState('CABC...XYZ')
  const [value, setValue] = useState('1')

  const contract = useSorobanContract({
    contractId,
    method: "increment",
    args: [nativeToScVal(parseInt(value), { type: "u32" })],
    fee: "100",
    timeoutSeconds: 30,
    onSuccess: (hash) => alert(`Transaction confirmed! Hash: ${hash}`),
    onError: (error) => alert(`Transaction failed: ${error.message}`),
  })

  const handleCall = async () => {
    await contract.call()
  }

  if (!isConnected) {
    return <button onClick={connect}>Connect Wallet</button>
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Contract ID"
        value={contractId}
        onChange={(e) => setContractId(e.target.value)}
      />
      <input
        type="number"
        placeholder="Value to increment"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button 
        onClick={handleCall} 
        disabled={contract.status !== "idle"}
      >
        {contract.status}
      </button>
      {contract.simulation && (
        <p>Estimated cost: {contract.estimatedCost}</p>
      )}
      {contract.error && <p>Error: {contract.error.message}</p>}
      {contract.result && <p>Result: {contract.result}</p>}
    </div>
  )
}

function App() {
  return (
    <StellarProvider network="testnet">
      <ContractInteractor />
    </StellarProvider>
  )
}

export default App
```

## Related

- [useSorobanContract](/hooks/use-soroban-contract) - Contract hook reference
- [Soroban Guide](/guide/soroban) - Soroban development guide