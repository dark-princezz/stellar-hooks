import { useMemo } from "react";
import { Asset } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import type { StellarContractId } from "../types";
import { unsafeAsContractId } from "../types";

export interface AssetDescriptor {
  code: string;
  issuer?: string;
}

export interface UseContractIdReturn {
  contractId: StellarContractId | null;
  error: Error | null;
}

/**
 * Derives a Soroban contract ID from a Stellar asset descriptor.
 *
 * @example
 * ```tsx
 * const { contractId, error } = useContractId({ code: "USDC", issuer: "G..." });
 * // contractId: "CAAAA..."
 *
 * // Native XLM (no issuer needed)
 * const { contractId } = useContractId({ code: "XLM" });
 * ```
 */
export function useContractId(
  asset: AssetDescriptor | null | undefined,
  networkPassphrase?: string
): UseContractIdReturn {
  const { config } = useStellarContext();
  const passphrase = networkPassphrase ?? config.networkPassphrase;

  return useMemo(() => {
    if (!asset) {
      return { contractId: null, error: null };
    }

    try {
      const stellarAsset =
        asset.code === "XLM" && !asset.issuer
          ? Asset.native()
          : new Asset(asset.code, asset.issuer);

      const id = stellarAsset.contractId(passphrase);
      return { contractId: unsafeAsContractId(id), error: null };
    } catch (err) {
      return {
        contractId: null,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }, [asset?.code, asset?.issuer, passphrase]);
}
