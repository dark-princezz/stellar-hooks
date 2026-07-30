# Stellar Hooks - Usage Examples

Quick reference for all hooks in the stellar-hooks library.

## Wallet Hooks

### useWalletConnect
```tsx
import { useWalletConnect } from 'stellar-hooks';

function WalletConnect() {
  const { connect, disconnect, isConnected, publicKey } = useWalletConnect();
  
  return (
    <div>
      {!isConnected ? (
        <button onClick={() => connect('freighter')}>Connect</button>
      ) : (
        <div>
          <p>Connected: {publicKey}</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      )}
    </div>
  );
}