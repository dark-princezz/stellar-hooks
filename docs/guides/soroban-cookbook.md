# Soroban Contract Integration Cookbook

> **Last verified:** stellar-hooks v0.2.0 (2026-11-23)

A collection of real-world patterns for integrating Soroban smart contracts using `stellar-hooks`.

## Table of Contents

1. [Calling a simple counter contract](#1-calling-a-simple-counter-contract)
2. [Reading contract storage with useLedgerEntry](#2-reading-contract-storage-with-useledgerentry)
3. [Querying a SAC token balance](#3-querying-a-sac-token-balance)
4. [Listening to contract events](#4-listening-to-contract-events)
5. [Building a token transfer UI](#5-building-a-token-transfer-ui)
6. [Passing complex arguments to a contract](#6-passing-complex-arguments-to-a-contract)
7. [Multi-step contract workflows](#7-multi-step-contract-workflows)

---

## 1. Calling a simple counter contract

The canonical Soroban example is a counter contract with an `increment` method. Here is the full lifecycle — simulate, sign, submit, poll — handled by a single `useSorobanContract` call.

```tsx
import { useSorobanContract } from 'stellar-hooks'
import { nativeToScVal } from '@stellar/stellar-sdk'

const COUNTER_CONTRACT = 'CABC...XYZ'

export function CounterButton() {
  const { call, status, result, error, reset } = useSorobanContract({
    contractId: COUNTER_CONTRACT,
    method: 'increment',
    args: [nativeToScVal(1, { type: 'u32' })],
  })

  if (error) {
    return (
      <div>
        <p>Error: {error.message}</p>
        <button onClick={reset}>Reset</button>
      </div>
    )
  }

  return (
    <div>
      <button onClick={() => call()} disabled={status !== 'idle'}>
        {status === 'idle' ? 'Increment' : status}
      </button>
      {result && <p>New count: {scValToNative(result)}</p>}
    </div>
  )
}
```

Status transitions: `idle → building → signing → submitting → polling → success`.

---

## 2. Reading contract storage with useLedgerEntry

Use `useLedgerEntry` to read a persistent storage slot directly without building a full contract call. This is read-only and does not require a wallet.

```tsx
import { useLedgerEntry } from 'stellar-hooks'
import { xdr, Address, scValToNative } from '@stellar/stellar-sdk'

const CONTRACT_ID = 'CABC...XYZ'

// Build the ledger key for a persistent entry named "Counter"
const counterKey = xdr.LedgerKey.contractData(
  new xdr.LedgerKeyContractData({
    contract: new Address(CONTRACT_ID).toScAddress(),
    key: xdr.ScVal.scvSymbol('Counter'),
    durability: xdr.ContractDataDurability.persistent(),
  })
)

export function CounterDisplay() {
  const { data, isLoading, error, refetch } = useLedgerEntry(counterKey, {
    refetchInterval: 3000, // poll every 3 s
  })

  if (isLoading) return <p>Loading…</p>
  if (error) return <p>Error: {error.message}</p>

  const value = data?.val ? scValToNative(data.val.contractData().val()) : null

  return (
    <div>
      <p>Counter: {value ?? '—'}</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  )
}
```

---

## 3. Querying a SAC token balance

Stellar Asset Contracts (SACs) wrap classic Stellar assets as Soroban tokens. Use `useSorobanTokenBalance` to read a wallet's SAC balance without building a manual contract call.

```tsx
import { useSorobanTokenBalance, useFreighter } from 'stellar-hooks'

// USDC SAC on testnet
const USDC_CONTRACT = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA'

export function UsdcBalance() {
  const { publicKey } = useFreighter()

  const { balance, formatted, isLoading, error } = useSorobanTokenBalance(
    USDC_CONTRACT,
    publicKey ?? undefined,
    { refetchInterval: 10_000 }
  )

  if (!publicKey) return <p>Connect your wallet to see your balance.</p>
  if (isLoading) return <p>Loading…</p>
  if (error) return <p>Error: {error.message}</p>

  return <p>USDC balance: {formatted ?? '0'}</p>
}
```

---

## 4. Listening to contract events

Subscribe to a stream of Soroban contract events with `useContractEvents`. Useful for real-time UIs that react to on-chain state changes.

```tsx
import { useContractEvents } from 'stellar-hooks'

const CONTRACT_ID = 'CABC...XYZ'

export function EventFeed() {
  const { events, isLoading, error } = useContractEvents({
    contractId: CONTRACT_ID,
    // Filter to only "transfer" events
    topics: [['transfer']],
    limit: 20,
  })

  if (isLoading) return <p>Connecting…</p>
  if (error) return <p>Error: {error.message}</p>

  return (
    <ul>
      {events.map((event) => (
        <li key={event.id}>
          <code>{event.topic.join(' / ')}</code> — ledger {event.ledger}
        </li>
      ))}
    </ul>
  )
}
```

---

## 5. Building a token transfer UI

Call the SAC `transfer` method by combining `useFreighter` (to get the sender's address) with `useSorobanContract`.

```tsx
import { useState } from 'react'
import { useSorobanContract, useFreighter } from 'stellar-hooks'
import { nativeToScVal, Address } from '@stellar/stellar-sdk'

const TOKEN_CONTRACT = 'CABC...XYZ'

export function TransferForm() {
  const { publicKey } = useFreighter()
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')

  const { call, status, hash, error, reset } = useSorobanContract({
    contractId: TOKEN_CONTRACT,
    method: 'transfer',
    // Args: from, to, amount (i128 as BigInt)
    args: publicKey
      ? [
          nativeToScVal(new Address(publicKey), { type: 'address' }),
          nativeToScVal(new Address(recipient), { type: 'address' }),
          nativeToScVal(BigInt(Math.round(Number(amount) * 1e7)), { type: 'i128' }),
        ]
      : [],
  })

  if (!publicKey) return <p>Connect Freighter to send tokens.</p>

  return (
    <div>
      <input
        placeholder="Recipient G..."
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
      />
      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button
        onClick={() => call()}
        disabled={status !== 'idle' || !recipient || !amount}
      >
        {status === 'idle' ? 'Send' : status}
      </button>

      {status === 'success' && (
        <p>
          Sent! Tx hash:{' '}
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
          >
            {hash?.slice(0, 12)}…
          </a>
        </p>
      )}
      {error && (
        <p>
          {error.message} <button onClick={reset}>Dismiss</button>
        </p>
      )}
    </div>
  )
}
```

---

## 6. Passing complex arguments to a contract

Soroban contracts often take structs and enums as arguments. Use `xdr.ScVal` directly for full control, or `nativeToScVal` with type hints for common types.

```tsx
import { nativeToScVal, xdr } from '@stellar/stellar-sdk'

// u32 / i32 / u64 / i64 / u128 / i128
nativeToScVal(42, { type: 'u32' })
nativeToScVal(BigInt('1000000000'), { type: 'i128' })

// bool
nativeToScVal(true, { type: 'bool' })

// symbol / bytes / string
xdr.ScVal.scvSymbol('STATUS')
xdr.ScVal.scvString('hello')
xdr.ScVal.scvBytes(Buffer.from('deadbeef', 'hex'))

// address (account or contract)
import { Address } from '@stellar/stellar-sdk'
nativeToScVal(new Address('G...publicKey'), { type: 'address' })

// vec (list)
xdr.ScVal.scvVec([
  nativeToScVal(1, { type: 'u32' }),
  nativeToScVal(2, { type: 'u32' }),
])

// map (struct-like)
xdr.ScVal.scvMap([
  new xdr.ScMapEntry({
    key: xdr.ScVal.scvSymbol('amount'),
    val: nativeToScVal(BigInt(5_000_000), { type: 'i128' }),
  }),
  new xdr.ScMapEntry({
    key: xdr.ScVal.scvSymbol('recipient'),
    val: nativeToScVal(new Address('G...'), { type: 'address' }),
  }),
])
```

Pass the assembled args array to `useSorobanContract`:

```tsx
const { call, status } = useSorobanContract({
  contractId: 'CABC...XYZ',
  method: 'create_offer',
  args: [
    xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('sell_amount'),
        val: nativeToScVal(BigInt(10_000_000), { type: 'i128' }),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('buy_token'),
        val: nativeToScVal(new Address(BUY_TOKEN_CONTRACT), { type: 'address' }),
      }),
    ]),
  ],
})
```

---

## 7. Multi-step contract workflows

Some dApps need to sequence multiple contract calls — for example, `approve` then `swap`. Chain calls by watching the `status` of the first call before triggering the second.

```tsx
import { useState, useEffect } from 'react'
import { useSorobanContract, useFreighter } from 'stellar-hooks'
import { nativeToScVal, Address } from '@stellar/stellar-sdk'

const ROUTER_CONTRACT = 'CABC...ROUTER'
const TOKEN_A_CONTRACT = 'CABC...TOKENA'

export function SwapWithApproval() {
  const { publicKey } = useFreighter()
  const [step, setStep] = useState<'idle' | 'approving' | 'swapping' | 'done'>('idle')

  const approve = useSorobanContract({
    contractId: TOKEN_A_CONTRACT,
    method: 'approve',
    args: publicKey
      ? [
          nativeToScVal(new Address(publicKey), { type: 'address' }),
          nativeToScVal(new Address(ROUTER_CONTRACT), { type: 'address' }),
          nativeToScVal(BigInt(500_000_000), { type: 'i128' }),
          nativeToScVal(100, { type: 'u32' }), // expiration ledger offset
        ]
      : [],
  })

  const swap = useSorobanContract({
    contractId: ROUTER_CONTRACT,
    method: 'swap',
    args: publicKey
      ? [
          nativeToScVal(new Address(publicKey), { type: 'address' }),
          nativeToScVal(BigInt(100_000_000), { type: 'i128' }),
          nativeToScVal(BigInt(90_000_000), { type: 'i128' }), // min out
        ]
      : [],
  })

  // Kick off swap once approval succeeds
  useEffect(() => {
    if (approve.status === 'success' && step === 'approving') {
      setStep('swapping')
      swap.call()
    }
  }, [approve.status, step])

  useEffect(() => {
    if (swap.status === 'success') setStep('done')
  }, [swap.status])

  const handleStart = () => {
    setStep('approving')
    approve.call()
  }

  const handleReset = () => {
    setStep('idle')
    approve.reset()
    swap.reset()
  }

  if (!publicKey) return <p>Connect Freighter first.</p>

  if (step === 'done') {
    return (
      <div>
        <p>Swap complete! Tx: {swap.hash}</p>
        <button onClick={handleReset}>Start over</button>
      </div>
    )
  }

  const busy = step !== 'idle'

  return (
    <div>
      <p>
        Step 1 — Approve: <strong>{step === 'approving' ? approve.status : step === 'idle' ? '—' : 'success'}</strong>
      </p>
      <p>
        Step 2 — Swap: <strong>{step === 'swapping' ? swap.status : step === 'done' ? 'success' : '—'}</strong>
      </p>
      <button onClick={handleStart} disabled={busy}>
        {busy ? 'Working…' : 'Approve & Swap'}
      </button>
      {(approve.error || swap.error) && (
        <p>
          Error: {(approve.error ?? swap.error)?.message}{' '}
          <button onClick={handleReset}>Retry</button>
        </p>
      )}
    </div>
  )
}
```

---

## Tips

- **Decode results** — `useSorobanContract` returns the raw `xdr.ScVal`. Use `scValToNative` from `@stellar/stellar-sdk` to convert it to a JS value.
- **Custom RPC server** — Pass a pre-configured `rpc.Server` instance via the `sorobanRpcServer` option if you need a custom transport or want to reuse a single connection.
- **Error handling** — The `error` field is set on simulation failures (e.g., insufficient balance, auth required) as well as network errors. Always display it and provide a `reset` affordance.
- **Fee estimation** — Omit the `fee` option to use `BASE_FEE`. For time-sensitive transactions on mainnet, set a higher fee (e.g. `"10000"` stroops).
- **Network** — All hooks read the active network from `<StellarProvider>`. Switch to testnet during development by wrapping your app with `<StellarProvider network="testnet">`.
