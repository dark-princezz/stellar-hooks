# Multi-Wallet Support

Example using WalletKit to support multiple wallets.

```tsx
import { StellarProvider, useWalletKit, useStellarBalance } from 'stellar-hooks'

function MultiWalletApp() {
  const { 
    availableWallets, 
    activeWallet, 
    publicKey, 
    connect, 
    disconnect 
  } = useWalletKit()

  const { xlmBalance } = useStellarBalance(publicKey)

  if (publicKey) {
    return (
      <div>
        <p>Connected via {activeWallet}</p>
        <p>Public Key: {publicKey}</p>
        <p>Balance: {xlmBalance?.balance ?? '0'} XLM</p>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    )
  }

  if (availableWallets.length === 0) {
    return (
      <div>
        <p>No Stellar wallets detected.</p>
        <p>Please install one of the following:</p>
        <ul>
          <li><a href="https://freighter.app" target="_blank">Freighter</a></li>
          <li><a href="https://albedo.link" target="_blank">Albedo</a></li>
          <li><a href="https://xbull.app" target="_blank">xBull</a></li>
          <li><a href="https://rabet.io" target="_blank">Rabet</a></li>
        </ul>
      </div>
    )
  }

  return (
    <div>
      <h3>Select a wallet:</h3>
      {availableWallets.map((id) => (
        <button 
          key={id} 
          onClick={() => connect(id)}
          style={{ margin: '0.5rem' }}
        >
          Connect {id}
        </button>
      ))}
    </div>
  )
}

function App() {
  return (
    <StellarProvider network="testnet">
      <MultiWalletApp />
    </StellarProvider>
  )
}

export default App
```

## Related

- [useWalletKit](/hooks/use-wallet-kit) - Multi-wallet hook reference
- [Wallet Integration](/guide/wallets) - Wallet integration guide