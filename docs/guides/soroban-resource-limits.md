# Soroban resource limits and fees

Every Soroban transaction declares the resources it will use. If a call needs more than a limit allows,
it fails; if it declares more, you pay more. Simulate first and use the numbers.

## What is limited

| Resource | Default per-transaction limit | What drives it |
| --- | --- | --- |
| CPU instructions | 100,000,000 | Loops, cryptography, (de)serialising large values |
| Memory | 41,943,040 bytes (40 MiB) | Large vectors, maps and byte strings held at once |
| Ledger entries read | 100 | Distinct contract data / code / account entries in the footprint |
| Ledger entries written | 50 | Entries modified or created |
| Read bytes | 200,000 | Total size of entries read |
| Write bytes | 132,096 | Total size of entries written |

These are network settings and can change by validator vote. `DEFAULT_RESOURCE_LIMITS` holds the values
above; pass `limits` to `useResourceEstimate` to use the live network configuration instead.

## What drives fees

The fee has two parts: the inclusion fee (what you bid to get into a ledger, charged per operation) and the
resource fee. The resource fee grows with every figure in the table: more instructions, more entries and bytes
read or written, larger transaction size and events. Writes cost far more than reads, and entries that must be
kept alive (rent) add to the cost. The simulation returns the minimum resource fee as `minResourceFee`.

## Using the estimate hook

```tsx
const { simulation } = useSorobanContract({ contractId, method: "transfer", args });
const { estimate, warnings, isNearLimit, exceedsLimit } = useResourceEstimate(simulation);
```

| Field | Meaning |
| --- | --- |
| `estimate.cpuInstructions` | Expected CPU instructions |
| `estimate.memoryBytes` | Peak memory (when the RPC reports `cost`) |
| `estimate.footprintEntries` | Read-only + read-write entries touched |
| `estimate.readBytes` / `writeBytes` | I/O sizes from the transaction data |
| `estimate.minResourceFee` | Minimum resource fee in stroops |
| `warnings` | Resources at or above `warnAt` (default 80%) of their limit, most used first |
| `isNearLimit` | Any resource is near its limit: split the work or warn the user |
| `exceedsLimit` | A limit is reached or exceeded: the call will likely fail |

## When you are near a limit

- Split one large call into several smaller ones (batch fewer items per transaction).
- Touch fewer ledger entries: avoid reading storage you do not need.
- Reduce writes: keep rarely changing data out of frequently written entries.
- Re-simulate after any change; estimates are exact for the simulated state, not a guarantee for later ledgers.

See the contract dashboard example for a panel that shows these figures per method.
