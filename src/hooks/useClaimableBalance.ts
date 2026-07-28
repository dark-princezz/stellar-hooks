/**
 * @file useClaimableBalance.ts
 * @description Hook for fetching claimable balances from the Stellar network.
 * @package stellar-hooks
 */

import { useCallback, useReducer } from "react";
import {
  Asset,
  Claimant,
  Horizon,
  Operation,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { useTransactionCore } from "./useTransactionCore";
import { useFreighter } from "./useFreighter";
import { unsafeAsXdrString, type TransactionStatus, type StellarTransactionError } from "../types";
import { validatePublicKey } from "../utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClaimableBalanceRecord {
  id: string;
  asset: string;
  amount: string;
  sponsor: string;
  lastModifiedLedger: number;
  claimants: Array<{
    destination: string;
    predicate: Record<string, unknown>;
  }>;
}

export interface ClaimableBalancesState {
  balances: ClaimableBalanceRecord[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * The asset to lock into a claimable balance.
 * Use `{ type: "native" }` for XLM.
 * Use `{ type: "credit", code: "USDC", issuer: "G..." }` for any other asset.
 */
export type ClaimableBalanceAsset =
  | { type: "native" }
  | { type: "credit"; code: string; issuer: string };

/**
 * A single claimant for a new claimable balance.
 * If `predicate` is omitted the claimant may claim unconditionally.
 */
export interface ClaimantInput {
  /** Account (G...) allowed to claim the balance */
  destination: string;
  /** Optional claim predicate. Defaults to unconditional. */
  predicate?: xdr.ClaimPredicate;
}

/** Parameters for creating a claimable balance. */
export interface CreateClaimableBalanceParams {
  /** Asset to lock into the balance */
  asset: ClaimableBalanceAsset;
  /** Amount as a string, e.g. "10.5" */
  amount: string;
  /** Accounts eligible to claim the balance */
  claimants: ClaimantInput[];
}

/** Shared callbacks for the claimable-balance write hooks. */
export interface UseClaimBalanceOptions {
  /** Callback fired when the transaction is successfully confirmed. */
  onSuccess?: (hash: string) => void;
  /** Callback fired when the transaction fails or an error occurs. */
  onError?: (error: StellarTransactionError) => void;
}

/** Options for {@link useCreateClaimableBalance}. */
export type UseCreateClaimableBalanceOptions = UseClaimBalanceOptions;

/**
 * @example
 * ```tsx
 * const {
 *   balances,  // ClaimableBalanceRecord[] — list of claimable balances
 *   isLoading, // boolean
 *   error,     // Error | null
 *   refetch,   // () => Promise<void>
 * } = useClaimableBalances(publicKey);
 *
 * // Each record: { id, asset, amount, sponsor, lastModifiedLedger, claimants }
 * ```
 */
export interface UseClaimableBalancesReturn extends ClaimableBalancesState {
  refetch: () => Promise<void>;
}

/**
 * @example
 * ```tsx
 * const {
 *   claim,     // (balanceId: string) => Promise<void>
 *   status,    // "idle" | "submitting" | "polling" | "success" | "error"
 *   hash,      // string | null
 *   isLoading, // boolean
 *   isSuccess, // boolean
 *   isError,   // boolean
 *   error,     // Error | null
 *   reset,     // () => void
 * } = useClaimBalance();
 *
 * return <button onClick={() => claim(balance.id)}>Claim</button>;
 * ```
 */
export interface UseClaimBalanceReturn {
  claim: (balanceId: string) => Promise<void>;
  status: TransactionStatus;
  hash: string | null;
  error: StellarTransactionError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
}

// ─── List hook reducer ────────────────────────────────────────────────────────

type ListAction =
  | { type: "LOADING" }
  | { type: "SUCCESS"; payload: ClaimableBalanceRecord[] }
  | { type: "ERROR"; payload: Error };

function listReducer(
  state: ClaimableBalancesState,
  action: ListAction
): ClaimableBalancesState {
  switch (action.type) {
    case "LOADING":
      return { ...state, isLoading: true, error: null };
    case "SUCCESS":
      return { balances: action.payload, isLoading: false, error: null };
    case "ERROR":
      return { ...state, isLoading: false, error: action.payload };
    default:
      return state;
  }
}

const listInitial: ClaimableBalancesState = {
  balances: [],
  isLoading: false,
  error: null,
};

// ─── useClaimableBalances ─────────────────────────────────────────────────────

/**
 * Fetches all claimable balances for a given public key from Horizon.
 * Predicates are included in the returned data for display but not enforced.
 *
 * @example
 * ```tsx
 * const { balances, isLoading, refetch } = useClaimableBalances(publicKey);
 * ```
 */
export function useClaimableBalances(
  publicKey: string | null
): UseClaimableBalancesReturn {
  const { config } = useStellarContext();
  const [state, dispatch] = useReducer(listReducer, listInitial);

  const refetch = useCallback(async () => {
    if (!publicKey) return;

    dispatch({ type: "LOADING" });

    try {
      validatePublicKey(publicKey);
      const server = new Horizon.Server(config.horizonUrl);
      const response = await server
        .claimableBalances()
        .claimant(publicKey)
        .call();

      const balances: ClaimableBalanceRecord[] = response.records.map(
        (r: Horizon.ServerApi.ClaimableBalanceRecord) => ({
          id: r.id,
          asset: r.asset,
          amount: r.amount,
          sponsor: r.sponsor ?? "",
          lastModifiedLedger: r.last_modified_ledger,
          claimants: r.claimants.map((c) => ({
            destination: c.destination,
            predicate: c.predicate as Record<string, unknown>,
          })),
        })
      );

      dispatch({ type: "SUCCESS", payload: balances });
    } catch (err) {
      dispatch({
        type: "ERROR",
        payload: err instanceof Error
          ? (err as unknown as StellarTransactionError)
          : { type: "transaction", message: String(err) } as StellarTransactionError,
      });
    }
  }, [publicKey, config.horizonUrl]);

  return { ...state, refetch };
}

// ─── useClaimBalance ──────────────────────────────────────────────────────────

/**
 * Builds, signs via Freighter, and submits a claimClaimableBalance operation.
 * Uses `useTransaction({ mode: "classic" })` for submission and polling.
 *
 * @example
 * ```tsx
 * const { claim, status, hash, error } = useClaimBalance({
 *   onSuccess: (hash) => console.log("Claimed!", hash),
 * });
 *
 * return <button onClick={() => claim(balance.id)}>Claim</button>;
 * ```
 */
export function useClaimBalance(
  options: UseClaimBalanceOptions = {}
): UseClaimBalanceReturn {
  const { onSuccess, onError } = options;
  const { config } = useStellarContext();
  const { signTransaction, publicKey } = useFreighter();
  const { submit: submitXdr, reset, ...txState } = useTransactionCore({
    mode: "classic",
    ...(onSuccess && { onSuccess }),
    ...(onError && { onError }),
  });

  const claim = useCallback(
    async (balanceId: string) => {
      if (!publicKey) {
        const err: StellarTransactionError = {
          type: "network",
          message: "Freighter is not connected. Call connect() first.",
        };
        throw err;
      }

      // 1. Load source account for sequence number
      const server = new Horizon.Server(config.horizonUrl);
      const sourceAccount = await server.loadAccount(publicKey);

      // 2. Build the transaction
      const tx = new TransactionBuilder(sourceAccount, {
        fee: "100",
        networkPassphrase: config.networkPassphrase,
      })
        .addOperation(
          Operation.claimClaimableBalance({ balanceId })
        )
        .setTimeout(60)
        .build();

      const builtXdr = tx.toXDR();

      // 3. Sign via Freighter
      const signedXdr = await signTransaction(unsafeAsXdrString(builtXdr), {
        networkPassphrase: config.networkPassphrase,
      });

      // 4. Submit and poll via useTransaction internals
      await submitXdr(signedXdr);
    },
    [publicKey, config, signTransaction, submitXdr]
  );

  return {
    ...txState,
    claim,
    reset,
    status: txState.status,
    hash: txState.hash,
    error: txState.error,
    isLoading: txState.isLoading,
    isSuccess: txState.isSuccess,
    isError: txState.isError,
  };
}

// ─── useCreateClaimableBalance ─────────────────────────────────────────────────

/**
 * @example
 * ```tsx
 * const {
 *   create,    // (params: CreateClaimableBalanceParams) => Promise<void>
 *   status,    // "idle" | "submitting" | "polling" | "success" | "error"
 *   hash,      // string | null
 *   isLoading, // boolean
 *   isSuccess, // boolean
 *   isError,   // boolean
 *   error,     // Error | null
 *   reset,     // () => void
 * } = useCreateClaimableBalance();
 *
 * return (
 *   <button
 *     onClick={() =>
 *       create({
 *         asset: { type: "native" },
 *         amount: "10",
 *         claimants: [{ destination: "GBXXX..." }],
 *       })
 *     }
 *   >
 *     Create
 *   </button>
 * );
 * ```
 */
export interface UseCreateClaimableBalanceReturn {
  create: (params: CreateClaimableBalanceParams) => Promise<void>;
  status: TransactionStatus;
  hash: string | null;
  error: StellarTransactionError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
}

/**
 * Builds, signs via Freighter, and submits a `createClaimableBalance` operation.
 * Locks an asset amount so the listed claimants can later claim it (subject to
 * each claimant's predicate). Uses `useTransaction({ mode: "classic" })` for
 * submission and polling.
 *
 * Claimants without an explicit `predicate` may claim unconditionally.
 *
 * @example
 * ```tsx
 * const { create, status, hash, error } = useCreateClaimableBalance({
 *   onSuccess: (hash) => console.log("Created!", hash),
 * });
 *
 * await create({
 *   asset: { type: "native" },
 *   amount: "10",
 *   claimants: [{ destination: "GBXXX..." }],
 * });
 * ```
 */
export function useCreateClaimableBalance(
  options: UseCreateClaimableBalanceOptions = {}
): UseCreateClaimableBalanceReturn {
  const { onSuccess, onError } = options;
  const { config } = useStellarContext();
  const { signTransaction, publicKey } = useFreighter();
  const { submit: submitXdr, reset, ...txState } = useTransactionCore({
    mode: "classic",
    ...(onSuccess && { onSuccess }),
    ...(onError && { onError }),
  });

  const create = useCallback(
    async ({ asset, amount, claimants }: CreateClaimableBalanceParams) => {
      if (!publicKey) {
        const err: StellarTransactionError = {
          type: "network",
          message: "Freighter is not connected. Call connect() first.",
        };
        throw err;
      }

      if (claimants.length === 0) {
        const claimantErr: StellarTransactionError = { type: "transaction", message: "At least one claimant is required." };
        throw claimantErr;
      }

      // 1. Load source account for sequence number
      const server = new Horizon.Server(config.horizonUrl);
      const sourceAccount = await server.loadAccount(publicKey);

      // 2. Resolve the asset
      const stellarAsset =
        asset.type === "native"
          ? Asset.native()
          : new Asset(asset.code, asset.issuer);

      // 3. Resolve claimants, defaulting to an unconditional predicate
      const stellarClaimants = claimants.map(
        (c) =>
          new Claimant(
            c.destination,
            c.predicate ?? Claimant.predicateUnconditional()
          )
      );

      // 4. Build the transaction
      const tx = new TransactionBuilder(sourceAccount, {
        fee: "100",
        networkPassphrase: config.networkPassphrase,
      })
        .addOperation(
          Operation.createClaimableBalance({
            asset: stellarAsset,
            amount,
            claimants: stellarClaimants,
          })
        )
        .setTimeout(60)
        .build();

      const builtXdr = tx.toXDR();

      // 5. Sign via Freighter
      const signedXdr = await signTransaction(unsafeAsXdrString(builtXdr), {
        networkPassphrase: config.networkPassphrase,
      });

      // 6. Submit and poll via useTransaction internals
      await submitXdr(signedXdr);
    },
    [publicKey, config, signTransaction, submitXdr]
  );

  return {
    create,
    reset,
    status: txState.status,
    hash: txState.hash,
    error: txState.error,
    isLoading: txState.isLoading,
    isSuccess: txState.isSuccess,
    isError: txState.isError,
  };
}
