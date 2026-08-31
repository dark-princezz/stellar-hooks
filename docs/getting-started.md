# Getting Started

Learn how to install and configure `stellar-hooks` in your React application.

## Prerequisites

- **Node.js** ≥ 18.0.0
- **React** ≥ 18.0.0
- **React DOM** ≥ 18.0.0
- **Freighter wallet** — [Install from freighter.app](https://freighter.app) (for wallet-connected features)
- **Stellar testnet XLM** — Get test XLM from the [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test) for trying transactions

## Installation

Install the package via npm:

```bash
npm install stellar-hooks
```

The library ships with `@stellar/stellar-sdk` v13 and `@stellar/freighter-api` v2 as direct dependencies — you don't need to install them separately unless you need a different version.

## Provider Setup

Wrap your app (or the relevant subtree) with `<StellarProvider>` to configure the network. Every hook inside reads this configuration automatically.

```tsx
// main.tsx
import ReactDOM from "react-dom/client";
import { StellarProvider } from "stellar-hooks";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StellarProvider network="testnet">
    <App />
  </StellarProvider>
);
```

###Built-in Networks

| Network | Description |
|---|---|
| `testnet` (default) | Stellar test network — safe for development |
| `mainnet` | Stellar production network — real XLM |
| `futurenet` | Stellar experimental network — bleeding edge features |
| `custom` | Your own Stellar deployment — requires `customConfig` prop |

### Custom Networks

For detailed information on custom RPC and Horizon endpoint configuration, see the [RPC Endpoint Configuration](/guides/rpc-endpoint-configuration) guide.

For private or self-hosted Stellar networks, use `network="custom"` and provide full configuration:

```tsx
<StellarProvider
  network="custom"
  customConfig={{
    network: "custom",
    horizonUrl: "https://my-horizon.example.com",
    sorobanRpcUrl: "https://my-rpc.example.com",
    networkPassphrase: "My Network ; 2024",
  }}
>
  <App />
</StellarProvider>
```

## Quick Start Example

Here's a complete minimal example showing wallet connection and balance display:

```tsx
// App.tsx
import { useFreighter, useStellarBalance } from "stellar-hooks";

export function App() {
  const { isInstalled, isConnected, publicKey, connect, disconnect } = useFreighter();
  const { xlmBalance, isLoading } = useStellarBalance(publicKey);

  // Check if Freighter is installed
  if (!isInstalled) {
    return (
      <div>
        <p>Please install Freighter wallet to continue.</p>
        <a href="https://freighter.app" target="_blank" rel="noopener noreferrer">
          Get Freighter
        </a>
      </div>
    );
  }

  // Show connect button if not connected
  if (!isConnected) {
    return <button onClick={connect}>Connect Freighter</button>;
  }

  // Show account info when connected
  return (
    <div>
      <p>
        <strong>Account:</strong> {publicKey}
      </p>
      <p>
        <strong>XLM Balance:</strong>{" "}
        {isLoading ? "Loading..." : xlmBalance?.balance ?? "0"}
      </p>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}
```

## What's Next?

- **Explore the API** — Browse hook-by-hook reference starting with [useFreighter](/api/hooks/use-freighter)
- **Send a payment** — Learn how to use [usePayment](/api/hooks/use-payment) to transfer XLM
- **Call a contract** — See [useSorobanContract](/api/hooks/use-soroban-contract) for smart contract interactions
- **Migrate existing code** — Check the [Migration Guide](/guides/migration-guide) to replace raw SDK patterns with hooks

## Common Patterns

### Polling for Updates

Many hooks accept a `refetchInterval` option (in milliseconds) to automatically refresh data:

```tsx
const { data } = useStellarAccount(publicKey, {
  refetchInterval: 5000, // Re-fetch every 5 seconds
});
```

### Conditional Fetching

Use the `enabled` option to control when data is fetched:

```tsx
const { data } = useStellarAccount(publicKey, {
  enabled: !!publicKey, // Only fetch when publicKey is available
});
```

### Error Handling

All hooks return an `error` property:

```tsx
const { data, error, isLoading } = useStellarAccount(publicKey);

if (isLoading) return <p>Loading...</p>;
if (error) return <p>Error: {error.message}</p>;
return <p>Sequence: {data?.sequence}</p>;
```

## TypeScript Support

All hooks are fully typed. Import types alongside the hooks:

```tsx
import { useStellarAccount } from "stellar-hooks";
import type { StellarAccountData } from "stellar-hooks";

function Component() {
  const { data } = useStellarAccount(publicKey);
  // data is typed as StellarAccountData | null
}
```

See the [Provider & Context](/api/provider) page for a complete type reference.
