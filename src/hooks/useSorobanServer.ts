import { rpc } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";

/**
 * Return a configured Soroban RPC server instance for custom queries.
 *
 * This hook provides access to a Soroban RPC Server instance configured with the
 * current network's RPC URL. It's useful for executing custom RPC queries that
 * aren't covered by the built-in hooks, such as getting ledger info, simulating
 * transactions, or querying contract data directly.
 *
 * @returns Configured Soroban RPC Server instance for the current network
 *
 * @example
 * ```tsx
 * const server = useSorobanServer();
 *
 * async function getLedgerInfo() {
 *   return server.getLatestLedger();
 * }
 *
 * async function simulateTransaction(txXdr: string) {
 *   return server.simulateTransaction(txXdr);
 * }
 *
 * async function getContractData(contractId: string) {
 *   const key = xdr.LedgerKey.contractData(/* ... */);
 *   const result = await server.getLedgerEntries(key);
 *   return result.entries[0];
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Custom RPC query component
 * function CustomRpcExample() {
 *   const server = useSorobanServer();
 *   const [ledgerInfo, setLedgerInfo] = useState(null);
 *
 *   useEffect(() => {
 *     server.getLatestLedger().then(setLedgerInfo);
 *   }, []);
 *
 *   return <div>Current ledger: {ledgerInfo?.sequence}</div>;
 * }
 * ```
 */
export function useSorobanServer(): rpc.Server {
  const { config } = useStellarContext();
  return new rpc.Server(config.sorobanRpcUrl);
}
