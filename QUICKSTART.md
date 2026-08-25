# Quick Start Guide

This guide will walk you through setting up stellar-hooks in your React application and making your first Stellar transaction.

## Prerequisites

- Node.js 18+ installed
- React 18+ project (create-react-app, Vite, Next.js, etc.)
- Freighter browser extension installed (for wallet interactions)

## Step 1: Install the Package

```bash
npm install stellar-hooks
# or
yarn add stellar-hooks
# or
pnpm add stellar-hooks
```

## Step 2: Wrap Your App in the Provider

The `StellarProvider` component makes the Stellar network configuration available to all hooks in your app.

```tsx
// src/main.tsx or src/App.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { StellarProvider } from 'stellar-hooks';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StellarProvider network="testnet">
      <App />
    </StellarProvider>
  </React.StrictMode>
);
```

**Provider Options:**

- `network`: Built-in network preset (`"testnet"`, `"mainnet"`, `"futurenet"`, or `"custom"`)
- `customConfig`: Required when using `"custom"` network (see Custom Networks section below)
- `children`: Your React application

## Step 3: Connect Freighter Wallet

Use the `useFreighter` hook to connect to the Freighter wallet extension.

```tsx
// src/components/WalletConnect.tsx
import { useFreighter } from 'stellar-hooks';

export function WalletConnect() {
  const { 
    isInstalled, 
    isConnected, 
    publicKey, 
    connect, 
    disconnect,
    error 
  } = useFreighter();

  if (!isInstalled) {
    return <p>Please install Freighter wallet extension</p>;
  }

  if (isConnected) {
    return (
      <div>
        <p>Connected: {publicKey}</p>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={connect}>Connect Freighter</button>
      {error && <p style={{ color: 'red' }}>{error.message}</p>}
    </div>
  );
}
```

**useFreighter Return Values:**

- `isInstalled`: Whether Freighter extension is detected
- `isConnected`: Whether user has connected their wallet
- `publicKey`: Connected wallet's Stellar public key (G...)
- `network`: Network name reported by Freighter
- `connect()`: Request wallet connection
- `disconnect()`: Clear active session
- `signTransaction()`: Sign a transaction XDR
- `signMessage()`: Sign an arbitrary message
- `error`: Most recent error, if any

## Step 4: Make Your First Payment Transaction

Now let's send a payment using the `usePayment` hook.

```tsx
// src/components/SendPayment.tsx
import { useState } from 'react';
import { usePayment } from 'stellar-hooks';

export function SendPayment() {
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  
  const payment = usePayment();

  const handleSend = async () => {
    if (!destination || !amount) return;

    await payment.call({
      destination,
      amount,
      asset: 'native', // XLM
    });
  };

  return (
    <div>
      <h3>Send XLM Payment</h3>
      
      <input
        type="text"
        placeholder="Destination address (G...)"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
      />
      
      <input
        type="text"
        placeholder="Amount (e.g. 10)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      
      <button 
        onClick={handleSend}
        disabled={payment.isLoading}
      >
        {payment.isLoading ? 'Sending...' : 'Send Payment'}
      </button>

      {payment.isSuccess && (
        <p style={{ color: 'green' }}>
          Transaction successful! Hash: {payment.hash}
        </p>
      )}

      {payment.isError && (
        <p style={{ color: 'red' }}>
          Error: {payment.error?.message}
        </p>
      )}
    </div>
  );
}
```

**usePayment Parameters:**

- `destination`: Recipient's Stellar public key (G...)
- `amount`: Amount to send (as string, e.g. "10.5")
- `asset`: Asset to send (`"native"` for XLM, or object for custom assets)
- `memo`: Optional memo for the transaction

**usePayment Return Values:**

- `call()`: Execute the payment transaction
- `isLoading`: True while transaction is in progress
- `isSuccess`: True if transaction completed successfully
- `isError`: True if transaction failed
- `hash`: Transaction hash (on success)
- `error`: Error details (on failure)

## Step 5: Put It All Together

Here's a complete example combining all the pieces:

```tsx
// src/App.tsx
import { useFreighter, usePayment } from 'stellar-hooks';
import { WalletConnect } from './components/WalletConnect';
import { SendPayment } from './components/SendPayment';

function App() {
  const { publicKey } = useFreighter();

  return (
    <div>
      <h1>Stellar Hooks Demo</h1>
      
      <WalletConnect />
      
      {publicKey && (
        <SendPayment />
      )}
    </div>
  );
}

export default App;
```

## Custom Networks

To use a custom Stellar network (e.g., local development or private network):

```tsx
import { StellarProvider } from 'stellar-hooks';

<StellarProvider
  network="custom"
  customConfig={{
    network: "custom",
    horizonUrl: "https://your-horizon.example.com",
    sorobanRpcUrl: "https://your-rpc.example.com",
    networkPassphrase: "Your Custom Network ; 2024",
  }}
>
  <App />
</StellarProvider>
```

## Common Next Steps

Once you've completed the quick start, explore:

- **Account Data**: Use `useStellarAccount` to fetch account balances and info
- **Soroban Contracts**: Use `useSorobanContract` to interact with smart contracts
- **Other Transactions**: Explore `useTrustline`, `useManageData`, `useOfferBook`, etc.
- **Wallet Options**: Try `useWalletConnect` or `useWalletsKit` for alternative wallet support

## Troubleshooting

**Freighter not detected:**
- Ensure Freighter extension is installed and enabled
- Refresh the page after installing the extension

**Connection fails:**
- Check that Freighter is set to the same network as your app (testnet vs mainnet)
- Ensure you're not in private/incognito mode

**Transaction fails:**
- Verify your account has sufficient XLM balance
- Check that the destination address is valid
- Review the error message for specific failure reasons

## Need Help?

- Check the [main documentation](./docs/)
- Browse [examples](./examples/)
- Open an [issue on GitHub](https://github.com/dark-princezz/stellar-hooks/issues)
- Join the [Discussions](https://github.com/dark-princezz/stellar-hooks/discussions)
