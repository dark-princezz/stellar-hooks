# Soroban RPC Endpoint Configuration

This guide explains how to configure custom RPC and Horizon endpoints for testnet, futurenet, mainnet, or your own custom network.

## Quick Start

By default, stellar-hooks uses the official SDF endpoints for each network:

| Network | Horizon URL | Soroban RPC URL |
|---|---|---|
| `mainnet` | `https://horizon.stellar.org` | `https://mainnet.sorobanrpc.com` |
| `testnet` | `https://horizon-testnet.stellar.org` | `https://soroban-testnet.stellar.org` |
| `futurenet` | `https://horizon-futurenet.stellar.org` | `https://rpc-futurenet.stellar.org` |

To use these default endpoints, simply specify the network:

```tsx
import { StellarProvider } from "stellar-hooks";

function App() {
  return (
    <StellarProvider network="testnet">
      <MyApp />
    </StellarProvider>
  );
}
```

## Custom Endpoint Configuration

### Using Custom URLs

If you want to point to custom RPC or Horizon endpoints (for example, a private deployment or a different provider), use the `customConfig` prop with `network="custom"`:

```tsx
import { StellarProvider } from "stellar-hooks";

function App() {
  return (
    <StellarProvider
      network="custom"
      customConfig={{
        network: "custom",
        horizonUrl: "https://horizon.my-private-network.com",
        sorobanRpcUrl: "https://rpc.my-private-network.com",
        networkPassphrase: "My Private Network ; 2024",
      }}
    >
      <MyApp />
    </StellarProvider>
  );
}
```

### Overriding Individual Endpoints

You can override individual endpoints (Horizon, RPC, or passphrase) for any network by using `StellarHooksProvider` directly:

```tsx
import { StellarHooksProvider } from "stellar-hooks";

function App() {
  return (
    <StellarHooksProvider
      network="testnet"
      horizonUrl="https://my-custom-horizon.example.com"
      sorobanRpcUrl="https://my-custom-rpc.example.com"
    >
      <MyApp />
    </StellarHooksProvider>
  );
}
```

When you override endpoints this way, the network automatically switches to `"custom"` internally.

### Runtime Network Selection

For apps that need to switch between networks at runtime (e.g., a development tool or wallet), use `useNetwork`:

```tsx
import { useState } from "react";
import { StellarProvider, useNetwork } from "stellar-hooks";

function NetworkSelector() {
  const { network, switchNetwork } = useNetwork();

  return (
    <div>
      <select
        value={network}
        onChange={(e) => switchNetwork(e.target.value as any)}
      >
        <option value="mainnet">Mainnet</option>
        <option value="testnet">Testnet</option>
        <option value="futurenet">Futurenet</option>
      </select>
    </div>
  );
}

function App() {
  return (
    <StellarProvider network="testnet">
      <NetworkSelector />
      <MyApp />
    </StellarProvider>
  );
}
```

### Custom Network with Runtime Switching

To support custom networks in a runtime switcher:

```tsx
import { useState } from "react";
import { StellarProvider, useNetwork, useStellarContext } from "stellar-hooks";

function CustomNetworkForm() {
  const { switchNetwork, config } = useNetwork();
  const [customUrl, setCustomUrl] = useState(config.horizonUrl);

  const handleSwitchToCustom = () => {
    switchNetwork("custom", {
      network: "custom",
      horizonUrl: customUrl,
      sorobanRpcUrl: customUrl.replace("/horizon", "/rpc"),
      networkPassphrase: "Custom Network ; 2024",
    });
  };

  return (
    <div>
      <input
        type="url"
        value={customUrl}
        onChange={(e) => setCustomUrl(e.target.value)}
        placeholder="https://horizon.my-network.com"
      />
      <button onClick={handleSwitchToCustom}>
        Switch to Custom Network
      </button>
    </div>
  );
}

function App() {
  return (
    <StellarProvider network="testnet">
      <CustomNetworkForm />
      <MyApp />
    </StellarProvider>
  );
}
```

## Environment Variables

For build-time configuration, you can use environment variables:

```tsx
// .env
VITE_STELLAR_NETWORK=testnet
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_RPC_URL=https://soroban-testnet.stellar.org
VITE_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

// App.tsx
import { createRoot } from "react-dom/client";
import { StellarProvider } from "stellar-hooks";
import App from "./App";

const root = createRoot(document.getElementById("root")!);

const network = import.meta.env.VITE_STELLAR_NETWORK;
const isCustom = network === "custom";

root.render(
  <StellarProvider
    network={network as any}
    customConfig={
      isCustom
        ? {
            network: "custom",
            horizonUrl: import.meta.env.VITE_HORIZON_URL,
            sorobanRpcUrl: import.meta.env.VITE_RPC_URL,
            networkPassphrase: import.meta.env.VITE_NETWORK_PASSPHRASE,
          }
        : undefined
    }
  >
    <App />
  </StellarProvider>
);
```

## Using Custom Endpoints with Hooks

Once configured, all hooks automatically use your custom endpoints:

```tsx
import { useStellarAccount, useSorobanContract } from "stellar-hooks";

function MyComponent() {
  // This will use your configured horizonUrl
  const { account, error, isLoading } = useStellarAccount("GABC...");

  // This will use your configured sorobanRpcUrl
  const { read, error: contractError } = useSorobanContract({
    contractId: "CA...",
    methodName: "balance",
  });

  // ...
}
```

## Verifying Your Configuration

You can inspect the active configuration using `useNetworkConfig`:

```tsx
import { useNetworkConfig } from "stellar-hooks";

function ConfigMonitor() {
  const config = useNetworkConfig();

  return (
    <pre>
      {JSON.stringify(
        {
          network: config.network,
          horizonUrl: config.horizonUrl,
          sorobanRpcUrl: config.sorobanRpcUrl,
          networkPassphrase: config.networkPassphrase,
        },
        null,
        2
      )}
    </pre>
  );
}
```

## Default Endpoints Reference

### Mainnet
- **Horizon**: `https://horizon.stellar.org`
- **Soroban RPC**: `https://mainnet.sorobanrpc.com`
- **Passphrase**: `Public Global Stellar Network ; September 2015`

### Testnet
- **Horizon**: `https://horizon-testnet.stellar.org`
- **Soroban RPC**: `https://soroban-testnet.stellar.org`
- **Passphrase**: `Test SDF Network ; September 2015`

### Futurenet
- **Horizon**: `https://horizon-futurenet.stellar.org`
- **Soroban RPC**: `https://rpc-futurenet.stellar.org`
- **Passphrase**: `Test SDF Future Network ; October 2022`

## See Also

- [Network Switching & Mismatch Handling](/guides/network-switching) — How app and wallet networks interact
- [Provider Setup](/api/provider) — `StellarProvider` and `StellarHooksProvider` props
- [useNetwork](/hooks/use-network) — Runtime network switching
- [useNetworkConfig](/hooks/use-network-config) — Read full network configuration