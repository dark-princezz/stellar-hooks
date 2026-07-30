# Mainnet Payment dApp Example

A minimal, production-ready Stellar Mainnet payment dApp built with `stellar-hooks`.

## Features

- **Mainnet Configuration**: `<StellarProvider network="mainnet">` automatically targets Stellar Public Mainnet RPCs and Horizon nodes.
- **Wallet Connection**: Uses `useFreighter()` to safely handle wallet pairing, network passphrase warnings, and disconnection.
- **Balance Display**: Fetches live XLM and custom asset balances via `useStellarBalance()`.
- **Payments**: Uses `usePayment()` to compose, sign via Freighter, and broadcast mainnet transactions with real-time status reporting.
