# Next.js App Router Example

A minimal example showing how to use **stellar-hooks** with the Next.js **App Router**, and in particular how to respect the **client/server boundary**.

## Why this example exists

The App Router lets you mark files as **Server Components** (the default) or **Client Components** (with a leading `"use client"` directive). stellar-hooks hooks are built on browser-only APIs — `window`, wallet extensions (Freighter), and live network calls — so **they can only run inside Client Components**.

This example draws that boundary precisely:

```
src/app/
├── layout.tsx                      # Server Component (metadata, html/body)
├── page.tsx                        # Server Component (static page shell)
└── components/
    ├── stellar-provider.tsx        # "use client" → mounts <StellarProvider>
    └── wallet-connect.tsx          # "use client" → calls useFreighter
```

The pattern in four rules:

1. **Keep `layout.tsx` and `page.tsx` as Server Components** unless they genuinely need interactivity. Static shell and `metadata` stay on the server.
2. **Mount `StellarProvider` from a client component.** The provider owns wallet/network state, so it must live on the client. The server `layout` wraps `<StellarWalletProvider>` (a client component) around the page tree.
3. **Call hooks only from client components.** Every component that invokes a stellar-hooks hook needs a `"use client"` directive. `wallet-connect.tsx` demonstrates this with `useFreighter`.
4. **Pass data down, never pass components up.** Server components render static props; client components receive `children` or serializable props.

### Runtime behavior

- `page.tsx` renders on the server, then hands off to the client `WalletConnect`.
- `WalletConnect` runs `useFreighter` on the client only, listening for the wallet extension.
- There is no `window` access on the server, so there are no hydration SSR guards to write manually.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Install the [Freighter](https://freighter.app) browser extension and click **Connect Freighter** to see the hook stream wallet state.

## Other scripts

- `npm run build` — production build (server + client bundles)
- `npm start` — serve the production build
- `npm run lint` — lint the example

## Files

| File | What it demonstrates |
|---|---|
| `src/app/layout.tsx` | Server Component metadata + client provider boundary |
| `src/app/page.tsx` | Server Component page shell that composes a client hook component |
| `src/components/stellar-provider.tsx` | Client component wrapping `<StellarProvider>` |
| `src/components/wallet-connect.tsx` | Client component calling `useFreighter` |
