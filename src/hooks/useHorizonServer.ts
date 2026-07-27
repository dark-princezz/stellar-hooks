import { getHorizonServer } from "../utils/memoizedServers";
import { useStellarContext } from "../context";

export function useHorizonServer(): ReturnType<typeof getHorizonServer> {
  const { config } = useStellarContext();
  return getHorizonServer(config.horizonUrl);
}
