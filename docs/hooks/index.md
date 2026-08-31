# Hooks Reference

Complete reference for all stellar-hooks.

## Wallet Hooks

| Hook | Description |
|------|-------------|
| [useFreighter](/hooks/use-freighter) | Connect to Freighter wallet extension |
| [useWallet](/hooks/use-wallet) | Unified multi-wallet interface |
| [useWalletKit](/hooks/use-wallet-kit) | Multi-wallet detection and management |
| [useFreighterAccounts](/hooks/use-freighter-accounts) | Multi-account tracking and switching |
| [useAlbedo](/hooks/use-albedo) | Albedo web wallet integration |
| [useXBull](/hooks/use-xbull) | xBull extension wallet |
| [useRabet](/hooks/use-rabet) | Rabet extension wallet |

## Account Hooks

| Hook | Description |
|------|-------------|
| [useStellarAccount](/hooks/use-stellar-account) | Fetch single Stellar account |
| [useStellarAccounts](/hooks/use-stellar-accounts) | Batch account fetching |
| [useStellarBalance](/hooks/use-stellar-balance) | Balance queries with asset filtering |
| [useAssetBalance](/hooks/use-asset-balance) | Specific asset balance |
| [useAssetMetadata](/hooks/use-asset-metadata) | Asset information from stellar.toml |

## Transaction Hooks

| Hook | Description |
|------|-------------|
| [usePayment](/hooks/use-payment) | Send payments |
| [usePathPayment](/hooks/use-path-payment) | Path payments |
| [useTransaction](/hooks/use-transaction) | Custom transaction building |
| [useMultiOperationTransaction](/hooks/use-multi-operation-transaction) | Multi-operation transactions |

## Soroban Hooks

| Hook | Description |
|------|-------------|
| [useSorobanContract](/hooks/use-soroban-contract) | Smart contract interaction |
| [useSorobanRead](/hooks/use-soroban-read) | Read-only contract calls |
| [useSorobanServer](/hooks/use-soroban-server) | Custom RPC server instance |
| [useLedgerEntry](/hooks/use-ledger-entry) | Direct ledger entry access |
| [useContractEvents](/hooks/use-contract-events) | Contract event streaming |

## Network Hooks

| Hook | Description |
|------|-------------|
| [useNetwork](/hooks/use-network) | Network configuration |
| [useStellarNetwork](/hooks/use-stellar-network) | Dynamic network switching |
| [useNetworkConfig](/hooks/use-network-config) | Full network configuration |
| [useHorizonServer](/hooks/use-horizon-server) | Custom Horizon queries |
| [useNetworkStatus](/hooks/use-network-status) | Network health monitoring |

## DEX Hooks

| Hook | Description |
|------|-------------|
| [useOrderBook](/hooks/use-order-book) | DEX order book queries |
| [useOffers](/hooks/use-offers) | Account offers |
| [useStellarOffers](/hooks/use-stellar-offers) | Stellar DEX offers |
| [useTrade](/hooks/use-trade) | DEX trading operations |
| [useLiquidityPool](/hooks/use-liquidity-pool) | Liquidity pool operations |

## Utility Hooks

| Hook | Description |
|------|-------------|
| [useStellarToml](/hooks/use-stellar-toml) | stellar.toml file parsing |
| [useOperations](/hooks/use-operations) | Horizon operations |
| [useTrustline](/hooks/use-trustline) | Trustline management |
| [useCreateAccount](/hooks/use-create-account) | Account creation |
| [useFeeStats](/hooks/use-fee-stats) | Fee statistics |

## Quick Links

- [Getting Started](/guide/introduction)
- [Quick Start](/guide/quick-start)
- [Error Handling](/guide/error-handling)
- [Troubleshooting](/guide/troubleshooting)