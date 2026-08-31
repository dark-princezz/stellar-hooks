# Basic Setup

A minimal example to get started with stellar-hooks.

## Project Setup

### 1. Install Dependencies

```bash
npm install stellar-hooks react @stellar/stellar-sdk
```

### 2. Basic Application Structure

```tsx
// main.tsx
import { StellarProvider } from 'stellar-hooks'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StellarProvider network="testnet">
    <App />
  </StellarProvider>
)
```

### 3. Connect Wallet

```tsx
// App.tsx
import { useFreighter } from 'stellar-hooks'

export default function App() {
  const { isConnected, publicKey, connect } = useFreighter()

  if (!isConnected) {
    return <button onClick={connect}>Connect Wallet</button>
  }

  return <p>Connected: {publicKey}</p>
}
```

## Complete Example

```tsx
import { StellarProvider, useFreighter, useStellarBalance, usePayment } from 'stellar-hooks'

function PaymentApp() {
  const { isConnected, publicKey, connect } = useFreighter()
  const { xlmBalance } = useStellarBalance(publicKey)
  
  const payment = usePayment({
    destination: "GBW...RECIPIENT",
    asset: { type: "native" },
    amount: "10",
  })

  if (!isConnected) {
    return <button onClick={connect}>Connect Wallet</button>
  }

  return (
    <div>
      <p>Balance: {xlmBalance?.balance ?? '0'} XLM</p>
      <button onClick={() => payment.submit()} disabled={payment.isLoading}>
        Send 10 XLM
      </button>
      {payment.isSuccess && <p>Payment successful!</p>}
      {payment.error && <p>Error: {payment.error.message}</p>}
    </div>
  )
}

function App() {
  return (
    <StellarProvider network="testnet">
      <PaymentApp />
    </StellarProvider>
  )
}

export default App
```

## Next Steps

- [Wallet Connection](/examples/wallet-connection) - More wallet examples
- [Payment Flow](/examples/payment-flow) - Advanced payment examples