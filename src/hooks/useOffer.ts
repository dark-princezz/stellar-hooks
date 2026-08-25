/**
 * @file useOffer.ts
 * @description Hook for creating, cancelling, and listing Stellar DEX offers for a connected account.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Asset, Horizon, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { useFreighter } from "./useFreighter";
import { useTransactionCore } from "./useTransactionCore";
import { getHorizonServer } from "../utils/memoizedServers";
import { validatePublicKey } from "../utils";
import { unsafeAsXdrString, type TransactionStatus, type StellarTransactionError } from "../types";

export type OfferAsset =
  | { type: "native" }
  | { type: "credit"; code: string; issuer: string };

export interface CreateOfferOptions {
  type?: "buy" | "sell";
  selling: OfferAsset;
  buying: OfferAsset;
  amount: string;
  price: string | { n: number; d: number };
  offerId?: string | number;
  passive?: boolean;
}

export interface CancelOfferOptions {
  type?: "buy" | "sell";
  offerId: string | number;
  selling: OfferAsset;
  buying: OfferAsset;
  price?: string;
}

export interface UseOfferHookOptions {
  accountPublicKey?: string | null;
  enabled?: boolean;
  refetchInterval?: number;
  limit?: number;
  fee?: number;
  timeoutSeconds?: number;
  onSuccess?: (hash: string) => void;
  onError?: (error: StellarTransactionError) => void;
}

export interface UseOfferReturn {
  // Offer listing
  offers: Horizon.ServerApi.OfferRecord[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;

  // Actions
  createOffer: (params: CreateOfferOptions) => Promise<void>;
  cancelOffer: (
    paramsOrId: CancelOfferOptions | string | number,
    selling?: OfferAsset,
    buying?: OfferAsset
  ) => Promise<void>;

  // Tx state
  status: TransactionStatus;
  hash: string | null;
  txError: StellarTransactionError | null;
  isSubmitting: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
}

function resolveAsset(asset: OfferAsset): Asset {
  return asset.type === "native"
    ? Asset.native()
    : new Asset(asset.code, asset.issuer);
}

/**
 * Hook for managing Stellar DEX offers (creating, cancelling, and listing offers)
 * for a connected account or specified public key.
 *
 * @example
 * ```tsx
 * const { offers, createOffer, cancelOffer, isLoading, isSubmitting } = useOffer();
 *
 * // Create a sell offer
 * await createOffer({
 *   selling: { type: "native" },
 *   buying: { type: "credit", code: "USDC", issuer: "G..." },
 *   amount: "100",
 *   price: "0.15",
 * });
 *
 * // Cancel an offer
 * await cancelOffer(offer.id, { type: "native" }, { type: "credit", code: "USDC", issuer: "G..." });
 * ```
 */
export function useOffer(options: UseOfferHookOptions = {}): UseOfferReturn {
  const {
    accountPublicKey,
    enabled = true,
    refetchInterval = 0,
    limit = 10,
    fee = 100,
    timeoutSeconds = 60,
    onSuccess,
    onError,
  } = options;

  const { config } = useStellarContext();
  const { signTransaction, publicKey: connectedKey } = useFreighter();
  const targetPublicKey = accountPublicKey ?? connectedKey ?? null;

  // Listing state
  const [offers, setOffers] = useState<Horizon.ServerApi.OfferRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prevCursor, setPrevCursor] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchIdRef = useRef(0);

  // Transaction execution core
  const { submit: submitXdr, reset: resetTx, ...txState } = useTransactionCore({
    mode: "classic",
    timeoutSeconds,
    debugLabel: "useOffer",
    ...(onSuccess && { onSuccess }),
    ...(onError && { onError }),
  });

  const fetchPage = useCallback(
    async (cursor?: string | null) => {
      if (!targetPublicKey) return;

      const id = ++fetchIdRef.current;
      setIsLoading(true);
      setError(null);

      try {
        validatePublicKey(targetPublicKey);
        const server = getHorizonServer(config.horizonUrl);
        const query = server.offers().forAccount(targetPublicKey).limit(limit);
        const response = cursor ? await query.cursor(cursor).call() : await query.call();

        if (id !== fetchIdRef.current) return;
        const collection = response as Horizon.ServerApi.CollectionPage<Horizon.ServerApi.OfferRecord> & {
          _links?: {
            next?: { href?: string };
            prev?: { href?: string };
          };
        };
        setOffers(collection.records);
        const nextLink = collection._links?.next?.href;
        const prevLink = collection._links?.prev?.href;
        setNextCursor(nextLink ? new URL(nextLink).searchParams.get("cursor") : null);
        setPrevCursor(prevLink ? new URL(prevLink).searchParams.get("cursor") : null);
      } catch (err) {
        if (id === fetchIdRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (id === fetchIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [targetPublicKey, config.horizonUrl, limit]
  );

  const refetch = useCallback(async () => {
    await fetchPage(null);
  }, [fetchPage]);

  const nextPage = useCallback(async () => {
    if (!nextCursor) return;
    await fetchPage(nextCursor);
  }, [fetchPage, nextCursor]);

  const prevPage = useCallback(async () => {
    if (!prevCursor) return;
    await fetchPage(prevCursor);
  }, [fetchPage, prevCursor]);

  useEffect(() => {
    if (!enabled || !targetPublicKey) return;

    void refetch();

    if (refetchInterval > 0) {
      intervalRef.current = setInterval(() => {
        void refetch();
      }, refetchInterval);
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      fetchIdRef.current += 1;
    };
  }, [enabled, targetPublicKey, refetch, refetchInterval]);

  const submitOperation = useCallback(
    async (
      op:
        | ReturnType<typeof Operation.manageSellOffer>
        | ReturnType<typeof Operation.manageBuyOffer>
        | ReturnType<typeof Operation.createPassiveSellOffer>
    ) => {
      if (!connectedKey) {
        throw new Error("Freighter is not connected. Call connect() first.");
      }

      const server = new Horizon.Server(config.horizonUrl);
      const sourceAccount = await server.loadAccount(connectedKey);

      const builder = new TransactionBuilder(sourceAccount, {
        fee: String(fee),
        networkPassphrase: config.networkPassphrase,
      })
        .addOperation(op)
        .setTimeout(timeoutSeconds);

      const builtTx = builder.build();
      const signedXdr = await signTransaction(unsafeAsXdrString(builtTx.toXDR()), {
        networkPassphrase: config.networkPassphrase,
      });

      await submitXdr(signedXdr);
      void refetch();
    },
    [connectedKey, config, fee, timeoutSeconds, signTransaction, submitXdr, refetch]
  );

  const createOffer = useCallback(
    async (params: CreateOfferOptions) => {
      const sellingAsset = resolveAsset(params.selling);
      const buyingAsset = resolveAsset(params.buying);

      let op;
      if (params.passive) {
        op = Operation.createPassiveSellOffer({
          selling: sellingAsset,
          buying: buyingAsset,
          amount: params.amount,
          price: params.price,
        });
      } else if (params.type === "buy") {
        op = Operation.manageBuyOffer({
          selling: sellingAsset,
          buying: buyingAsset,
          buyAmount: params.amount,
          price: params.price,
          offerId: String(params.offerId ?? 0),
        });
      } else {
        op = Operation.manageSellOffer({
          selling: sellingAsset,
          buying: buyingAsset,
          amount: params.amount,
          price: params.price,
          offerId: String(params.offerId ?? 0),
        });
      }

      await submitOperation(op);
    },
    [submitOperation]
  );

  const cancelOffer = useCallback(
    async (
      paramsOrId: CancelOfferOptions | string | number,
      sellingAsset?: OfferAsset,
      buyingAsset?: OfferAsset
    ) => {
      let offerId: string | number;
      let selling: OfferAsset;
      let buying: OfferAsset;
      let type: "buy" | "sell" = "sell";
      let price = "1";

      if (typeof paramsOrId === "object") {
        offerId = paramsOrId.offerId;
        selling = paramsOrId.selling;
        buying = paramsOrId.buying;
        type = paramsOrId.type ?? "sell";
        price = paramsOrId.price ?? "1";
      } else {
        offerId = paramsOrId;
        if (!sellingAsset || !buyingAsset) {
          throw new Error("selling and buying assets are required when passing offerId.");
        }
        selling = sellingAsset;
        buying = buyingAsset;
      }

      const selAsset = resolveAsset(selling);
      const buyAsset = resolveAsset(buying);

      const op =
        type === "buy"
          ? Operation.manageBuyOffer({
              selling: selAsset,
              buying: buyAsset,
              buyAmount: "0",
              price,
              offerId: String(offerId),
            })
          : Operation.manageSellOffer({
              selling: selAsset,
              buying: buyAsset,
              amount: "0",
              price,
              offerId: String(offerId),
            });

      await submitOperation(op);
    },
    [submitOperation]
  );

  return {
    offers,
    isLoading,
    error,
    refetch,
    nextPage,
    prevPage,
    createOffer,
    cancelOffer,
    status: txState.status,
    hash: txState.hash,
    txError: txState.error,
    isSubmitting: txState.isLoading,
    isSuccess: txState.isSuccess,
    isError: txState.isError,
    reset: resetTx,
  };
}
