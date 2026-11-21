"use client";

import React from "react";
import { StellarProvider } from "stellar-hooks";

export function Providers({ children }: { children: React.ReactNode }) {
  return <StellarProvider network="testnet">{children}</StellarProvider>;
}
