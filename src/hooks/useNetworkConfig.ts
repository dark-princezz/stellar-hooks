import { useOptionalStellarContext } from "../context";
import type { NetworkConfig } from "../types";

export function useNetworkConfig(): NetworkConfig {
  const ctx = useOptionalStellarContext();

  if (!ctx) {
    throw new Error("[stellar-hooks] useNetworkConfig must be used inside <StellarProvider>.");
  }

  return ctx.config;
}
