---
layout: home

hero:
  name: stellar-hooks
  text: React hooks for Stellar and Soroban
  tagline: useFreighter, useStellarAccount, useSorobanContract, useTransaction, and more.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/introduction
    - theme: alt
      text: View on GitHub
      link: https://github.com/dark-princezz/stellar-hooks
  image:
    src: /stellar-logo.svg
    alt: Stellar Hooks

features:
  - icon: ⚡
    title: Simple & Declarative
    details: React hooks that make Stellar development feel like web development. No more boilerplate.
  - icon: 🔌
    title: Multi-Wallet Support
    details: Built-in support for Freighter, Albedo, xBull, Rabet, and more with a unified interface.
  - icon: 🔧
    title: Full Stellar SDK
    details: Complete access to Stellar and Soroban functionality through familiar React patterns.
  - icon: 📡
    title: Auto-Syncing
    details: Automatic data fetching, caching, and real-time updates with minimal configuration.
  - icon: 🛡️
    title: Type-Safe
    details: Full TypeScript support with branded types for addresses, contract IDs, and XDR.
  - icon: 🧪
    title: Well-Tested
    details: Comprehensive test coverage and integration tests for reliable production use.

---

## What is stellar-hooks?

`stellar-hooks` is a React hooks library that provides a declarative interface for building Stellar and Soroban applications. It abstracts away the complexity of the Stellar SDK and wallet integrations, letting you focus on building great user experiences.

## Key Features

- **Wallet Integration**: One-line setup for Freighter, Albedo, xBull, Rabet, and other wallets
- **Account Management**: Easy access to account data, balances, and operations
- **Transaction Building**: Simplified payment, path payment, and custom transaction flows
- **Soroban Support**: Smart contract interaction with simulation, signing, and submission
- **Network Management**: Seamless switching between testnet, mainnet, and custom networks
- **Real-time Updates**: Built-in polling and caching for live data

## Quick Example

```tsx
import { StellarProvider, useFreighter, useStellarBalance } from 'stellar-hooks';

function App() {
  const { isConnected, publicKey, connect } = useFreighter();
  const { xlmBalance } = useStellarBalance(publicKey);

  if (!isConnected) {
    return <button onClick={connect}>Connect Wallet</button>;
  }

  return (
    <div>
      <p>Connected: {publicKey}</p>
      <p>Balance: {xlmBalance?.balance ?? '0'} XLM</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StellarProvider network="testnet">
    <App />
  </StellarProvider>
);
```

## Installation

```bash
npm install stellar-hooks
```

## Community



## Guides
- [Wagmi-Inspired Design Philosophy](./guides/wagmi-design-philosophy.md)
