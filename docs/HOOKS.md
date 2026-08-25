# Stellar Hooks - Complete API Reference

Complete reference for all hooks in the stellar-hooks library, including parameters, return shapes, and error cases.

## Table of Contents

- [Wallet Hooks](#wallet-hooks)
- [Account Hooks](#account-hooks)
- [Transaction Hooks](#transaction-hooks)
- [Soroban Hooks](#soroban-hooks)
- [Data Fetching Hooks](#data-fetching-hooks)
- [Utility Hooks](#utility-hooks)

---

## Wallet Hooks

### useFreighter

Connect to and interact with the Freighter browser wallet.

**Parameters:**
```typescript
interface UseFreighterOptions {
  expectedNetworkPassphrase?: string;
  autoConnect?: boolean;
}
```

**Return Shape:**
```typescript
interface UseFreighterReturn extends FreighterState {
  isSigningMessage: boolean;
  isAutoConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (xdr: StellarXdrString, opts?: SignTransactionOptions) => Promise<StellarXdrString>;
  signAuthEntry: (entryPreimageXdr: StellarXdrString) => Promise<StellarXdrString>;
  signBlob: (blob: string, opts?: { accountToSign?: string }) => Promise<string>;
  signMessage: (message: string, opts?: { accountToSign?: string }) => Promise<string>;
}

interface FreighterState {
  isInstalled: boolean;
  isConnected: boolean;
  publicKey: StellarPublicKey | null;
  network: string | null;
  networkPassphrase: string | null;
  networkPassphraseMismatch: boolean;
  networkPassphraseWarning: string | null;
  isLoading: boolean;
  error: Error | null;
}
```

**Error Cases:**
- `UserRejectedError`: User rejected connection or signing request
- `Error`: Freighter not installed, network mismatch, or API error

**Example:**
```tsx
const { isConnected, publicKey, connect, signTransaction } = useFreighter();
```

---

### useWalletConnect

WalletConnect v2 adapter for mobile wallet support (Freighter Mobile, LOBSTR, xBull Mobile, etc.).

**Parameters:**
```typescript
interface WalletConnectOptions {
  projectId: string;
  metadata: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
  chain?: WalletConnectChain;
  relayUrl?: string;
}
```

**Return Shape:**
```typescript
interface UseWalletConnectReturn extends WalletConnectState {
  connect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  signTransaction: (xdr: string, opts?: { networkPassphrase?: string }) => Promise<string>;
}

interface WalletConnectState {
  publicKey: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  uri: string | null;
  error: Error | null;
}
```

**Error Cases:**
- `Error`: WalletConnect client not initialized, session not active, or wallet rejected

**Example:**
```tsx
const { connect, uri, isConnected, publicKey } = useWalletConnect({
  projectId: "YOUR_PROJECT_ID",
  metadata: { name: "My dApp", description: "...", url: "https://...", icons: [] },
});
```

---

### useWalletsKit

Stellar Wallets Kit integration for multi-wallet support.

**Parameters:**
```typescript
interface WalletsKitOptions {
  modules: unknown[];
  selectedWalletId?: string;
  network?: string;
}
```

**Return Shape:**
```typescript
interface UseWalletsKitReturn extends WalletsKitState {
  connect: () => Promise<string | null>;
  disconnect: () => void;
  signTransaction: (xdr: string, opts?: { networkPassphrase?: string; address?: string }) => Promise<string>;
  signAuthEntry: (authEntry: string, opts?: { networkPassphrase?: string; address?: string }) => Promise<string>;
  signMessage: (message: string, opts?: { networkPassphrase?: string; address?: string }) => Promise<string>;
}

interface WalletsKitState {
  publicKey: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
}
```

**Error Cases:**
- `Error`: Wallets Kit not initialized, wallet not available, or user rejected

---

## Account Hooks

### useStellarAccount

Fetch Stellar account data including balances, thresholds, and flags.

**Parameters:**
```typescript
function useStellarAccount(
  publicKey: StellarPublicKey | string | null,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
)
```

**Return Shape:**
```typescript
interface StellarAccountData {
  accountId: StellarPublicKey;
  balances: StellarBalance[];
  sequence: string;
  subentryCount: number;
  numSponsored: number;
  numSponsoring: number;
  thresholds: {
    lowThreshold: number;
    medThreshold: number;
    highThreshold: number;
  };
  flags: {
    authRequired: boolean;
    authRevocable: boolean;
    authImmutable: boolean;
    authClawbackEnabled: boolean;
  };
  raw: Horizon.AccountResponse;
}

interface UseStellarAccountReturn {
  account: StellarAccountData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

**Error Cases:**
- `Error`: Invalid public key, network error, or account not found

**Example:**
```tsx
const { account, isLoading } = useStellarAccount(publicKey);
```

---

### useStellarBalance

Fetch the native XLM balance for an account.

**Parameters:**
```typescript
function useStellarBalance(
  publicKey: StellarPublicKey | string | null,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
)
```

**Return Shape:**
```typescript
interface StellarBalance {
  assetType: string;
  assetCode?: string;
  assetIssuer?: StellarAssetIssuer;
  balance: string;
  balanceFloat: number;
  buyingLiabilities: string;
  sellingLiabilities: string;
  limit?: string;
  isNative: boolean;
}

interface UseStellarBalanceReturn {
  xlmBalance: StellarBalance | null;
  isLoading: boolean;
  error: Error | null;
}
```

**Error Cases:**
- `Error`: Invalid public key, network error, or account not found

**Example:**
```tsx
const { xlmBalance } = useStellarBalance(publicKey);
```

---

### useStellarOffers

Fetch offers for an account from Horizon.

**Parameters:**
```typescript
function useStellarOffers(
  publicKey: StellarPublicKey | string | null,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
    limit?: number;
  }
)
```

**Return Shape:**
```typescript
interface UseStellarOffersReturn {
  offers: Horizon.ServerApi.OfferRecord[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
}
```

**Error Cases:**
- `Error`: Invalid public key, network error, or Horizon API error

---

## Transaction Hooks

### usePayment

Send a payment transaction.

**Parameters:**
```typescript
function usePayment()
```

**Methods:**
```typescript
interface UsePaymentReturn extends TransactionState {
  call: (options: PaymentOptions) => Promise<void>;
}

interface PaymentOptions {
  destination: string;
  amount: string;
  asset: "native" | { code: string; issuer: string };
  memo?: string;
}
```

**Return Shape:**
```typescript
interface TransactionState<TResult = unknown> {
  status: TransactionStatus;
  hash: StellarTxHash | null;
  result: TResult | null;
  error: StellarTransactionError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

type TransactionStatus = "idle" | "building" | "signing" | "submitting" | "polling" | "success" | "error";

type StellarTransactionError =
  | { type: 'network'; message: string }
  | { type: 'transaction'; resultCode: string; message: string }
  | { type: 'timeout'; message: string };
```

**Error Cases:**
- `UserRejectedError`: User rejected transaction signing
- `Error`: Insufficient balance, invalid destination, network error, or transaction failure

**Example:**
```tsx
const payment = usePayment();
await payment.call({ destination: "G...", amount: "10", asset: "native" });
```

---

### usePathPayment

Send a path payment with automatic routing.

**Parameters:**
```typescript
function usePathPayment()
```

**Methods:**
```typescript
interface UsePathPaymentReturn extends TransactionState {
  call: (options: PathPaymentOptions) => Promise<void>;
}

interface PathPaymentOptions {
  destination: string;
  sendAsset: PaymentAsset;
  destAsset: PaymentAsset;
  sendAmount: string;
  destMin: string;
  memo?: string;
}
```

**Return Shape:** Same as `TransactionState`

**Error Cases:**
- `UserRejectedError`: User rejected transaction signing
- `Error`: No path found, insufficient liquidity, network error, or transaction failure

---

### useTransaction

Execute a custom Stellar transaction.

**Parameters:**
```typescript
function useTransaction()
```

**Methods:**
```typescript
interface UseTransactionReturn extends TransactionState {
  call: (options: TransactionOptions) => Promise<void>;
}

interface TransactionOptions {
  xdr: StellarXdrString;
  signTransaction: (xdr: StellarXdrString) => Promise<StellarXdrString>;
}
```

**Return Shape:** Same as `TransactionState`

**Error Cases:**
- `UserRejectedError`: User rejected transaction signing
- `Error`: Invalid XDR, network error, or transaction failure

---

## Soroban Hooks

### useSorobanContract

Interact with Soroban smart contracts.

**Parameters:**
```typescript
function useSorobanContract<TResult = unknown>(options: ContractCallOptions<TResult>)
```

**Parameters:**
```typescript
interface ContractCallOptions<TResult = unknown> {
  contractId: StellarContractId;
  method: string;
  args?: xdr.ScVal[];
  fee?: number;
  timeoutSeconds?: number;
  sorobanRpcServer?: rpc.Server;
  onSuccess?: (result: TResult) => void;
  onError?: (error: StellarTransactionError) => void;
  parseResult?: (scVal: xdr.ScVal) => TResult;
}
```

**Return Shape:**
```typescript
interface UseContractCallReturn<TResult = unknown> extends TransactionState<TResult> {
  call: (overrides?: Partial<Omit<ContractCallOptions<TResult>, "contractId">>) => Promise<TResult | null>;
  query: (overrides?: Partial<Omit<ContractCallOptions<TResult>, "contractId">>) => Promise<TResult | null>;
  dryRun: (overrides?: Partial<Omit<ContractCallOptions<TResult>, "contractId">>) => Promise<TResult | null>;
  simulate: (overrides?: Partial<Omit<ContractCallOptions<TResult>, "contractId">>) => Promise<rpc.Api.SimulateTransactionResponse>;
  reset: () => void;
}
```

**Error Cases:**
- `UserRejectedError`: User rejected transaction signing
- `Error`: Contract not found, method not found, invalid arguments, network error, or transaction failure

**Example:**
```tsx
const contract = useSorobanContract({
  contractId: "C...",
  method: "increment",
  args: [xdr.ScVal.scvU32(1)],
});
await contract.call();
```

---

### useLedgerEntry

Fetch ledger entries from Soroban RPC.

**Parameters:**
```typescript
function useLedgerEntry(
  key: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
)
```

**Return Shape:**
```typescript
interface LedgerEntryState {
  data: rpc.Api.LedgerEntryResult | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  lastFetchedAt: Date | null;
}
```

**Error Cases:**
- `Error`: Invalid key, network error, or entry not found

---

### useSorobanTokenBalance

Fetch SAC (Stellar Asset Contract) token balance.

**Parameters:**
```typescript
function useSorobanTokenBalance(
  contractId: StellarContractId,
  publicKey: StellarPublicKey | string | null,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
)
```

**Return Shape:**
```typescript
interface SorobanTokenBalanceState {
  balance: bigint | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

**Error Cases:**
- `Error`: Invalid contract ID, invalid public key, network error, or contract not found

---

## Data Fetching Hooks

### useAssetMetadata

Fetch asset metadata from stellar.toml.

**Parameters:**
```typescript
function useAssetMetadata(
  code: string,
  issuer: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
)
```

**Return Shape:**
```typescript
interface AssetMetadata {
  name?: string;
  description?: string;
  image?: string;
  homepage?: string;
}

interface UseAssetMetadataReturn {
  metadata: AssetMetadata | null;
  isLoading: boolean;
  error: Error | null;
}
```

**Error Cases:**
- `Error`: Invalid asset, network error, or stellar.toml not found

---

### useStellarToml

Fetch and parse stellar.toml file.

**Parameters:**
```typescript
function useStellarToml(
  domain: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
)
```

**Return Shape:**
```typescript
interface StellarTomlData {
  CURRENCIES?: Array<{
    code?: string;
    issuer?: string;
    name?: string;
    desc?: string;
    image?: string;
  }>;
}

interface UseStellarTomlReturn {
  data: StellarTomlData | null;
  isLoading: boolean;
  error: Error | null;
}
```

**Error Cases:**
- `Error`: Invalid domain, network error, or stellar.toml not found

---

### useNetwork

Get current network configuration.

**Parameters:** None

**Return Shape:**
```typescript
interface UseNetworkReturn {
  network: StellarNetwork;
  config: NetworkConfig;
}
```

**Error Cases:** None

---

## Utility Hooks

### useIntersectionObserver

React hook for Intersection Observer API.

**Parameters:**
```typescript
function useIntersectionObserver(
  options?: IntersectionObserverInit
)
```

**Return Shape:**
```typescript
interface UseIntersectionObserverReturn {
  ref: React.RefObject<Element>;
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
}
```

**Error Cases:** None

---

## Error Handling

All hooks follow a consistent error handling pattern:

1. **User Rejection**: Operations that require user approval (connect, sign) throw `UserRejectedError` when the user declines
2. **Network Errors**: Horizon/RPC failures throw standard `Error` with descriptive messages
3. **Validation Errors**: Invalid parameters throw `Error` with validation details
4. **Loading States**: All async operations include `isLoading` state

### Error Types

```typescript
class UserRejectedError extends Error {
  constructor(message: string, options?: { cause?: Error; walletId?: string; operation?: string });
}
```

---

## Common Patterns

### Checking Connection

```tsx
const { isConnected, publicKey, connect } = useFreighter();

if (!isConnected) {
  return <button onClick={connect}>Connect Wallet</button>;
}
```

### Handling Loading States

```tsx
const { account, isLoading, error } = useStellarAccount(publicKey);

if (isLoading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;
if (!account) return <div>No account data</div>;
```

### Transaction Error Handling

```tsx
const transaction = useTransaction();

try {
  await transaction.call({ xdr, signTransaction });
} catch (error) {
  if (error instanceof UserRejectedError) {
    console.log("User rejected transaction");
  } else {
    console.error("Transaction failed:", error);
  }
}
```

---

## Network Configuration

All hooks require the app to be wrapped in `StellarProvider`:

```tsx
import { StellarProvider } from "stellar-hooks";

<StellarProvider network="testnet">
  <App />
</StellarProvider>
```

Available networks: `"testnet"`, `"mainnet"`, `"futurenet"`, `"custom"`

---

## TypeScript Support

All hooks are fully typed. Import types from `"stellar-hooks"`:

```typescript
import type {
  StellarPublicKey,
  StellarContractId,
  StellarXdrString,
  TransactionState,
  StellarTransactionError,
} from "stellar-hooks";
```