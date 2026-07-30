# Migration Guide

This document provides a comprehensive guide for developers migrating from **Wagmi** (EVM) to **`stellar-hooks`** (Stellar & Soroban), as well as tracking breaking changes between `stellar-hooks` releases.

---

## Migrating from Wagmi to `stellar-hooks`

`stellar-hooks` is designed to be **"the Wagmi of Stellar"** — providing React developers with familiar, declarative hooks for connecting wallets, querying network state, reading/writing smart contracts, and managing multi-signature workflows on the Stellar blockchain and Soroban smart contract platform.

### Conceptual Differences (EVM vs. Stellar & Soroban)

| Concept | Wagmi (EVM / Ethereum) | `stellar-hooks` (Stellar / Soroban) |
| :--- | :--- | :--- |
| **Provider / Context** | `<WagmiProvider config={config}>` | `<StellarProvider network="mainnet" \| "testnet">` |
| **Account Identity** | 20-byte Hex Address (`0x...`) | 56-character Strkey (`G...` for accounts, `C...` for Soroban contracts) |
| **Wallet Connector** | `useConnect()` (Injected, WalletConnect, MetaMask) | `useFreighter()`, `useAlbedo()`, `useWalletsKit()` |
| **Native Currency** | ETH | XLM (Stellar Lumens) |
| **Gas vs. Fees** | Dynamic Gas Limit & Gas Price / Base Fee | Fixed Base Fee (stroops) + Soroban Footprint/Resource Fees |
| **Nonce vs. Sequence** | Account Nonce | Account Sequence Number (auto-incremented) |
| **Smart Contract Standard** | Solidity / EVM Bytecode + ABI JSON | Rust / Soroban WASM + XDR ScVal representations |
| **Multi-sig** | Smart Contract Wallet (e.g., Safe) | Native Account Signers & Weights (`useMultiSig`) |

---

### Hook Mapping Reference Table

| Wagmi Hook | `stellar-hooks` Equivalent | Description |
| :--- | :--- | :--- |
| `useAccount` | `useStellarAccount` / `useFreighter` | View connected address, connection status, and sequence number |
| `useConnect` / `useDisconnect` | `useFreighter` (`connect`, `disconnect`) | Connect or disconnect user wallet |
| `useBalance` | `useStellarBalance` | Query native XLM and trustline asset balances |
| `useReadContract` | `useSorobanContract` | Simulate/read state from a Soroban smart contract |
| `useWriteContract` | `useSorobanContract` (`call`) | Submit invocations to a Soroban contract |
| `useSendTransaction` | `usePayment` / `useTransaction` | Send native payments or arbitrary Stellar transactions |
| `useWatchContractEvent` | `useContractEvents` | Subscribe to contract event logs |
| `useBlockNumber` | `useLedgerEntry` / `useHorizonServer` | Inspect Stellar ledgers and network state |
| `useFeeData` | `useFeeStats` | Fetch current network base fees and recommendations |
| `useEnsName` / `useEnsAddress` | `useStellarToml` / Federated Addresses | Resolve domain metadata and Stellar federated accounts |

---

### Code Migration Examples

#### 1. Provider Setup

**Wagmi:**
```tsx
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";

const config = createConfig({
  chains: [mainnet],
  transports: { [mainnet.id]: http() },
});

export function App() {
  return (
    <WagmiProvider config={config}>
      <YourApp />
    </WagmiProvider>
  );
}
```

**`stellar-hooks`:**
```tsx
import { StellarProvider } from "stellar-hooks";

export function App() {
  return (
    <StellarProvider network="mainnet">
      <YourApp />
    </StellarProvider>
  );
}
```

---

#### 2. Wallet Connection

**Wagmi:**
```tsx
import { useAccount, useConnect, useDisconnect } from "wagmi";

function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) return <button onClick={() => disconnect()}>{address}</button>;
  return <button onClick={() => connect({ connector: connectors[0] })}>Connect</button>;
}
```

**`stellar-hooks`:**
```tsx
import { useFreighter } from "stellar-hooks";

function WalletButton() {
  const { publicKey, isConnected, connect, disconnect, isLoading } = useFreighter();

  if (isConnected && publicKey) {
    return <button onClick={disconnect}>{publicKey.slice(0, 6)}...{publicKey.slice(-4)}</button>;
  }
  return <button onClick={connect} disabled={isLoading}>Connect Freighter</button>;
}
```

---

#### 3. Fetching Account Balances

**Wagmi:**
```tsx
import { useBalance } from "wagmi";

function Balance({ address }: { address: `0x${string}` }) {
  const { data, isLoading } = useBalance({ address });
  if (isLoading) return <div>Loading...</div>;
  return <div>Balance: {data?.formatted} {data?.symbol}</div>;
}
```

**`stellar-hooks`:**
```tsx
import { useStellarBalance } from "stellar-hooks";

function Balance({ publicKey }: { publicKey: string }) {
  const { xlmBalance, balances, isLoading } = useStellarBalance(publicKey);

  if (isLoading) return <div>Loading...</div>;
  return <div>XLM Balance: {xlmBalance?.balance ?? "0"} XLM</div>;
}
```

---

#### 4. Reading a Smart Contract

**Wagmi:**
```tsx
import { useReadContract } from "wagmi";
import { myAbi } from "./abi";

function ReadCounter() {
  const { data, isLoading } = useReadContract({
    address: "0x123...",
    abi: myAbi,
    functionName: "getCounter",
  });

  return <div>Count: {String(data)}</div>;
}
```

**`stellar-hooks`:**
```tsx
import { useSorobanContract } from "stellar-hooks";

function ReadCounter() {
  const { result, isLoading } = useSorobanContract({
    contractId: "CA123...",
    method: "get_counter",
    args: [],
  });

  return <div>Count: {result ? String(result) : "0"}</div>;
}
```

---

#### 5. Invoking a Smart Contract (Write Operation)

**Wagmi:**
```tsx
import { useWriteContract } from "wagmi";
import { myAbi } from "./abi";

function IncrementButton() {
  const { writeContract, isPending } = useWriteContract();

  const handleIncrement = () => {
    writeContract({
      address: "0x123...",
      abi: myAbi,
      functionName: "increment",
      args: [1n],
    });
  };

  return <button onClick={handleIncrement} disabled={isPending}>Increment</button>;
}
```

**`stellar-hooks`:**
```tsx
import { useSorobanContract } from "stellar-hooks";
import { nativeToScVal } from "@stellar/stellar-sdk";

function IncrementButton() {
  const { call, status, isLoading } = useSorobanContract({
    contractId: "CA123...",
    method: "increment",
    args: [nativeToScVal(1, { type: "u32" })],
  });

  return (
    <button onClick={() => call()} disabled={isLoading}>
      {isLoading ? "Submitting..." : "Increment"}
    </button>
  );
}
```

---

#### 6. Sending Native Token Payments

**Wagmi:**
```tsx
import { useSendTransaction } from "wagmi";
import { parseEther } from "viem";

function SendPayment() {
  const { sendTransaction } = useSendTransaction();

  return (
    <button onClick={() => sendTransaction({ to: "0x456...", value: parseEther("1.0") })}>
      Send ETH
    </button>
  );
}
```

**`stellar-hooks`:**
```tsx
import { usePayment } from "stellar-hooks";

function SendPayment() {
  const { submit, status } = usePayment({
    destination: "G456...",
    amount: "10.0",
  });

  return (
    <button onClick={() => submit()} disabled={status !== "idle"}>
      Send XLM
    </button>
  );
}
```

---

## Release Migration Log

### v0.1.0 (Initial Release)

This is the first public release of `stellar-hooks`. There are no prior versions to migrate from.

#### Highlights

- `<StellarProvider>` with `mainnet`, `testnet`, `futurenet`, and `custom` network configs
- Core hooks: `useFreighter`, `useStellarAccount`, `useStellarBalance`, `useSorobanContract`, `useTransaction`, `useLedgerEntry`
- Payment hooks: `usePayment`, `usePathPayment`
- Transaction helpers: `useAccountFlags`, `useAccountMerge`, `useBumpSequence`, `useInflation`, `useManageData`, `useTrustline`, `useCreateAccount`
- DEX hooks: `useTrade`, `useStellarOffers`, `useOfferBook`
- Discovery hooks: `useStellarToml`, `useAssetMetadata`, `useContractEvents`, `useEffects`, `useOperations`, `useAssets`
- Wallet adapters: `useWalletsKit`, `useWalletConnect`, `useAlbedo`
- Multi-sig workflow: `useMultiSig`
- Branded types: `StellarPublicKey`, `StellarContractId`, `StellarXdrString`, `StellarTxHash`, `StellarAssetIssuer`
- Zod schemas for runtime validation of Horizon and Soroban RPC responses

---

### v0.2.0

#### Breaking changes

##### `useAccountMerge` — migrated to options + `submit()` convention

The hook no longer exposes a `merge(destination, opts)` function. Instead, it follows the same `options` + `submit()` pattern used by every other write hook in the library.

**Before:**
```ts
const { merge, status, hash, error } = useAccountMerge();
await merge("GDEST...", { confirm: true });
```

**After:**
```ts
const { submit, status, hash, error } = useAccountMerge({
  destination: "GDEST...",
  memo: "closing out", // optional
  fee: 100,            // optional, default 100
  timeoutSeconds: 60,  // optional, default 60
});

await submit();
```

**Why:** The old `merge(destination, { confirm: true })` API was inconsistent with every other write hook in the library. The new API aligns with `usePayment`, `useTrade`, `useTrustline`, etc., all of which accept options in the hook call and expose a no-arg `submit()`.

#### Deprecations

- `merge` and `confirm` (removed in v0.2.0 — use `submit` and the `destination` option instead).

#### New features

- `useAccountMerge` now supports memo text, configurable fee, timeout, and `onSuccess` / `onError` callbacks.
