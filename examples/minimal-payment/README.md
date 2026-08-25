# Minimal Payment Example

A minimal Vite + React example demonstrating `useFreighter` and `usePayment` hooks end-to-end.

## Features

- Connect to Freighter wallet on Stellar testnet
- Display account balance
- Send XLM payments to any Stellar address
- Handle loading states, errors, and success states
- Beautiful, responsive UI

## Setup

```bash
cd examples/minimal-payment
npm install
```

## Run

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Build

```bash
npm run build
```

## Deploy

This example can be deployed to any static hosting service:

- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy`
- **GitHub Pages**: Configure in repo settings

## How It Works

### 1. Provider Setup

The app is wrapped in `StellarProvider` with testnet configuration:

```tsx
<StellarProvider network="testnet">
  <App />
</StellarProvider>
```

### 2. Wallet Connection

Uses `useFreighter` to connect to the wallet:

```tsx
const { isConnected, publicKey, connect, disconnect, isInstalled } = useFreighter();
```

### 3. Balance Display

Uses `useStellarBalance` to fetch and display XLM balance:

```tsx
const { xlmBalance } = useStellarBalance(publicKey);
```

### 4. Payment Transaction

Uses `usePayment` to send XLM payments:

```tsx
const payment = usePayment();

await payment.call({
  destination,
  amount,
  asset: "native",
});
```

## Testing the Example

1. **Install Freighter**: https://freighter.app
2. **Set to Testnet**: Open Freighter and switch to testnet
3. **Fund Account**: Use https://friendbot.stellar.org to get testnet XLM
4. **Connect**: Click "Connect Freighter" in the app
5. **Send Payment**: Enter a destination address and amount, then click "Send Payment"

## Testnet Destination

For testing, you can send to the Stellar Development Foundation testnet account:
```
GD5J6JFZ3VVHCBT2DZVX4JNXGNRQJ2KWL4QWALJ5NQJ4KVPJCEKJW5IQ
```

## Key Concepts Demonstrated

- **Wallet Detection**: Checking if Freighter is installed
- **Connection Flow**: Connecting to wallet and handling user rejection
- **Balance Fetching**: Getting account balance from Horizon
- **Transaction Building**: Creating payment transactions
- **Transaction Signing**: Signing with Freighter
- **Transaction Submission**: Submitting to Stellar network
- **Status Polling**: Waiting for transaction confirmation
- **Error Handling**: Network errors, user rejection, insufficient balance
- **Loading States**: Showing progress during async operations

## Customization

### Change Network

Edit `src/App.tsx`:

```tsx
// Change to mainnet
<StellarProvider network="mainnet">
```

### Custom Network

```tsx
<StellarProvider
  network="custom"
  customConfig={{
    network: "custom",
    horizonUrl: "https://your-horizon.example.com",
    sorobanRpcUrl: "https://your-rpc.example.com",
    networkPassphrase: "Your Custom Network ; 2024",
  }}
>
```

### Add Memo Support

```tsx
await payment.call({
  destination,
  amount,
  asset: "native",
  memo: "Payment for services",
});
```

### Custom Asset Payment

```tsx
await payment.call({
  destination,
  amount,
  asset: {
    code: "USDC",
    issuer: "G...",
  },
});
```

## Troubleshooting

**Freighter not detected:**
- Ensure Freighter extension is installed and enabled
- Refresh the page after installation
- Check you're using Chrome, Firefox, or Brave

**Connection fails:**
- Ensure Freighter is set to testnet
- Check browser console for errors
- Try unlocking Freighter if it's locked

**Payment fails:**
- Ensure your account has sufficient XLM balance
- Verify the destination address is valid
- Check network status at https://status.stellar.org

## Learn More

- [Quick Start Guide](../../QUICKSTART.md)
- [API Reference](../../docs/HOOKS.md)
- [Troubleshooting Guide](../../TROUBLESHOOTING.md)
