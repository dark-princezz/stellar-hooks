import { rpc } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { getRpcServer } from "../utils/memoizedServers";

export function useSorobanServer(): rpc.Server {
  const { config } = useStellarContext();
  return getRpcServer(config.sorobanRpcUrl);
}
