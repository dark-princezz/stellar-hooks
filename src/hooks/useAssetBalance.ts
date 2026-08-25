/**
 * @file useAssetBalance.ts
 * @description Hook for fetching and streaming balance of a specific asset for an account.
 * @package stellar-hooks
 * @license MIT
 */

import { useEffect, useState, useMemo } from "react";
import { Horizon } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { useStellarAccount, type UseStellarAccountOptions } from "./useStellarAccount";
import type { StellarBalance, StellarPublicKey } from "../types";
import { parseAccountResponse, validatePublicKey } from "../utils";

export type AssetDescriptor = { code: string; issuer: string } | "native";

export interface UseAssetBalanceOptions extends UseStellarAccountOptions {
  /** Enable live updates via SSE streaming from Horizon account stream. Default: false */
  stream?: boolean;
}

export interface UseAssetBalanceReturn {
  balance: StellarBalance | null;
  isLoading: boolean;
  error: Error | null;
  isStreaming: boolean;
  refetch?: () => Promise<void>;
}

/**
 * Return the balance of a specific asset (native or issued) for a given account,
 * with optional live updates via streaming.
 */
export function useAssetBalance(
  publicKey: StellarPublicKey | null | undefined,
  asset: AssetDescriptor,
  options?: UseAssetBalanceOptions
): UseAssetBalanceReturn {
  const { stream = false, ...accountOptions } = options ?? {};
  const { config } = useStellarContext();
  const { data, isLoading, error, refetch } = useStellarAccount(publicKey, accountOptions);

  const [streamedBalance, setStreamedBalance] = useState<StellarBalance | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const assetCode = typeof asset === "object" ? asset.code : null;
  const assetIssuer = typeof asset === "object" ? asset.issuer : null;

  const initialBalance = useMemo(() => {
    return (
      (data?.balances ?? []).find((b) => {
        if (asset === "native") return b.isNative;
        return b.assetCode === assetCode && b.assetIssuer === assetIssuer;
      }) ?? null
    );
  }, [data?.balances, asset, assetCode, assetIssuer]);

  useEffect(() => {
    if (!stream || !publicKey) {
      setIsStreaming(false);
      setStreamedBalance(null);
      return;
    }

    let isCancelled = false;
    let closeStream: (() => void) | undefined;

    try {
      validatePublicKey(publicKey);
      const server = new Horizon.Server(config.horizonUrl);

      closeStream = server
        .accounts()
        .accountId(publicKey)
        .stream({
          onmessage: (accountRecord: Horizon.ServerApi.AccountRecord) => {
            if (isCancelled) return;
            const parsedAccount = parseAccountResponse(accountRecord);
            const found =
              parsedAccount.balances.find((b) => {
                if (asset === "native") return b.isNative;
                return b.assetCode === assetCode && b.assetIssuer === assetIssuer;
              }) ?? null;

            setStreamedBalance(found);
            setIsStreaming(true);
          },
          onerror: () => {
            if (isCancelled) return;
            setIsStreaming(false);
          },
        });

      setIsStreaming(true);
    } catch {
      if (!isCancelled) {
        setIsStreaming(false);
      }
    }

    return () => {
      isCancelled = true;
      if (typeof closeStream === "function") {
        try {
          closeStream();
        } catch {
          // ignore stream cleanup error
        }
      }
      setIsStreaming(false);
    };
  }, [stream, publicKey, config.horizonUrl, asset, assetCode, assetIssuer]);

  const balance = streamedBalance !== null ? streamedBalance : initialBalance;

  return {
    balance,
    isLoading,
    error,
    isStreaming,
    refetch,
  };
}
