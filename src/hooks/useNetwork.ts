import { useStellarContext } from "../context";

/**
 * Read the active network configuration and switch networks at runtime.
 *
 * This hook provides access to the current Stellar network configuration and
 * allows switching between networks (testnet, mainnet, futurenet, or custom)
 * at runtime. All values reflect the currently active network, including any
 * network switch made via switchNetwork.
 *
 * @returns Object containing network configuration and switch function
 * @returns {string} returns.network - Current network: "testnet" | "mainnet" | "futurenet" | "custom"
 * @returns {string} returns.networkPassphrase - Network passphrase for transaction signing
 * @returns {string} returns.horizonUrl - Active Horizon REST API endpoint
 * @returns {string} returns.sorobanRpcUrl - Active Soroban RPC endpoint
 * @returns {NetworkConfig} returns.config - Full network configuration object
 * @returns {function} returns.switchNetwork - Function to switch networks
 *
 * @example
 * ```tsx
 * const { network, switchNetwork } = useNetwork();
 *
 * return (
 *   <select value={network} onChange={(e) => switchNetwork(e.target.value as StellarNetwork)}>
 *     <option value="testnet">Testnet</option>
 *     <option value="mainnet">Mainnet</option>
 *   </select>
 * );
 * ```
 *
 * @example
 * ```tsx
 * // Switch to custom network
 * const { switchNetwork } = useNetwork();
 *
 * switchNetwork("custom", {
 *   network: "custom",
 *   horizonUrl: "https://my-horizon.example.com",
 *   sorobanRpcUrl: "https://my-rpc.example.com",
 *   networkPassphrase: "My Network ; 2024",
 * });
 * ```
 */
export function useNetwork() {
  const { config, network, switchNetwork } = useStellarContext();

  return {
    network,
    networkPassphrase: config.networkPassphrase,
    horizonUrl: config.horizonUrl,
    sorobanRpcUrl: config.sorobanRpcUrl,
    config,
    switchNetwork,
  };
}