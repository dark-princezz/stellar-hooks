# E2E Test App

Minimal React application for testing stellar-hooks with Playwright and real Freighter extension.

## Setup

```bash
cd examples/e2e-test-app
npm install
```

## Development

```bash
npm run dev
```

The app will run on http://localhost:3000 (strict port for Playwright tests).

## Test Data Attributes

This app includes specific `data-testid` attributes for Playwright e2e tests:

- `app-loaded` - Indicates the app has mounted
- `freighter-is-installed` - Shows if Freighter extension is detected
- `freighter-is-connected` - Shows connection status
- `freighter-public-key` - Connected wallet's public key
- `connect-button` - Button to connect Freighter
- `message-input` - Input for message to sign
- `sign-message-button` - Button to sign message
- `signature-result` - Display signed message result
- `account-data` - Container for account information
- `xlm-balance` - Native XLM balance
- `payment-destination` - Input for payment destination
- `payment-amount` - Input for payment amount
- `submit-payment` - Button to submit payment
- `transaction-status` - Transaction status display
- `network-mismatch` - Network passphrase mismatch warning

## Features

- **Freighter Connection**: Test connection flow with real Freighter extension
- **Message Signing**: Test signing arbitrary messages with connected wallet
- **Account Data**: Display account balance and information from Horizon
- **Transactions**: UI for payment transactions (simulated for testing)
- **Network Detection**: Shows detected network and passphrase mismatches

## Notes

- Uses testnet by default via StellarProvider
- Requires Freighter extension to be installed and configured for testnet
- Transaction submission is simulated - actual Stellar transactions require more complex setup
