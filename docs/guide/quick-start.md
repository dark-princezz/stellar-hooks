# Quick Start

Get a stellar-hooks application running in just a few minutes.

## 1. Install the Package

```bash
npm install stellar-hooks
```

## 2. Set Up the Provider

Wrap your application with the `StellarProvider`:

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

## 3. Connect a Wallet

```tsx
// App.tsx
import { useFreighter } from 'stellar-hooks'

export function App() {
  const { isConnected, publicKey, connect } = useFreighter()

  if (!isConnected) {
    return <button onClick={connect}>Connect Wallet</button>
  }

  return <p>Connected: {publicKey}</p>
}
```

## 4. Read Account Data

```tsx
import { useFreighter, useStellarBalance } from 'stellar-hooks'

export function App() {
  const { isConnected, publicKey, connect } = useFreighter()
  const { xlmBalance } = useStellarBalance(publicKey)

  if (!isConnected) {
    return <button onClick={connect}>Connect Wallet</button>
  }

  return (
    <div>
      <p>Connected: {publicKey}</p>
      <p>Balance: {xlmBalance?.balance ?? '0'} XLM</p>
    </div>
  )
}
```

## 5. Send a Payment

```tsx
import { useFreighter, useStellarBalance, usePayment } from 'stellar-hooks'

export function App() {
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
      <button onClick={() => payment.submit()}>Send 10 XLM</button>
      {payment.isLoading && <p>Sending...</p>}
      {payment.isSuccess && <p>Payment successful!</p>}
      {payment.error && <p>Error: {payment.error.message}</p>}
    </div>
  )
}
```

## Next Steps

- [Configuration](/guide/configuration) - Learn about network options and custom configs
- [Wallet Integration](/guide/wallets) - Explore different wallet options
- [API Reference](/hooks/) - Browse all available hooks