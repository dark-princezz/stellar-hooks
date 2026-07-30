import { rpc } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";

export function useSorobanServer(): rpc.Server {
  const { config } = useStellarContext();
  return new rpc.Server(config.sorobanRpcUrl);
}
