# Soroban Contract Dashboard

A Vite + React example demonstrating `useSorobanContract` for building a simple read/write contract dashboard.

## Features

- Connect to Freighter wallet on Soroban testnet
- Interact with Soroban smart contracts
- Read contract state (get_count)
- Write to contract (increment, decrement)
- Handle loading states, errors, and success states
- Beautiful, responsive UI with dark theme

## Setup

```bash
cd examples/soroban-dashboard
npm install
```

## Run

```bash
npm run dev
```

The app will be available at `http://localhost:3001`

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

### 3. Contract Read Operation

Uses `useSorobanContract` with the `query` method for read-only operations:

```tsx
const readContract = useSorobanContract<number>({
  contractId: contractId,
  method: "get_count",
  args: [],
  parseResult: (scVal) => scVal.u32().toNumber(),
});

// Read without signing
await readContract.query();
```

### 4. Contract Write Operations

Uses `useSorobanContract` with the `call` method for state-changing operations:

```tsx
const incrementContract = useSorobanContract<number>({
  contractId: contractId,
  method: "increment",
  args: [xdr.ScVal.scvU32(amount)],
  parseResult: (scVal) => scVal.u32().toNumber(),
});

// Write with wallet signing
await incrementContract.call();
```

## Testing the Example

### 1. Deploy a Counter Contract

First, deploy a simple counter contract on Soroban testnet. You can use the Stellar Soroban CLI or a contract deployment tool.

Example counter contract interface:
- `get_count()` - Returns the current counter value
- `increment(amount: u32)` - Increments the counter by amount
- `decrement(amount: u32)` - Decrements the counter by amount

### 2. Install Freighter

https://freighter.app

### 3. Set to Testnet

Open Freighter and switch to testnet.

### 4. Fund Account

Use https://friendbot.stellar.org to get testnet XLM for transaction fees.

### 5. Connect

Click "Connect Freighter" in the app.

### 6. Enter Contract ID

Enter your deployed contract ID in the input field.

### 7. Read Contract State

Click "Get Count" to read the current counter value.

### 8. Write to Contract

Enter an amount and click "Increment" or "Decrement" to modify the contract state.

## Key Concepts Demonstrated

- **Contract Interaction**: Reading and writing to Soroban contracts
- **XDR Encoding**: Using `@stellar/stellar-sdk` to encode arguments as ScVal
- **Result Parsing**: Converting ScVal results to JavaScript types
- **Read vs Write Operations**: Using `query()` for reads and `call()` for writes
- **Transaction Signing**: Automatic wallet signing for write operations
- **Simulation**: Built-in simulation before transaction submission
- **Error Handling**: Network errors, contract errors, user rejection
- **Loading States**: Showing progress during async operations

## Customization

### Change Contract Methods

Edit the contract calls in `src/App.tsx`:

```tsx
const readContract = useSorobanContract<number>({
  contractId: contractId,
  method: "your_method_name",
  args: [xdr.ScVal.scvString("your_arg")],
  parseResult: (scVal) => scVal.str().toString(),
});
```

### Add More Operations

```tsx
const customContract = useSorobanContract({
  contractId: contractId,
  method: "custom_method",
  args: [xdr.ScVal.scvU32(123)],
  parseResult: (scVal) => /* your parsing logic */,
});

await customContract.call();
```

### Change Network

```tsx
// Change to mainnet
<StellarProvider network="mainnet">
```

### Custom Soroban RPC

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

## XDR Encoding Examples

### Integer

```tsx
import { xdr } from "@stellar/stellar-sdk";

args: [xdr.ScVal.scvU32(123)]
```

### String

```tsx
args: [xdr.ScVal.scvString("hello")]
```

### Boolean

```tsx
args: [xdr.ScVal.scvBool(true)]
```

### Address

```tsx
args: [xdr.ScVal.scvAddress(
  xdr.ScAddress.scAddressTypeAccount(xdr.PublicKey.publicKeyTypeEd25519()),
  Buffer.from("G...", "hex")
)]
```

### Bytes

```tsx
args: [xdr.ScVal.scvBytes(Buffer.from("data"))]
```

## Result Parsing Examples

### Integer

```tsx
parseResult: (scVal) => scVal.u32().toNumber()
```

### String

```tsx
parseResult: (scVal) => scVal.str().toString()
```

### Boolean

```tsx
parseResult: (scVal) => scVal.b()
```

### Bytes

```tsx
parseResult: (scVal) => scVal.bytes().toString()
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

**Contract not found:**
- Verify the contract ID is correct
- Ensure the contract is deployed on testnet
- Check your network configuration matches the contract's network

**Read operation fails:**
- Ensure the method name is correct
- Check that arguments are properly encoded as ScVal
- Verify the contract method exists

**Write operation fails:**
- Ensure your account has sufficient XLM for fees
- Check that the wallet is connected
- Verify the method name and arguments are correct
- Check if the contract requires authorization

**Simulation fails:**
- Check the simulation error message in the console
- Verify arguments are correctly encoded
- Ensure the contract method signature matches

## Learn More

- [Quick Start Guide](../../QUICKSTART.md)
- [API Reference](../../docs/HOOKS.md)
- [Troubleshooting Guide](../../TROUBLESHOOTING.md)
- [Soroban Documentation](https://developers.stellar.org/docs/build/smart-contracts/)
- [Stellar SDK](https://stellar.github.io/js-stellar-sdk/)

## Contract Deployment Resources

- [Soroban CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup)
- [Soroban Example Contracts](https://github.com/stellar/soroban-examples)
- [Soroban RPC Documentation](https://developers.stellar.org/docs/data/rpc/)
