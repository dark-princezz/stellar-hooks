import { useStellarAccount, type UseStellarAccountOptions } from "./useStellarAccount";
import type { StellarBalance, StellarPublicKey } from "../types";

export type AssetDescriptor = { code: string; issuer: string } | "native";

export interface UseAssetBalanceReturn {
  balance: StellarBalance | null;
  isLoading: boolean;
  error: Error | null;
}

export function useAssetBalance(
  publicKey: StellarPublicKey | null | undefined,
  asset: AssetDescriptor,
  options?: UseStellarAccountOptions
): UseAssetBalanceReturn {
  const { data, isLoading, error } = useStellarAccount(publicKey, options);

  const balance = (data?.balances ?? []).find((b) => {
    if (asset === "native") return b.isNative;
    return b.assetCode === asset.code && b.assetIssuer === asset.issuer;
  }) ?? null;

  return { balance, isLoading, error };
}
