# Wagmi-Inspired Design Philosophy

If you are coming to the Stellar and Soroban ecosystem from Ethereum or EVM-compatible tooling, you are likely familiar with **wagmi**—the premier React hooks library for Ethereum. 

`stellar-hooks` was built with a deliberate **wagmi-inspired architecture**. Our goal is to eliminate the friction and redundant boilerplate of working directly with the Stellar JavaScript SDK (`@stellar/stellar-sdk`) and Freighter API by providing the exact mental models, hook naming conventions, and predictable return types you already know.

---

## Why Wagmi-Inspired?

Building decentralized applications requires dealing with asynchronous network requests, wallet handshakes, cryptographic signatures, transaction polling, and error boundaries. Without a unified pattern, every dApp ends up reinventing custom state management, resulting in brittle `useEffect` hooks and prop drilling.

By adopting `wagmi`'s battle-tested patterns, `stellar-hooks` brings:
1. **Declarative State Management:** No manual polling loops or listener setup; hooks manage their own lifecycle.
2. **Consistent Return Signatures:** Predictable data structures across data-fetching and write operations.
3. **Framework Independence & Type Safety:** Full TypeScript support with robust inference matching Soroban SCVals and Horizon responses.

---

## Hook Mapping: EVM (Wagmi) vs. Stellar (stellar-hooks)

Here is how common EVM hooks map directly to their Stellar and Soroban equivalents in `stellar-hooks`:

| EVM Concept (`wagmi`) | Stellar Equivalent (`stellar-hooks`) | Description |
| :--- | :--- | :--- |
| `useAccount()` | `useFreighter()` / `useStellarAccount()` | Manages wallet connection state, public keys, and account metadata. |
| `useBalance()` | `useStellarBalance()` / `useAssetBalance()` | Fetches native XLM balances or issued asset balances (USDC, etc.). |
| `useBlockNumber()` | `useNetworkStatus()` | Monitors the latest ledger sequence, Horizon latency, and RPC health. |
| `useReadContract()` | `useLedgerEntry()` / `useSorobanContract()` | Reads raw persistent/instance Soroban ledger data or simulates contract reads. |
| `useWriteContract()` | `useSorobanContract()` | Executes the full Soroban lifecycle: **Simulate $\rightarrow$ Sign $\rightarrow$ Submit $\rightarrow$ Poll**. |
| `useSendTransaction()` & `useWaitForTransactionReceipt()` | `useTransaction()` | Submits a pre-signed XDR (classic or Soroban) and polls until confirmed. |
| `useConnect()` | `useWalletKit()` / `useFreighter()` | Handles multi-wallet detection (Freighter, xBull, Albedo, Lobstr) and connection handshakes. |
| `useSwitchChain()` | `useStellarNetwork()` / `switchNetwork()` | Dynamically switches between Testnet, Mainnet, Futurenet, or Custom networks at runtime without page reloads. |

---

## Standardized Return Conventions

Just like `wagmi`, `stellar-hooks` standardizes the return objects of its hooks so you never have to guess how to handle loading states or errors.

### 1. Data Fetching Hooks (Read)
Hooks that query Horizon or RPC (e.g., `useStellarAccount`, `useOrderBook`, `useStellarToml`) return a uniform structure:
```ts
const {
  data,          // The resolved typed payload (or null)
  isLoading,     // boolean — true during initial load
  isError,       // boolean — true if the request failed
  error,         // Error | null — failure details
  lastFetchedAt, // Date | null — timestamp of last successful sync
  refetch,       // () => Promise<void> — manual refetch trigger
} = useStellarAccount("G...");
```
### 2. Action / Write Hooks (Execute)
Hooks that trigger blockchain mutations or contract executions (e.g., useSorobanContract, usePayment, useTrustlines) return execution statuses and lifecycle states:

```TypeScript
const {
  call,    // Function to trigger the action
  status,  // "idle" | "building" | "signing" | "submitting" | "polling" | "success" | "error"
  result,  // The resulting scVal or transaction outcome
  hash,    // Stellar transaction hash once submitted
  error,   // Error | null
  reset,   // Resets status back to "idle"
} = useSorobanContract({ ... });
```
## Provider Architecture
Much like <WagmiProvider> wraps an EVM application to inject transport configuration, <StellarProvider> serves as the root boundary for your Stellar application:

```TypeScript
// EVM (wagmi)
<WagmiProvider config="{config}">
  <App/>
</WagmiProvider>

// Stellar (stellar-hooks)
<StellarProvider network="testnet">
  <App/>
</StellarProvider>
```
The provider automatically provisions Horizon REST endpoints, Soroban RPC URLs, and network passphrases, while persisting user network switches to localStorage. Child hooks consume this context seamlessly without requiring prop drilling.