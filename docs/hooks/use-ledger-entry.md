# useLedgerEntry

Read raw Soroban ledger entries by XDR key.

## Import

```tsx
import { useLedgerEntry } from 'stellar-hooks'
```

## Usage

```tsx
import { xdr } from '@stellar/stellar-sdk'

const key = xdr.LedgerKey.contractData(
  new xdr.LedgerKeyContractData({
    contract: new Address(CONTRACT_ID).toScAddress(),
    key: xdr.ScVal.scvSymbol("Counter"),
    durability: xdr.ContractDataDurability.persistent(),
  })
)

const { data, isLoading } = useLedgerEntry(key, {
  refetchInterval: 5000,
})
```

## Related

- [useSorobanContract](/hooks/use-soroban-contract) - Contract interaction