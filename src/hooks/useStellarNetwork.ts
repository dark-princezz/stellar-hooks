import { useCallback } from "react";
import { useStellarContext } from "../context";
import type { StellarNetwork, CustomNetworkConfig, NetworkConfig } from "../types";

export interface UseStellarNetworkReturn {
  network: StellarNetwork;
  networkPassphrase: string;
  horizonUrl: string;
  sorobanRpcUrl: string;
  config: NetworkConfig;
  setNetwork: (network: StellarNetwork, customConfig?: CustomNetworkConfig) => void;
}

/**
 * Read the active network and switch networks at runtime without remounting.
 *
 * This hook provides dynamic network switching capabilities without requiring
 * a page reload or provider remount. All child hooks automatically re-fetch
 * when the network changes, making it ideal for network selection UIs.
 *
 * @returns Object containing network configuration and setter function
 * @returns {string} returns.network - Current network: "testnet" | "mainnet" | "futurenet" | "custom"
 * @returns {string} returns.networkPassphrase - Network passphrase for transaction signing
 * @returns {string} returns.horizonUrl - Active Horizon REST API endpoint
 * @returns {string} returns.sorobanRpcUrl - Active Soroban RPC endpoint
 * @returns {NetworkConfig} returns.config - Full network configuration object
 * @returns {function} returns.setNetwork - Function to switch networks dynamically
 * @returns {string} returns.setNetwork.network - Target network to switch to
 * @returns {CustomNetworkConfig} returns.setNetwork.customConfig - Custom config for "custom" network
 *
 * @example
 * ```tsx
 * const { network, setNetwork } = useStellarNetwork();
 *
 * return (
 *   <button onClick={() => setNetwork("mainnet")}>
 *     Switch to Mainnet (currently {network})
 *   </button>
 * );
 * ```
 *
 * @example
 * ```tsx
 * // Network toggle component
 * function NetworkToggle() {
 *   const { network, setNetwork } = useStellarNetwork();
 *
 *   return (
 *     <button onClick={() => setNetwork(network === "testnet" ? "mainnet" : "testnet")}>
 *       Currently: {network} — click to switch
 *     </button>
 *   );
 * }
 * ```
 */
export function useStellarNetwork(): UseStellarNetworkReturn {
  const { config, network, switchNetwork } = useStellarContext();

  const setNetwork = useCallback(
    (newNetwork: StellarNetwork, customConfig?: CustomNetworkConfig) => {
      switchNetwork(newNetwork, customConfig);
    },
    [switchNetwork],
  );

  return {
    network,
    networkPassphrase: config.networkPassphrase,
    horizonUrl: config.horizonUrl,
    sorobanRpcUrl: config.sorobanRpcUrl,
    config,
    setNetwork,
  };
}
