# Troubleshooting

Common issues and their solutions.

## Freighter Connection Issues

### "Freighter not detected"

**Symptoms:**
- Extension appears not installed
- Connection attempts fail silently

**Solutions:**
1. Install Freighter from https://freighter.app
2. Enable the extension in browser settings
3. Check you're using the correct browser profile
4. Refresh the page after installation

**Code Check:**
```tsx
const { isInstalled } = useFreighter()

if (!isInstalled) {
  return (
    <div>
      <p>Freighter wallet not detected. Please install it from freighter.app</p>
      <a href="https://freighter.app" target="_blank">Install Freighter</a>
    </div>
  )
}
```

### Connection Timeout

**Symptoms:**
- App hangs on "Connecting..."
- Loading spinner never resolves

**Solutions:**
1. Add timeout handling
2. Check for iframe restrictions
3. Verify extension permissions

```tsx
const { isLoading, isInstalled } = useFreighter()

useEffect(() => {
  if (isLoading && !isInstalled) {
    const timeout = setTimeout(() => {
      console.warn('Freighter detection taking longer than expected')
    }, 5000)
    return () => clearTimeout(timeout)
  }
}, [isLoading, isInstalled])
```

## Network Issues

### Network Mismatch

**Symptoms:**
- Transaction signing fails
- Network warning displayed

**Solutions:**
1. Switch wallet to correct network
2. Update provider configuration
3. Use network mismatch detection

```tsx
const { networkPassphraseMismatch, networkPassphraseWarning } = useFreighter()

if (networkPassphraseMismatch) {
  return (
    <div style={{ color: 'red', padding: '1rem' }}>
      <h3>Network Mismatch</h3>
      <p>{networkPassphraseWarning}</p>
    </div>
  )
}
```

### Horizon API Errors

**Symptoms:**
- Account data fails to load
- Transaction submission fails

**Solutions:**
1. Check network status at https://status.stellar.org
2. Verify Horizon URL configuration
3. Implement retry logic

```tsx
const { error, refetch } = useStellarAccount(publicKey)

if (error?.type === 'network') {
  return (
    <div>
      <p>Network error. Please check your connection.</p>
      <button onClick={() => refetch()}>Retry</button>
    </div>
  )
}
```

## Transaction Issues

### Insufficient Balance

**Symptoms:**
- Transaction submission fails
- "Insufficient balance" error

**Solutions:**
1. Check balance before transaction
2. Fund testnet account via Friendbot
3. Display balance to user

```tsx
const { xlmBalance } = useStellarBalance(publicKey)

const handlePayment = async () => {
  const balance = parseFloat(xlmBalance?.balance || '0')
  if (balance < parseFloat(amount) + 0.00001) {
    alert('Insufficient balance')
    return
  }
  await payment.submit()
}
```

### Invalid Destination

**Symptoms:**
- Payment fails with invalid address error
- Transaction simulation fails

**Solutions:**
1. Validate address format
2. Check if account exists
3. Use address validation utilities

```tsx
import { asPublicKey } from 'stellar-hooks'

const validateAddress = (address: string): boolean => {
  try {
    asPublicKey(address)
    return true
  } catch {
    return false
  }
}
```

## Soroban Issues

### Contract Not Found

**Symptoms:**
- Contract simulation fails
- "Contract not found" error

**Solutions:**
1. Verify contract ID format
2. Check contract exists on network
3. Ensure correct network selection

```tsx
import { asContractId } from 'stellar-hooks'

const validateContractId = (contractId: string): boolean => {
  try {
    asContractId(contractId)
    return true
  } catch {
    return false
  }
}
```

### Simulation Failed

**Symptoms:**
- Contract call fails before submission
- Resource estimation error

**Solutions:**
1. Check contract method exists
2. Validate arguments
3. Check authorization requirements

```tsx
const { simulate, call } = useSorobanContract({...})

const handleCall = async () => {
  const simulation = await simulate()
  if (simulation.error) {
    console.error('Simulation failed:', simulation.error)
    return
  }
  await call()
}
```

## Build Issues

### Module Not Found

**Symptoms:**
- Import errors
- "Cannot find module 'stellar-hooks'"

**Solutions:**
1. Install the package: `npm install stellar-hooks`
2. Check import paths
3. Verify package.json dependencies

```bash
npm install stellar-hooks
```

### TypeScript Errors

**Symptoms:**
- Type errors in IDE
- Compilation fails

**Solutions:**
1. Install types: `npm install @types/react @types/react-dom`
2. Check TypeScript configuration
3. Ensure correct import paths

## Development Issues

### Hot Reload Not Working

**Symptoms:**
- Changes not reflected in development
- Need to manually refresh

**Solutions:**
1. Check development server configuration
2. Verify Vite/Webpack setup
3. Clear browser cache

### Port Already in Use

**Symptoms:**
- Development server fails to start
- "Port already in use" error

**Solutions:**
1. Kill process using the port
2. Use different port
3. Check for background processes

```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F
```

## Getting Help

If you're still stuck:

1. **Check the documentation:**
   - [API Reference](/hooks/)
   - [Guides](/guide/)

2. **Search existing issues:**
   - [GitHub Issues](https://github.com/dark-princezz/stellar-hooks/issues)

3. **Ask in Discussions:**
   - [GitHub Discussions](https://github.com/dark-princezz/stellar-hooks/discussions)

4. **Open an issue:**
   - Use the [bug report template](https://github.com/dark-princezz/stellar-hooks/issues/new?template=bug_report.yml)
   - Include reproduction steps and environment info

5. **Check network status:**
   - [Stellar Status Page](https://status.stellar.org)

---

## Freighter Connection Error Reference

This section documents known Freighter connection error codes and messages with their solutions.

### Installation & Detection Errors

#### "Freighter not installed"

**Error Message:**
```
Install Freighter to connect — https://freighter.app
Freighter not installed
Extension not found
```

**Cause:**
The Freighter extension is not installed in the browser.

**Solutions:**
1. Visit https://freighter.app and install the extension
2. Restart your browser after installation
3. Refresh your application page
4. For browser profiles: ensure Freighter is installed in the current profile

**Code Example:**
```tsx
const { isInstalled } = useFreighter()

if (!isInstalled) {
  return (
    <div>
      <p>Freighter wallet not detected.</p>
      <a href="https://freighter.app" target="_blank">
        Install Freighter
      </a>
    </div>
  )
}
```

#### "Extension not found" (code: -1)

**Error Message:**
```
Extension not found
```

**Cause:**
The extension API is not available, even though the extension may be installed.

**Solutions:**
1. Check if Freighter is enabled in browser extensions
2. Try disabling and re-enabling the extension
3. Check for extension updates
4. Verify you're on the correct browser profile

---

### Connection & Permission Errors

#### "User rejected" / "User denied" / "User cancelled"

**Error Message:**
```
User rejected
User denied
User cancelled
User declined
Request declined by user
```

**Cause:**
The user explicitly rejected the connection request in Freighter.

**Solutions:**
1. This is expected behavior when users cancel
2. Don't show error messages to users for this case
3. Use `UserRejectedError` to detect this condition
4. Allow users to try connecting again

**Code Example:**
```tsx
import { useFreighter, UserRejectedError } from 'stellar-hooks'

const { connect, isConnected } = useFreighter()

const handleConnect = async () => {
  try {
    await connect()
  } catch (err) {
    if (err instanceof UserRejectedError) {
      console.log('Connection was cancelled')
      // Don't show error, just let user try again
      return
    }
    console.error('Connection error:', err)
    // Show error to user
  }
}
```

#### "Access denied" / "Permission denied"

**Error Message:**
```
Access denied
Permission denied
```

**Cause:**
The user denied the connection request or revoked permissions.

**Solutions:**
1. This indicates user rejection - handle gracefully
2. Provide clear UI feedback that connection is required
3. Don't retry automatically (user intervention needed)

---

### Network & Configuration Errors

#### "Network mismatch" / "Network does not match"

**Error Message:**
```
Freighter is connected to TESTNET, which does not match this app's configured network (Public Global Stellar Network ; September 2015). Switch the network in Freighter or update your StellarProvider configuration to avoid signing on the wrong network.
```

**Cause:**
The Freighter wallet is connected to a different Stellar network than your app expects.

**Solutions:**
1. Switch Freighter to the correct network
2. Or update `StellarProvider network` prop to match wallet
3. Use `networkPassphraseWarning` to show the mismatch

**Code Example:**
```tsx
const { 
  networkPassphraseMismatch,
  networkPassphraseWarning,
  connect,
  disconnect 
} = useFreighter()

if (networkPassphraseMismatch) {
  return (
    <div style={{ backgroundColor: '#fef2f2', padding: '1rem' }}>
      <h4>⚠️ Network Mismatch</h4>
      <p>{networkPassphraseWarning}</p>
      <button onClick={disconnect}>Switch Wallet Network</button>
    </div>
  )
}
```

---

### Transaction Signing Errors

#### "Transaction rejected"

**Error Message:**
```
Transaction rejected
Transaction cancelled by user
```

**Cause:**
User rejected the transaction signing request in Freighter.

**Solutions:**
1. This is normal - user chose not to sign
2. Use `UserRejectedError` to detect and handle
3. Don't charge fees for rejected transactions

**Code Example:**
```tsx
const { signTransaction } = useFreighter()

try {
  const signed = await signTransaction(xdr)
  // Submit signed transaction
} catch (err) {
  if (err instanceof UserRejectedError) {
    console.log('Transaction signing cancelled')
    return
  }
  // Handle real errors
  throw err
}
```

#### "Invalid transaction XDR"

**Error Message:**
```
Invalid transaction XDR
Failed to decode as TransactionEnvelope
```

**Cause:**
The transaction XDR is malformed or invalid.

**Solutions:**
1. Verify transaction building logic
2. Check transaction has required operations
3. Ensure fee is set correctly
4. Validate sequence number

---

### Auto-Connect Errors

#### "isAllowed check failed"

**Error Message:**
```
isAllowed check failed
```

**Cause:**
The auto-connect feature cannot verify if the app has permission to connect.

**Solutions:**
1. Ensure Freighter is properly installed
2. Check browser console for extension errors
3. Try manual connect to reset state
4. Verify app is on allowed origins list

**Code Example:**
```tsx
const { isAutoConnecting, error } = useFreighter({ autoConnect: true })

if (isAutoConnecting) return <LoadingSpinner />

if (error) {
  console.error('Auto-connect failed:', error)
  // Fall back to manual connect
}
```

---

### Timeouts & Performance Issues

#### "Connection timeout"

**Error Message:**
```
Connection timeout
```

**Cause:**
Freighter didn't respond within the expected timeframe.

**Solutions:**
1. Check browser performance
2. Close other tabs using Freighter
3. Restart browser
4. Check for browser extension conflicts

**Code Example:**
```tsx
const { isLoading, isInstalled } = useFreighter()

useEffect(() => {
  if (isLoading && !isInstalled) {
    const timeout = setTimeout(() => {
      console.warn('Freighter detection taking longer than expected')
    }, 5000)
    return () => clearTimeout(timeout)
  }
}, [isLoading, isInstalled])
```

---

### General Debugging Tips

1. **Check Freighter Version**: Ensure you're using a recent version of Freighter
2. **Browser Console**: Check browser developer console for extension errors
3. **Network Tab**: Look for failed requests to Freighter APIs
4. **Extension Settings**: Verify Freighter has required permissions
5. **Test Page**: Create a minimal test page to isolate the issue

### Getting Help

If you're still stuck:

1. **Check Freighter Status**: https://status.stellar.org
2. **Freighter Support**: https://freighter.app/support
3. **GitHub Issues**: https://github.com/dark-princezz/stellar-hooks/issues
4. **Discussions**: https://github.com/dark-princezz/stellar-hooks/discussions