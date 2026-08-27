"use client";

import { StellarProvider } from "stellar-hooks";
import type { ReactNode } from "react";

const NETWORK = "testnet";

// This component is a Client Component. It must be, because StellarProvider
// manages wallet/network state on the client. Wrapping it here draws a clear
// boundary: server components above stay server-rendered, and every component
// that calls a stellar-hooks hook must be (or descend from) a "use client"
// component.
export function StellarWalletProvider({ children }: { children: ReactNode }) {
  return <StellarProvider network={NETWORK}>{children}</StellarProvider>;
}
