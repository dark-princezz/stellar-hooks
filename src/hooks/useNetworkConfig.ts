import { useOptionalStellarContext } from "../context";
import type { NetworkConfig } from "../types";

/**
 * Read the full active network configuration object from the provider context.
 *
 * This hook provides direct access to the complete network configuration including
 * network name, passphrase, Horizon URL, and Soroban RPC URL. It's useful when
 * you need the full configuration object rather than individual values.
 *
 * @returns Complete network configuration object
 * @returns {string} returns.network - Network name: "testnet" | "mainnet" | "futurenet" | "custom"
 * @returns {string} returns.networkPassphrase - Network passphrase for transaction signing
 * @returns {string} returns.horizonUrl - Horizon REST API endpoint
 * @returns {string} returns.sorobanRpcUrl - Soroban RPC endpoint
 *
 * @throws {Error} If used outside of StellarProvider context
 *
 * @example
 * ```tsx
 * const config = useNetworkConfig();
 *
 * console.log('Current network:', config.network);
 * console.log('Horizon URL:', config.horizonUrl);
 * console.log('RPC URL:', config.sorobanRpcUrl);
 * ```
 */
export function useNetworkConfig(): NetworkConfig {
  const ctx = useOptionalStellarContext();

  if (!ctx) {
    throw new Error("[stellar-hooks] useNetworkConfig must be used inside <StellarProvider>.");
  }

  return ctx.config;
}
