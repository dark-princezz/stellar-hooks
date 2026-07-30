import { Horizon } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";

export function useHorizonServer(): Horizon.Server {
  const { config } = useStellarContext();
  return new Horizon.Server(config.horizonUrl);
}
