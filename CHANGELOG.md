# Changelog

For breaking changes and migration steps, see [MIGRATION.md](MIGRATION.md).

## 0.2.0 — 2026-07-25

### Added
- `useNetwork()` — detect the current Stellar network from the provider
- `useStellarNetwork()` — read and switch the active network configuration
- `useFreighterAccounts()` — list all accounts available in the Freighter wallet
- `useStellarAccounts()` — fetch multiple Stellar accounts from Horizon in parallel
- `useStellarToml()` — fetch and parse a `stellar.toml` file for a given domain
- `useAssetMetadata()` — retrieve asset metadata (code, issuer, flags) from Horizon
- `useStellarOffers()` — fetch offers for a given Stellar account
- `useOffers()` — fetch and manage offers with filtering and pagination
- `useNetworkConfig()` — access the resolved network configuration object
- `useHorizonServer()` — access or create a memoized Horizon.Server instance
- `useEffects()` — stream and paginate account effects from Horizon (REST + SSE)
- `usePayment()` — send a payment transaction (native or asset) via Freighter
- `useBumpSequence()` — bump the sequence number of a Stellar account
- `usePathPayment()` — discover and execute path payment transactions
- `useNetworkStatus()` — monitor Horizon and Soroban RPC health with latency
- `useTransactionHistory()` — paginated transaction history for an account with `fetchNextPage`, `fetchPreviousPage`, and `includeFailed` support
- `useInflation()` — fetch inflation-related data for an account
- `useAccountFlags()` — read and manage account flag settings (AUTHORIZATION REQUIRED, etc.)
- `useTrade()` — place, modify, and cancel offers on the Stellar DEX
- `useAccountMerge()` — merge a source account into a destination account
- `useClaimableBalances()`, `useClaimBalance()`, `useCreateClaimableBalance()` — create, list, and claim claimable balances
- `useSorobanTokenBalance()` — read a Soroban token balance for a given contract
- `useWalletsKit()` — integrate with `@creit-tech/stellar-wallets-kit` for multi-wallet support
- `useWalletKit()` — higher-level wallet kit hook with built-in account switching
- `useWalletConnect()` — WalletConnect v2 integration for Stellar
- `useMultiSig()` — build and submit multi-signature transactions
- `useTrustline()` — add, remove, and manage trustlines for Stellar assets
- `useCreateAccount()` — create a new Stellar account (friendbot or manual)
- `useAssets()` — fetch and list Stellar assets from Horizon with filtering
- `useOperations()` — fetch paginated operations for an account
- `useOfferBook()` — read the current order book for a trading pair
- `useContractId()` — compute a Soroban contract ID from deployer and salt
- `useSequenceNumber()` — read and optionally increment an account's sequence number
- `useFeeStats()` — fetch fee percentile statistics from Horizon
- `useLiquidityPool()` — fetch liquidity pool details and reserves
- `useAccountLiquidityPositions()` — list liquidity pool positions for an account
- `useContractEvents()` — subscribe to Soroban contract events

### Fixed
- Resolved an infinite refetch loop and stale-cache bug affecting query-based hooks
- Repaired several hooks that had been corrupted by unmerged duplicate implementations
- Removed a duplicate `useAccountMerge` export
- Made internal `search()` utility properly awaitable; removed unsafe `any` casts in wallet adapters
- Fixed the cross-platform test script and added the missing `tsd` dependency

### Changed
- **Breaking:** `useAccountMerge` now exposes a `submit()`-based API (`{ submit, status, hash, error, isLoading, isSuccess, isError, reset }`) matching its documented usage, replacing the previous shape. See [MIGRATION.md](MIGRATION.md) for the update path.

### Testing
- Repaired corrupted mocks, a fake-timer leak, and several stale assertions across the test suite


### Security
- Added `SECURITY.md` with supported versions, reporting guidelines, disclosure policy, and PGP key

## 0.1.0 — Initial release

### Added
- `<StellarProvider>` — context provider with `mainnet`, `testnet`, `futurenet`, and `custom` network configs
- `useFreighter()` — connect, sign transactions, and sign auth entries via the Freighter wallet extension
- `useStellarAccount()` — fetch and optionally poll a Stellar account from Horizon
- `useStellarBalance()` — convenience wrapper; surfaces the native XLM balance directly
- `useSorobanContract()` — full Soroban contract call lifecycle: build → simulate → sign → submit → poll
- `useTransaction()` — submit a pre-signed XDR and poll for confirmation (Soroban RPC or Horizon)
- `useLedgerEntry()` — read a raw Soroban ledger entry by `xdr.LedgerKey`
- Full TypeScript types and JSDoc on every public symbol
- Network presets exported as `NETWORK_CONFIGS`
