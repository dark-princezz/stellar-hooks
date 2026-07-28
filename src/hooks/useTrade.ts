/**
 * @file useTrade.ts
 * @description Hook for placing, modifying, and cancelling Stellar DEX offers.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback } from "react";
import {
  Asset,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { getHorizonServer } from "../utils/memoizedServers";
import { useTransactionCore } from "./useTransactionCore";
import { useFreighter } from "./useFreighter";
import type { TransactionStatus, StellarTransactionError } from "../types";
import { unsafeAsXdrString } from "../types";

export type TradeAsset =
  | { type: "native" }
  | { type: "credit"; code: string; issuer: string };

export interface PlaceOfferParams {
  type: "buy" | "sell";
  selling: TradeAsset;
  buying: TradeAsset;
  amount: string;
  price: string;
}

export interface ModifyOfferParams {
  type: "buy" | "sell";
  offerId: string | number;
  selling: TradeAsset;
  buying: TradeAsset;
  amount: string;
  price: string;
}

export interface CancelOfferParams {
  type: "buy" | "sell";
  offerId: string | number;
  selling: TradeAsset;
  buying: TradeAsset;
  price?: string;
}

export interface UseTradeOptions {
  /** Fee in stroops. Default: 100 */
  fee?: number;
  /** Polling timeout in seconds. Default: 60 */
  timeoutSeconds?: number;
  /** Callback fired when the transaction is successfully confirmed. */
  onSuccess?: (hash: string) => void;
  /** Callback fired when the transaction fails or an error occurs. */
  onError?: (error: StellarTransactionError) => void;
}

export interface UseTradeReturn {
  placeOffer: (params: PlaceOfferParams) => Promise<void>;
  modifyOffer: (params: ModifyOfferParams) => Promise<void>;
  cancelOffer: (params: CancelOfferParams) => Promise<void>;
  status: TransactionStatus;
  hash: string | null;
  error: StellarTransactionError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
}

function resolveAsset(asset: TradeAsset): Asset {
  return asset.type === "native"
    ? Asset.native()
    : new Asset(asset.code, asset.issuer);
}

/**
 * Hook to manage classic Stellar DEX offers (place, modify, cancel).
 * Wraps `useTransaction({ mode: "classic" })` for transaction submission and polling.
 *
 * @example
 * ```tsx
 * const { placeOffer, modifyOffer, cancelOffer, status, isLoading } = useTrade({
 *   onSuccess: (hash) => console.log("Offer operation successful:", hash),
 *   onError: (error) => console.error("Offer operation failed:", error),
 * });
 * ```
 */
export function useTrade(options: UseTradeOptions = {}): UseTradeReturn {
  const { fee = 100, timeoutSeconds = 60, onSuccess, onError } = options;

  const { config } = useStellarContext();
  const { signTransaction, publicKey } = useFreighter();
  const { submit: submitXdr, reset, ...txState } = useTransactionCore({
    mode: "classic",
    timeoutSeconds,
    ...(onSuccess && { onSuccess }),
    ...(onError && { onError }),
  });

  const submitTransaction = useCallback(
    async (
      operation:
        | ReturnType<typeof Operation.manageBuyOffer>
        | ReturnType<typeof Operation.manageSellOffer>
    ) => {
      if (!publicKey) {
        throw new Error("Freighter is not connected. Call connect() first.");
      }

      // 1. Load source account from Horizon to get sequence number
      const server = getHorizonServer(config.horizonUrl);
      const sourceAccount = await server.loadAccount(publicKey);

      // 2. Build the transaction with the trade operation
      const tx = new TransactionBuilder(sourceAccount, {
        fee: String(fee),
        networkPassphrase: config.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(timeoutSeconds)
        .build();

      const builtXdr = tx.toXDR();

      // 3. Sign transaction XDR via Freighter wallet
      const signedXdr = await signTransaction(unsafeAsXdrString(builtXdr), {
        networkPassphrase: config.networkPassphrase,
      });

      // 4. Submit and poll via useTransaction classic mode
      await submitXdr(signedXdr);
    },
    [config, fee, timeoutSeconds, publicKey, signTransaction, submitXdr]
  );

  const placeOffer = useCallback(
    async (params: PlaceOfferParams) => {
      const sellingAsset = resolveAsset(params.selling);
      const buyingAsset = resolveAsset(params.buying);

      const operation =
        params.type === "buy"
          ? Operation.manageBuyOffer({
              selling: sellingAsset,
              buying: buyingAsset,
              buyAmount: params.amount,
              price: params.price,
              offerId: "0",
            })
          : Operation.manageSellOffer({
              selling: sellingAsset,
              buying: buyingAsset,
              amount: params.amount,
              price: params.price,
              offerId: "0",
            });

      await submitTransaction(operation);
    },
    [submitTransaction]
  );

  const modifyOffer = useCallback(
    async (params: ModifyOfferParams) => {
      const sellingAsset = resolveAsset(params.selling);
      const buyingAsset = resolveAsset(params.buying);

      const operation =
        params.type === "buy"
          ? Operation.manageBuyOffer({
              selling: sellingAsset,
              buying: buyingAsset,
              buyAmount: params.amount,
              price: params.price,
              offerId: String(params.offerId),
            })
          : Operation.manageSellOffer({
              selling: sellingAsset,
              buying: buyingAsset,
              amount: params.amount,
              price: params.price,
              offerId: String(params.offerId),
            });

      await submitTransaction(operation);
    },
    [submitTransaction]
  );

  const cancelOffer = useCallback(
    async (params: CancelOfferParams) => {
      const sellingAsset = resolveAsset(params.selling);
      const buyingAsset = resolveAsset(params.buying);

      const operation =
        params.type === "buy"
          ? Operation.manageBuyOffer({
              selling: sellingAsset,
              buying: buyingAsset,
              buyAmount: "0",
              price: params.price ?? "1",
              offerId: String(params.offerId),
            })
          : Operation.manageSellOffer({
              selling: sellingAsset,
              buying: buyingAsset,
              amount: "0",
              price: params.price ?? "1",
              offerId: String(params.offerId),
            });

      await submitTransaction(operation);
    },
    [submitTransaction]
  );

  return {
    placeOffer,
    modifyOffer,
    cancelOffer,
    status: txState.status,
    hash: txState.hash,
    error: txState.error,
    isLoading: txState.isLoading,
    isSuccess: txState.isSuccess,
    isError: txState.isError,
    reset,
  };
}
