# Payment Flow

Complete payment flow with balance checking and confirmation.

```tsx
import { StellarProvider, useFreighter, useStellarBalance, usePayment } from 'stellar-hooks'

function PaymentFlow() {
  const { isConnected, publicKey, connect } = useFreighter()
  const { xlmBalance, isLoading: balanceLoading } = useStellarBalance(publicKey)
  
  const [amount, setAmount] = useState('10')
  const [destination, setDestination] = useState('')

  const payment = usePayment({
    destination,
    asset: { type: "native" },
    amount,
    onSuccess: (hash) => alert(`Payment successful! Hash: ${hash}`),
    onError: (error) => alert(`Payment failed: ${error.message}`),
  })

  const handlePayment = async () => {
    const balance = parseFloat(xlmBalance?.balance || '0')
    const paymentAmount = parseFloat(amount)

    if (balance < paymentAmount + 0.00001) {
      alert('Insufficient balance')
      return
    }

    await payment.submit()
  }

  if (!isConnected) {
    return <button onClick={connect}>Connect Wallet</button>
  }

  if (balanceLoading) return <p>Loading balance...</p>

  return (
    <div>
      <p>Balance: {xlmBalance?.balance ?? '0'} XLM</p>
      <input
        type="text"
        placeholder="Destination address"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
      />
      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button 
        onClick={handlePayment} 
        disabled={payment.isLoading || !destination}
      >
        {payment.isLoading ? 'Sending...' : 'Send XLM'}
      </button>
      {payment.isSuccess && <p>Payment successful!</p>}
      {payment.error && <p>Error: {payment.error.message}</p>}
    </div>
  )
}

function App() {
  return (
    <StellarProvider network="testnet">
      <PaymentFlow />
    </StellarProvider>
  )
}

export default App
```

## Related

- [usePayment](/hooks/use-payment) - Payment hook reference
- [Wallet Connection](/examples/wallet-connection) - Wallet examples