---
layout: home

hero:
  name: stellar-hooks
  tagline: React hooks for Stellar and Soroban. The wagmi you've been waiting for.
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/spiffamani/stellar-hooks

features:
  - icon: 🔗
    title: Freighter Integration
    details: Seamlessly connect and interact with the Freighter wallet. Handle wallet connection, account switching, and transaction signing with a single hook.
  - icon: 📊
    title: Horizon Data Fetching
    details: Easy access to account balances, offers, transactions, and more through simple React hooks. Includes built-in polling and caching.
  - icon: 🚀
    title: Soroban Support
    details: Call smart contracts with built-in simulation, auth handling, and status polling. Full TypeScript support for contract interactions.
  - icon: ⚡
    title: Type-Safe
    details: Written in TypeScript with full type definitions. Get autocomplete and type checking for all hook parameters and return values.
---

## Quick Start

Install the package:

```bash
npm install stellar-hooks
```

Wrap your app with the provider:

```tsx
import { StellarProvider } from "stellar-hooks";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StellarProvider network="testnet">
    <App />
  </StellarProvider>
);
```

Use hooks in your components:

```tsx
import { useFreighter, useStellarBalance } from "stellar-hooks";

export function App() {
  const { isConnected, publicKey, connect } = useFreighter();
  const { xlmBalance } = useStellarBalance(publicKey);

  if (!isConnected) {
    return <button onClick={connect}>Connect Freighter</button>;
  }

  return (
    <p>
      {publicKey} · {xlmBalance?.balance ?? "..."} XLM
    </p>
  );
}
```

## What's Included

- **Wallet Management** — Connect to Freighter, sign transactions, handle account switches
- **Account Queries** — Fetch balances, offers, and account data with automatic polling
- **Transaction Helpers** — Send payments, path payments, and custom transactions
- **Soroban Integration** — Call smart contracts, query ledger entries, read SAC token balances
- **Metadata Resolution** — Fetch stellar.toml files and resolve asset metadata
- **React Query & SWR Adapters** — Drop-in replacements for existing data-fetching setups

## Next Steps

- [Read the Getting Started guide](/getting-started)
- [Browse the API reference](/api/provider)
- [Learn the error handling patterns](/guides/error-handling)
- [Check out the migration guide](/guides/migration-guide)
