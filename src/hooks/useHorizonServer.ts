import { Horizon } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";

/**
 * Return a configured Horizon server instance for custom queries.
 *
 * This hook provides access to a Horizon.Server instance configured with the
 * current network's Horizon URL. It's useful for executing custom Horizon queries
 * that aren't covered by the built-in hooks.
 *
 * @returns Configured Horizon.Server instance for the current network
 *
 * @example
 * ```tsx
 * const server = useHorizonServer();
 *
 * async function loadAccountOffers(publicKey: string) {
 *   return server.offers().forAccount(publicKey).call();
 * }
 *
 * async function loadTrades() {
 *   return server.trades().forAsset(Asset.native()).call();
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Custom query component
 * function CustomHorizonExample() {
 *   const server = useHorizonServer();
 *   const [offers, setOffers] = useState([]);
 *
 *   useEffect(() => {
 *     server.offers().forAccount(publicKey).call().then(setOffers);
 *   }, [publicKey]);
 *
 *   return <ul>{offers.map(offer => <li key={offer.id}>{offer.id}</li>)}</ul>;
 * }
 * ```
 */
export function useHorizonServer(): Horizon.Server {
  const { config } = useStellarContext();
  return new Horizon.Server(config.horizonUrl);
}
