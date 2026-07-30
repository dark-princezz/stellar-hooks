import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  Asset,
  Horizon,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { useFreighter } from "./useFreighter";
import { useTransactionCore } from "./useTransactionCore";
import { parseBalance } from "../utils";
import { unsafeAsXdrString, unsafeAsAssetIssuer, type StellarBalance, type StellarTransactionError, type TransactionStatus } from "../types";

export type TrustlineAsset = { code: string; issuer: string };

export interface UseTrustlinesReturn {
  trustlines: StellarBalance[];
  isLoading: boolean;
  error: Error | null;
  addTrustline: (asset: TrustlineAsset) => Promise<void>;
  removeTrustline: (asset: TrustlineAsset) => Promise<void>;
  status: TransactionStatus;
  hash: string | null;
  txError: StellarTransactionError | null;
  isTxLoading: boolean;
  isTxSuccess: boolean;
  isTxError: boolean;
}

type ListAction =
  | { type: "LOADING" }
  | { type: "SUCCESS"; payload: StellarBalance[] }
  | { type: "ERROR"; payload: Error };

function listReducer(
  state: { trustlines: StellarBalance[]; isLoading: boolean; error: Error | null },
  action: ListAction
) {
  switch (action.type) {
    case "LOADING":
      return { ...state, isLoading: true, error: null };
    case "SUCCESS":
      return { trustlines: action.payload, isLoading: false, error: null };
    case "ERROR":
      return { ...state, isLoading: false, error: action.payload };
    default:
      return state;
  }
}

const listInitial = {
  trustlines: [],
  isLoading: false,
  error: null,
};

function parseNonNativeBalance(
  b: Horizon.HorizonApi.BalanceLine
): StellarBalance {
  const isNative = b.asset_type === "native";
  const lineAsset = b as Horizon.HorizonApi.BalanceLineAsset;
  const result: StellarBalance = {
    assetType: lineAsset.asset_type,
    assetCode: lineAsset.asset_code,
    assetIssuer: unsafeAsAssetIssuer(lineAsset.asset_issuer),
    balance: b.balance,
    balanceFloat: parseBalance(b.balance),
    buyingLiabilities: "buying_liabilities" in b ? b.buying_liabilities : "0",
    sellingLiabilities: "selling_liabilities" in b ? b.selling_liabilities : "0",
    isNative,
  };
  if ("limit" in b && b.limit) {
    result.limit = b.limit;
  }
  return result;
}

export function useTrustlines(
  publicKey: string | null | undefined
): UseTrustlinesReturn {
  const { config } = useStellarContext();
  const { publicKey: freighterKey, signTransaction } = useFreighter();
  const { submit: submitXdr, ...txState } = useTransactionCore({
    mode: "classic",
    debugLabel: "useTrustlines",
  });
  const [listState, listDispatch] = useReducer(listReducer, listInitial);
  const mountedRef = useRef(true);

  const fetchTrustlines = useCallback(async () => {
    if (!publicKey) return;
    listDispatch({ type: "LOADING" });
    try {
      const server = new Horizon.Server(config.horizonUrl);
      const raw = await server.loadAccount(publicKey);
      const trustlines = raw.balances
        .filter((b: Horizon.HorizonApi.BalanceLine) => b.asset_type !== "native")
        .map(parseNonNativeBalance);
      if (mountedRef.current) {
        listDispatch({ type: "SUCCESS", payload: trustlines });
      }
    } catch (err) {
      if (mountedRef.current) {
        listDispatch({
          type: "ERROR",
          payload: err instanceof Error
            ? err
            : new Error(String(err)),
        });
      }
    }
  }, [publicKey, config.horizonUrl]);

  useEffect(() => {
    mountedRef.current = true;
    fetchTrustlines();
    return () => { mountedRef.current = false; };
  }, [fetchTrustlines]);

  const removeTrustline = useCallback(
    async (asset: TrustlineAsset) => {
      if (!freighterKey) {
        const err: StellarTransactionError = {
          type: "network",
          message: "Freighter is not connected. Call connect() first.",
        };
        throw err;
      }

      const server = new Horizon.Server(config.horizonUrl);
      const sourceAccount = await server.loadAccount(freighterKey);

      const tx = new TransactionBuilder(sourceAccount, {
        fee: "100",
        networkPassphrase: config.networkPassphrase,
      })
        .addOperation(
          Operation.changeTrust({
            asset: new Asset(asset.code, asset.issuer),
            limit: "0",
          })
        )
        .setTimeout(60)
        .build();

      const signedXdr = await signTransaction(unsafeAsXdrString(tx.toXDR()), {
        networkPassphrase: config.networkPassphrase,
      });

      await submitXdr(signedXdr);
      await fetchTrustlines();
    },
    [freighterKey, config, signTransaction, submitXdr, fetchTrustlines]
  );

  const addTrustline = useCallback(
    async (asset: TrustlineAsset) => {
      if (!freighterKey) {
        const err: StellarTransactionError = {
          type: "network",
          message: "Freighter is not connected. Call connect() first.",
        };
        throw err;
      }

      const server = new Horizon.Server(config.horizonUrl);
      const sourceAccount = await server.loadAccount(freighterKey);

      const tx = new TransactionBuilder(sourceAccount, {
        fee: "100",
        networkPassphrase: config.networkPassphrase,
      })
        .addOperation(
          Operation.changeTrust({
            asset: new Asset(asset.code, asset.issuer),
          })
        )
        .setTimeout(60)
        .build();

      const signedXdr = await signTransaction(unsafeAsXdrString(tx.toXDR()), {
        networkPassphrase: config.networkPassphrase,
      });

      await submitXdr(signedXdr);
      await fetchTrustlines();
    },
    [freighterKey, config, signTransaction, submitXdr, fetchTrustlines]
  );

  return {
    trustlines: listState.trustlines,
    isLoading: listState.isLoading,
    error: listState.error,
    addTrustline,
    removeTrustline,
    status: txState.status,
    hash: txState.hash,
    txError: txState.error,
    isTxLoading: txState.isLoading,
    isTxSuccess: txState.isSuccess,
    isTxError: txState.isError,
  };
}
