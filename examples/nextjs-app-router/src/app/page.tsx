import { WalletConnect } from "@/components/wallet-connect";

// This page is a Server Component -- no `"use client"` directive and no
// stellar-hooks imports. It can render static content and freely read server
// resources (env, databases, filesystem). Hooks are reached only through the
// client `<WalletConnect />` component beneath it.
export default function Home() {
  return (
    <main>
      <h1>stellar-hooks · App Router</h1>
      <p>
        Minimal example of the correct client/server boundary. This page and the
        layout are Server Components; the wallet hook lives inside a client
        component.
      </p>
      <section>
        <h2>Wallet</h2>
        <WalletConnect />
      </section>
    </main>
  );
}
