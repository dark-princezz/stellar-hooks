# Troubleshooting Guide

Common errors users encounter when using stellar-hooks and how to fix them.

## Freighter Wallet Issues

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
