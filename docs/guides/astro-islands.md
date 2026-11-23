# Astro islands integration

stellar-hooks are React hooks, so they must run inside a client-hydrated React island in Astro.

## Install

```bash
npm i stellar-hooks @stellar/stellar-sdk react react-dom
```

## React island

```tsx
// src/components/WalletIsland.tsx
import { StellarProvider, useFreighter } from 'stellar-hooks';

function Wallet() {
  const { isConnected, connect, publicKey } = useFreighter();
  return isConnected ? <p>{publicKey}</p> : <button onClick={connect}>Connect</button>;
}

export default function WalletIsland() {
  return <StellarProvider network="testnet"><Wallet /></StellarProvider>;
}
```

## Astro page

```astro
---
import WalletIsland from '../components/WalletIsland';
---
<WalletIsland client:only="react" />
```

## Hydration directive

- Use `client:only="react"` for wallet hooks that depend on browser APIs at render.
- `client:load` can work if the component guards browser-only APIs.
- Avoid `client:idle`/`client:visible` for connect buttons that users expect immediately.

## Notes
- Provide `StellarProvider` inside the island or at a higher client-only boundary.
- Do not call hooks during Astro server rendering.
