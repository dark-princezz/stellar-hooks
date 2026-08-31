# Troubleshooting Guide

Common errors users encounter when using stellar-hooks and how to fix them.

## Freighter Wallet Issues

### Connection Timeout / Hanging on "Connecting"

**Error Message:**
```
Connecting to Freighter... (hangs indefinitely)
App stuck on loading spinner
```

**Causes:**
1. Freighter extension is not installed and `isConnected()` never resolves
2. Browser message channel communication issues
3. Running in headless/preview environments without timeout handling
4. Extension in a different browser profile

**Solutions:**

1. **Add timeout handling for connection checks:**
```tsx
import { useFreighter } from 'stellar-hooks';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Connection timeout")), ms)
  );
  return Promise.race([promise, timeout]);
}

// Wrap your connection logic
const checkConnection = async () => {
  try {
    await withTimeout(connect(), 5000); // 5 second timeout
  } catch (err) {
    if (err.message === "Connection timeout") {
      console.error("Freighter not responding - may not be installed");
    }
  }
};
```

2. **Use the hook's built-in error handling:**
```tsx
const { isInstalled, isLoading, error } = useFreighter();

useEffect(() => {
  if (isLoading && !isInstalled) {
    // Show timeout warning after 3 seconds
    const timeout = setTimeout(() => {
      console.warn("Freighter detection taking longer than expected");
    }, 3000);
    return () => clearTimeout(timeout);
  }
}, [isLoading, isInstalled]);
```

3. **Provide clear timeout UI feedback:**
```tsx
const { isInstalled, isLoading, connect } = useFreighter();
const [connectionTimeout, setConnectionTimeout] = useState(false);

useEffect(() => {
  if (isLoading) {
    const timeout = setTimeout(() => setConnectionTimeout(true), 5000);
    return () => clearTimeout(timeout);
  }
}, [isLoading]);

if (connectionTimeout && !isInstalled) {
  return (
    <div>
      <p>Connection timeout. Freighter may not be installed.</p>
      <a href="https://freighter.app" target="_blank" rel="noopener noreferrer">
        Install Freighter
      </a>
    </div>
  );
}
```

---

### "Freighter not detected"

**Error Message:**
```
Freighter is not installed or not detected
```

**Causes:**
1. Freighter extension is not installed in the browser
2. Extension is installed but disabled
3. Extension is installed in a different browser profile
4. Testing in an iframe or sandboxed environment

**Solutions:**

1. **Install Freighter:**
   - Visit https://freighter.app
   - Install the extension for Chrome, Firefox, or Brave
   - Refresh your web page after installation

2. **Enable the extension:**
   - Open browser extensions (`chrome://extensions/` for Chrome)
   - Ensure Freighter is enabled (toggle is on)
   - Refresh your web page

3. **Check browser profile:**
   - Ensure you're using the same browser profile where Freighter is installed
   - Freighter doesn't sync across profiles

4. **Iframe/sandbox issues:**
   - stellar-hooks may not detect Freighter in iframes
   - Use the main window or configure extension permissions
   - Some wallets block iframe access for security reasons

**Code Check:**
```tsx
const { isInstalled } = useFreighter();

if (!isInstalled) {
  return (
    <div>
      <p>Freighter wallet not detected. Please install it from freighter.app</p>
      <a href="https://freighter.app" target="_blank" rel="noopener noreferrer">
        Install Freighter
      </a>
    </div>
  );
}
```

---

### "Failed to get address" / "No public key returned"

**Error Message:**
```
Failed to get address
No public key returned
User denied the request
```

**Causes:**
1. User denied the connection permission in Freighter popup
2. Freighter wallet is locked
3. Multiple accounts configured but no active selection
4. Extension permissions not granted

**Solutions:**

1. **Handle permission denial gracefully:**
```tsx
import { UserRejectedError } from 'stellar-hooks';

const { connect, error } = useFreighter();

const handleConnect = async () => {
  try {
    await connect();
  } catch (err) {
    if (err instanceof UserRejectedError) {
      console.log('User denied connection permission');
      alert('Please grant permission to connect your wallet.');
    } else if (err.message.includes('Failed to get address')) {
      console.error('Address retrieval failed:', err);
      alert('Unable to retrieve wallet address. Please check Freighter is unlocked.');
    }
  }
};
```

2. **Check for locked wallet:**
```tsx
const { error, isInstalled } = useFreighter();

if (error?.message.includes('locked') || error?.message.includes('unlock')) {
  return (
    <div>
      <p>Please unlock your Freighter wallet and try again.</p>
      <button onClick={() => window.location.reload()}>Retry</button>
    </div>
  );
}
```

3. **Guide users through reconnection:**
```tsx
const { error, connect } = useFreighter();

if (error?.message.includes('Failed to get address')) {
  return (
    <div style={{ padding: '1rem', border: '1px solid orange' }}>
      <h3>Connection Issue</h3>
      <p>Unable to retrieve your wallet address. This could be because:</p>
      <ul>
        <li>You denied the permission request</li>
        <li>Your wallet is locked</li>
        <li>No account is selected in Freighter</li>
      </ul>
      <button onClick={connect}>Try Connecting Again</button>
    </div>
  );
}
```

4. **Use useFreighterAccounts for multi-account scenarios:**
```tsx
import { useFreighterAccounts } from 'stellar-hooks';

const { accounts, switchAccount, error } = useFreighterAccounts();

if (accounts.length > 1) {
  return (
    <div>
      <p>Select an account:</p>
      {accounts.map((account) => (
        <button key={account} onClick={() => switchAccount(account)}>
          {account.slice(0, 8)}...{account.slice(-4)}
        </button>
      ))}
    </div>
  );
}
```

---

### Extension Communication Errors

**Error Message:**
```
Freighter is not available in this browser
Extension communication failed
window.freighterApi is not defined
```

**Causes:**
1. Freighter extension not installed
2. Extension disabled in current browser
3. Running in iframe with restricted permissions
4. Browser blocking extension communication
5. Using wrong browser (not Chrome/Firefox/Brave)

**Solutions:**

1. **Detect extension availability:**
```tsx
const { isInstalled } = useFreighter();

if (!isInstalled) {
  return (
    <div>
      <h3>Freighter Not Detected</h3>
      <p>Please install the Freighter browser extension to continue.</p>
      <a 
        href="https://freighter.app" 
        target="_blank" 
        rel="noopener noreferrer"
        style={{ padding: '0.5rem 1rem', background: '#007bff', color: 'white', textDecoration: 'none' }}
      >
        Install Freighter
      </a>
    </div>
  );
}
```

2. **Check browser compatibility:**
```tsx
const isSupportedBrowser = () => {
  const userAgent = navigator.userAgent;
  return /Chrome|Firefox|Brave/.test(userAgent);
};

if (!isSupportedBrowser()) {
  return (
    <div>
      <p>Freighter is supported on Chrome, Firefox, and Brave browsers.</p>
      <p>Please use a supported browser or install the Freighter mobile app.</p>
    </div>
  );
}
```

3. **Handle iframe restrictions:**
```tsx
const isInIframe = window.self !== window.top;

if (isInIframe && !isInstalled) {
  return (
    <div>
      <p>Extension detection may not work in iframes.</p>
      <p>Please open this app in a new tab or ensure extension permissions are granted.</p>
      <button onClick={() => window.open(window.location.href, '_blank')}>
        Open in New Tab
      </button>
    </div>
  );
}
```

4. **Enable extension instructions:**
```tsx
const { isInstalled } = useFreighter();

if (!isInstalled) {
  return (
    <div>
      <h3>Enable Freighter Extension</h3>
      <ol>
        <li>Open your browser's extensions page</li>
        <li>Find Freighter in the list</li>
        <li>Enable the extension toggle</li>
        <li>Refresh this page</li>
      </ol>
      <button onClick={() => window.location.reload()}>Refresh Page</button>
    </div>
  );
}
```

---

### Network Mismatch Error

**Error Message:**
```
Freighter is connected to a different network which does not match this app's configured network
```

**Causes:**
1. Freighter is set to mainnet but your app uses testnet
2. Freighter is set to testnet but your app uses mainnet
3. Custom network configuration mismatch

**Solutions:**

1. **Check your app's network configuration:**
```tsx
<StellarProvider network="testnet">
  <App />
</StellarProvider>
```

2. **Switch Freighter to the same network:**
   - Open Freighter extension
   - Click the network selector (top-right)
   - Select the same network as your app (testnet/mainnet)

3. **Detect and warn users:**
```tsx
const { networkPassphraseMismatch, networkPassphraseWarning } = useFreighter();

if (networkPassphraseMismatch) {
  return (
    <div style={{ color: 'red', padding: '1rem', border: '1px solid red' }}>
      <h3>Network Mismatch</h3>
      <p>{networkPassphraseWarning}</p>
      <p>Please switch Freighter to the correct network.</p>
    </div>
  );
}
```

4. **Use custom network configuration:**
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
  <App />
</StellarProvider>
```

---

### "User rejected" / Permission Denied

**Error Message:**
```
User rejected the request
User denied the transaction
User cancelled the operation
```

**Causes:**
1. User clicked "Cancel" or "Deny" in the wallet popup
2. User closed the wallet popup without approving
3. User has the wallet locked and didn't unlock it
4. User rejected a specific operation (signing, connection)

**Solutions:**

1. **Handle user rejection gracefully:**
```tsx
import { UserRejectedError } from 'stellar-hooks';

const { connect, error } = useFreighter();

const handleConnect = async () => {
  try {
    await connect();
  } catch (err) {
    if (err instanceof UserRejectedError) {
      console.log('User rejected connection');
      // Show user-friendly message
      alert('Connection was cancelled. Please try again if you want to connect.');
    } else {
      console.error('Connection failed:', err);
    }
  }
};
```

2. **Check if wallet is locked:**
```tsx
// Some wallets return specific errors when locked
if (error?.message.includes('locked') || error?.message.includes('unlock')) {
  return (
    <div>
      <p>Please unlock your wallet and try again.</p>
    </div>
  );
}
```

3. **Provide clear UI feedback:**
```tsx
const { error } = useFreighter();

if (error) {
  return (
    <div style={{ color: 'red' }}>
      {error.message.includes('rejected') || error.message.includes('denied') ? (
        <p>Operation cancelled by user. Please try again if you want to proceed.</p>
      ) : (
        <p>Error: {error.message}</p>
      )}
    </div>
  );
}
```

4. **Retry mechanism:**
```tsx
const [retryCount, setRetryCount] = useState(0);

const handleConnect = async () => {
  try {
    await connect();
  } catch (err) {
    if (err instanceof UserRejectedError && retryCount < 2) {
      // Allow retry for user rejection
      setRetryCount(prev => prev + 1);
      return;
    }
    // Handle other errors
  }
};
```

---

### Signing Errors

**Error Message:**
```
Signing failed
No signed transaction returned
User rejected signing
Transaction signing error
```

**Causes:**
1. User rejected the signing request in Freighter popup
2. Transaction XDR is malformed or invalid
3. Network passphrase mismatch in signing options
4. Account not connected before signing attempt
5. Insufficient fee stroops in transaction

**Solutions:**

1. **Validate before signing:**
```tsx
const { isConnected, publicKey, signTransaction } = useFreighter();

const handleSign = async (xdr: string) => {
  if (!isConnected || !publicKey) {
    alert('Please connect your wallet first');
    return;
  }

  try {
    const signedXdr = await signTransaction(xdr, {
      networkPassphrase: "Test SDF Network ; September 2015",
    });
    console.log('Signed:', signedXdr);
  } catch (err) {
    if (err instanceof UserRejectedError) {
      console.log('User rejected signing');
    } else {
      console.error('Signing failed:', err);
    }
  }
};
```

2. **Check XDR validity before signing:**
```tsx
import { Transaction } from '@stellar/stellar-sdk';

const validateXdr = (xdrString: string): boolean => {
  try {
    Transaction.fromXDR(xdrString, "base64");
    return true;
  } catch {
    return false;
  }
};

const handleSign = async (xdr: string) => {
  if (!validateXdr(xdr)) {
    alert('Invalid transaction XDR');
    return;
  }
  await signTransaction(xdr);
};
```

3. **Handle network passphrase in signing:**
```tsx
const { networkPassphrase, signTransaction } = useFreighter();

const handleSign = async (xdr: string) => {
  try {
    const signedXdr = await signTransaction(xdr, {
      networkPassphrase: networkPassphrase || undefined,
    });
    return signedXdr;
  } catch (err) {
    console.error('Signing failed:', err);
    throw err;
  }
};
```

4. **Provide signing feedback:**
```tsx
const { isSigningMessage, signTransaction } = useFreighter();

const handleSign = async (xdr: string) => {
  try {
    const signedXdr = await signTransaction(xdr);
    alert('Transaction signed successfully!');
    return signedXdr;
  } catch (err) {
    if (err.message.includes('reject') || err.message.includes('cancel')) {
      alert('Signing was cancelled. Please try again if you want to proceed.');
    } else {
      alert(`Signing failed: ${err.message}`);
    }
    throw err;
  }
};
```

---

### Auto-Connect Issues

**Error Message:**
```
Auto-connect failed
Silent reconnection not working
Permission check failed
```

**Causes:**
1. User previously denied permission (auto-connect requires prior approval)
2. Extension permissions changed since last connection
3. Network configuration changed between sessions
4. localStorage/sessionStorage cleared

**Solutions:**

1. **Handle auto-connect failures gracefully:**
```tsx
const { isConnected, isAutoConnecting, error } = useFreighter({
  autoConnect: true,
});

if (isAutoConnecting) {
  return <p>Reconnecting to wallet...</p>;
}

if (!isConnected && !isAutoConnecting) {
  return <button onClick={connect}>Connect Wallet</button>;
}

if (error && error.message.includes('auto-connect')) {
  return (
    <div>
      <p>Auto-reconnect failed. Please connect manually.</p>
      <button onClick={connect}>Connect Wallet</button>
    </div>
  );
}
```

2. **Clear stored data for fresh start:**
```tsx
const forceReconnect = () => {
  localStorage.removeItem('stellar-hooks:freighter-accounts');
  localStorage.removeItem('stellar-hooks:network');
  window.location.reload();
};

// Use when auto-connect issues persist
<button onClick={forceReconnect}>Reset Connection</button>
```

3. **Check permission status before auto-connect:**
```tsx
import { isAllowed } from '@stellar/freighter-api';

const checkPermission = async () => {
  const { isAllowed: allowed } = await isAllowed();
  if (!allowed) {
    console.log('Permission not granted, auto-connect will fail');
    return false;
  }
  return true;
};

// In your component
useEffect(() => {
  checkPermission().then((hasPermission) => {
    if (!hasPermission) {
      // Show manual connect button instead of auto-connect
    }
  });
}, []);
```

---

### SignMessage / SignBlob Errors

**Error Message:**
```
Message signing failed
No signed message returned
Blob signing error
```

**Causes:**
1. User rejected the message signing request
2. Message format not supported by Freighter
3. Account not connected
4. Message too long or contains invalid characters

**Solutions:**

1. **Handle message signing rejection:**
```tsx
const { isConnected, signMessage, isSigningMessage } = useFreighter();

const handleSignMessage = async (message: string) => {
  if (!isConnected) {
    alert('Please connect your wallet first');
    return;
  }

  try {
    const signature = await signMessage(message);
    console.log('Signed message:', signature);
    return signature;
  } catch (err) {
    if (err instanceof UserRejectedError) {
      alert('Message signing was cancelled');
    } else {
      alert(`Message signing failed: ${err.message}`);
    }
    throw err;
  }
};
```

2. **Show signing state:**
```tsx
const { signMessage, isSigningMessage } = useFreighter();

<button 
  onClick={() => signMessage("Hello")}
  disabled={isSigningMessage}
>
  {isSigningMessage ? 'Signing...' : 'Sign Message'}
</button>
```

3. **Validate message before signing:**
```tsx
const validateMessage = (message: string): boolean => {
  // Freighter has message length limits
  if (message.length > 1000) {
    alert('Message too long for signing');
    return false;
  }
  // Check for invalid characters if needed
  return true;
};

const handleSign = async (message: string) => {
  if (!validateMessage(message)) return;
  await signMessage(message);
};
```

---

## Transaction Errors

### "Insufficient balance"

**Error Message:**
```
Insufficient balance to complete transaction
```

**Causes:**
1. Account doesn't have enough XLM for the transaction
2. Account doesn't have enough XLM to cover fees (minimum 100 stroops per operation)
3. Account doesn't have enough of the custom asset being sent

**Solutions:**

1. **Check balance before transaction:**
```tsx
const { xlmBalance } = useStellarBalance(publicKey);

const handlePayment = async () => {
  const balance = parseFloat(xlmBalance?.balance || '0');
  const amount = parseFloat(paymentAmount);
  const fee = 0.00001; // 100 stroops

  if (balance < amount + fee) {
    alert(`Insufficient balance. You have ${balance} XLM but need ${amount + fee} XLM.`);
    return;
  }

  await payment.call({ destination, amount, asset: 'native' });
};
```

2. **Display balance to user:**
```tsx
const { xlmBalance } = useStellarBalance(publicKey);

return (
  <div>
    <p>Your balance: {xlmBalance?.balance} XLM</p>
    <input
      type="number"
      max={parseFloat(xlmBalance?.balance || '0') - 0.00001}
      placeholder="Amount to send"
    />
  </div>
);
```

3. **Fund testnet account:**
```tsx
if (network === 'testnet' && parseFloat(xlmBalance?.balance || '0') < 10) {
  return (
    <div>
      <p>Your testnet balance is low. Get free testnet XLM:</p>
      <a
        href="https://friendbot.stellar.org"
        target="_blank"
        rel="noopener noreferrer"
      >
        Fund Account with Friendbot
      </a>
    </div>
  );
}
```

---

### "Invalid destination address"

**Error Message:**
```
Invalid destination address
Invalid public key
```

**Causes:**
1. Destination address is malformed (not a valid Stellar public key)
2. Destination address is on the wrong network
3. Destination address doesn't exist

**Solutions:**

1. **Validate address format:**
```tsx
import { asPublicKey } from 'stellar-hooks';

const validateAddress = (address: string): boolean => {
  try {
    asPublicKey(address);
    return true;
  } catch {
    return false;
  }
};

const handlePayment = async () => {
  if (!validateAddress(destination)) {
    alert('Invalid Stellar address. Please check the destination.');
    return;
  }

  await payment.call({ destination, amount, asset: 'native' });
};
```

2. **Use the branded type:**
```tsx
import type { StellarPublicKey } from 'stellar-hooks';

const [destination, setDestination] = useState<StellarPublicKey | ''>('');

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  try {
    asPublicKey(e.target.value);
    setDestination(e.target.value as StellarPublicKey);
  } catch {
    setDestination('');
  }
};
```

3. **Check if account exists:**
```tsx
const { account } = useStellarAccount(destination);

if (destination && !account && !account?.isLoading) {
  return (
    <p style={{ color: 'orange' }}>
      Warning: Destination account may not exist or is not funded.
    </p>
  );
}
```

---

## Network Errors

### "Network request failed"

**Error Message:**
```
Network request failed
Failed to fetch
Horizon API error
```

**Causes:**
1. Horizon server is down or unreachable
2. Network connectivity issues
3. CORS configuration issues
4. Rate limiting

**Solutions:**

1. **Check Horizon status:**
```tsx
const { error } = useStellarAccount(publicKey);

if (error?.type === 'network') {
  return (
    <div>
      <p>Network error: {error.message}</p>
      <p>Check Horizon status at https://status.stellar.org</p>
      <button onClick={() => window.location.reload()}>Retry</button>
    </div>
  );
}
```

2. **Implement retry logic:**
```tsx
import { useStellarAccount } from 'stellar-hooks';

function useStellarAccountWithRetry(publicKey: string) {
  const { account, error, refetch } = useStellarAccount(publicKey);

  useEffect(() => {
    if (error?.type === 'network') {
      const retryDelay = setTimeout(() => {
        refetch();
      }, 5000); // Retry after 5 seconds

      return () => clearTimeout(retryDelay);
    }
  }, [error, refetch]);

  return { account, error, refetch };
}
```

3. **Use custom Horizon endpoint:**
```tsx
<StellarProvider
  network="custom"
  customConfig={{
    network: "testnet",
    horizonUrl: "https://horizon-testnet.stellar.org",
    sorobanRpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
  }}
>
  <App />
</StellarProvider>
```

---

## Soroban Errors

### "Contract not found"

**Error Message:**
```
Contract not found
Invalid contract ID
```

**Causes:**
1. Contract ID is malformed
2. Contract doesn't exist on the network
3. Wrong network (contract on mainnet, app on testnet)

**Solutions:**

1. **Validate contract ID format:**
```tsx
import { asContractId } from 'stellar-hooks';

const validateContractId = (contractId: string): boolean => {
  try {
    asContractId(contractId);
    return true;
  } catch {
    return false;
  }
};
```

2. **Check network match:**
```tsx
const { network } = useNetwork();

// Ensure contract is on the same network as your app
if (contractId && network !== expectedContractNetwork) {
  return (
    <p>
      This contract is on {expectedContractNetwork} but your app is on {network}.
      Please switch networks.
    </p>
  );
}
```

3. **Use contract simulation before invocation:**
```tsx
const contract = useSorobanContract({
  contractId,
  method: "my_method",
  args: [...],
});

const handleCall = async () => {
  try {
    // Simulate first to check if contract exists
    const simulation = await contract.simulate();
    if (simulation.error) {
      alert(`Simulation failed: ${simulation.error}`);
      return;
    }
    // Proceed with actual call
    await contract.call();
  } catch (err) {
    console.error('Contract call failed:', err);
  }
};
```

---

### "Simulation failed"

**Error Message:**
```
Simulation failed
Contract invocation failed
```

**Causes:**
1. Invalid arguments passed to contract method
2. Contract method doesn't exist
3. Insufficient resources (fee, instructions)
4. Authorization failed

**Solutions:**

1. **Check simulation results:**
```tsx
const contract = useSorobanContract({
  contractId,
  method: "my_method",
  args: [...],
});

const handleCall = async () => {
  const simulation = await contract.simulate();
  
  if (simulation.error) {
    console.error('Simulation error:', simulation.error);
    alert(`Contract simulation failed: ${simulation.error}`);
    return;
  }
  
  if (!simulation.result) {
    alert('Simulation returned no result');
    return;
  }
  
  // Proceed with actual call
  await contract.call();
};
```

2. **Validate arguments:**
```tsx
import { xdr } from '@stellar/stellar-sdk';

// Ensure arguments are properly encoded as ScVal
const args = [
  xdr.ScVal.scvU32(123),
  xdr.ScVal.scvString("hello"),
  xdr.ScVal.scvBool(true),
];
```

3. **Check authorization:**
```tsx
const simulation = await contract.simulate();

if (simulation.results?.[0]?.auth) {
  console.log('Authorization required:', simulation.results[0].auth);
  // The hook handles authorization automatically if wallet is connected
}
```

---

## Type Errors

### TypeScript compilation errors

**Common Issues:**
1. Missing type imports
2. Incorrect type usage
3. Generic type parameters missing

**Solutions:**

1. **Import types from stellar-hooks:**
```tsx
import type {
  StellarPublicKey,
  StellarContractId,
  StellarXdrString,
  TransactionState,
  StellarTransactionError,
} from 'stellar-hooks';
```

2. **Use branded types for safety:**
```tsx
import { asPublicKey, asContractId } from 'stellar-hooks';

const publicKey: StellarPublicKey = asPublicKey("G...");
const contractId: StellarContractId = asContractId("C...");
```

3. **Specify generic types:**
```tsx
// Without generics - result is unknown
const contract = useSorobanContract({ contractId, method: "get_value" });

// With generics - result is typed
const contract = useSorobanContract<number>({
  contractId,
  method: "get_value",
  parseResult: (scVal) => scVal.u32().toNumber(),
});
```

---

## Build Errors

### "Module not found"

**Error Message:**
```
Module not found: Can't resolve 'stellar-hooks'
```

**Causes:**
1. Package not installed
2. Wrong import path
3. Using individual hook imports incorrectly

**Solutions:**

1. **Install the package:**
```bash
npm install stellar-hooks
```

2. **Use correct import paths:**
```tsx
// Correct - import from main package
import { useFreighter } from 'stellar-hooks';

// Correct - import individual hook (tree-shakeable)
import { useFreighter } from 'stellar-hooks/useFreighter';

// Incorrect - wrong path
import { useFreighter } from 'stellar-hooks/src/hooks/useFreighter';
```

3. **Check package.json:**
```json
{
  "dependencies": {
    "stellar-hooks": "^0.2.0"
  }
}
```

---

## Getting Help

If you're still stuck after trying these solutions:

1. **Check the documentation:**
   - [Quick Start Guide](./QUICKSTART.md)
   - [API Reference](./docs/HOOKS.md)
   - [Wallet Adapter Guide](./CONTRIBUTING_WALLET_ADAPTERS.md)

2. **Search existing issues:**
   - Check [GitHub Issues](https://github.com/dark-princezz/stellar-hooks/issues)
   - Your problem may already have a solution

3. **Ask in Discussions:**
   - [GitHub Discussions](https://github.com/dark-princezz/stellar-hooks/discussions)
   - Good for questions that aren't bug reports

4. **Open an issue:**
   - Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml)
   - Include reproduction steps, code snippets, and environment info
   - Specify which hook is affected

5. **Check network status:**
   - [Stellar Status Page](https://status.stellar.org)
   - Horizon and Soroban RPC may be experiencing outages

---

## Common Debugging Tips

1. **Enable detailed logging:**
```tsx
const { error } = useFreighter();

useEffect(() => {
  if (error) {
    console.error('Freighter error:', {
      message: error.message,
      stack: error.stack,
      cause: (error as any).cause,
    });
  }
}, [error]);
```

2. **Check wallet state:**
```tsx
const { isInstalled, isConnected, publicKey, network } = useFreighter();

useEffect(() => {
  console.log('Wallet state:', {
    isInstalled,
    isConnected,
    publicKey,
    network,
  });
}, [isInstalled, isConnected, publicKey, network]);
```

3. **Use React DevTools:**
   - Inspect hook states and props
   - Check component re-renders
   - Verify context provider is wrapping correctly

4. **Test with minimal example:**
   - Create a simple test component
   - Isolate the problematic hook
   - Verify it works independently

5. **Check browser console:**
   - Look for JavaScript errors
   - Check network tab for failed requests
   - Verify extension is injecting correctly
