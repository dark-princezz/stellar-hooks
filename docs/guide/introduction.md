# Introduction

`stellar-hooks` is a React hooks library that provides a declarative interface for building Stellar and Soroban applications. It's designed to make Stellar development feel like modern web development with React.

## Why stellar-hooks?

Building Stellar applications typically involves:

- Managing wallet connections and permissions
- Handling network configuration and switching
- Building and signing transactions
- Polling for account and transaction updates
- Managing complex state and error handling

`stellar-hooks` abstracts all of this complexity into simple, composable React hooks.

## Key Benefits

### 🎯 Declarative & Composable

Each hook encapsulates a specific piece of functionality, making your code predictable and easy to test. Hooks can be combined to build complex workflows.

### 🔌 Multi-Wallet Support

Built-in support for the most popular Stellar wallets with a unified interface. Add new wallets without changing your application code.

### 📡 Real-time Data

Automatic data fetching, caching, and real-time updates. Set up polling intervals and let the hooks handle the rest.

### 🛡️ Type-Safe

Full TypeScript support with branded types for addresses, contract IDs, and XDR strings. Catch errors at compile time.

### 🧪 Well-Tested

Comprehensive test coverage with integration tests. Trust that the hooks work as expected.

## What's Included

### Wallet Hooks
- `useFreighter` - Freighter wallet integration
- `useWallet` - Unified multi-wallet interface
- `useWalletKit` - Multi-wallet detection and management
- `useAlbedo`, `useXBull`, `useRabet` - Individual wallet adapters

### Account Hooks
- `useStellarAccount` - Fetch account data
- `useStellarAccounts` - Batch account fetching
- `useStellarBalance` - Balance queries
- `useAssetMetadata` - Asset information from stellar.toml

### Transaction Hooks
- `usePayment` - Send payments
- `usePathPayment` - Path payments
- `useTransaction` - Custom transaction building
- `useMultiOperationTransaction` - Multi-operation transactions

### Soroban Hooks
- `useSorobanContract` - Smart contract interaction
- `useSorobanRead` - Read-only contract calls
- `useLedgerEntry` - Direct ledger entry access
- `useContractEvents` - Contract event streaming

### Network Hooks
- `useNetwork` - Network configuration
- `useStellarNetwork` - Dynamic network switching
- `useHorizonServer` - Custom Horizon queries
- `useSorobanServer` - Custom RPC queries

## Architecture

`stellar-hooks` is built on top of the official Stellar SDK v13 and wallet APIs. It provides:

- **State Management**: React hooks manage wallet state, account data, and transaction status
- **Caching**: Built-in caching layer for efficient data fetching
- **Error Handling**: Consistent error patterns across all hooks
- **Type Safety**: Branded types for Stellar-specific data structures

## Getting Help

- 📖 [Documentation](/)
- 💬 [GitHub Discussions](https://github.com/dark-princezz/stellar-hooks/discussions)
- 🐛 [Report Issues](https://github.com/dark-princezz/stellar-hooks/issues)
- ✨ [Feature Requests](https://github.com/dark-princezz/stellar-hooks/issues/new?template=feature_request.yml)

## License

MIT © 2024-present dark-princezz