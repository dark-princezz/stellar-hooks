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

export type PredicateType =
  | "unconditional"
  | "time-bound"
  | "conditional"
  | "unknown";

export interface ParsedPredicate {
  type: PredicateType;
  unconditional?: boolean;
  absBefore?: string;
  absBeforeEpoch?: number;
  relBefore?: number;
  and?: ParsedPredicate[];
  or?: ParsedPredicate[];
  not?: ParsedPredicate;
  isClaimable: boolean;
}

export function parsePredicate(
  pred: Record<string, unknown> | null | undefined,
  nowUnixSeconds: number = Math.floor(Date.now() / 1000)
): ParsedPredicate {
  if (!pred) {
    return { type: "unconditional", unconditional: true, isClaimable: true };
  }

  if (pred.unconditional === true) {
    return { type: "unconditional", unconditional: true, isClaimable: true };
  }

  if (pred.abs_before !== undefined || pred.absBefore !== undefined) {
    const val = String(pred.abs_before ?? pred.absBefore);
    const dateEpoch = Math.floor(new Date(val).getTime() / 1000);
    const isClaimable = !isNaN(dateEpoch) ? nowUnixSeconds < dateEpoch : true;
    return {
      type: "time-bound",
      absBefore: val,
      isClaimable,
    };
  }

  if (pred.abs_before_epoch !== undefined || pred.absBeforeEpoch !== undefined) {
    const epoch = Number(pred.abs_before_epoch ?? pred.absBeforeEpoch);
    const isClaimable = !isNaN(epoch) ? nowUnixSeconds < epoch : true;
    return {
      type: "time-bound",
      absBeforeEpoch: epoch,
      isClaimable,
    };
  }

  if (pred.rel_before !== undefined || pred.relBefore !== undefined) {
    const relSec = Number(pred.rel_before ?? pred.relBefore);
    return {
      type: "time-bound",
      relBefore: relSec,
      isClaimable: true,
    };
  }

  if (Array.isArray(pred.and)) {
    const parsedAnd = pred.and.map((p) =>
      parsePredicate(p as Record<string, unknown>, nowUnixSeconds)
    );
    const isClaimable = parsedAnd.every((p) => p.isClaimable);
    return {
      type: "conditional",
      and: parsedAnd,
      isClaimable,
    };
  }

  if (Array.isArray(pred.or)) {
    const parsedOr = pred.or.map((p) =>
      parsePredicate(p as Record<string, unknown>, nowUnixSeconds)
    );
    const isClaimable = parsedOr.some((p) => p.isClaimable);
    return {
      type: "conditional",
      or: parsedOr,
      isClaimable,
    };
  }

  if (pred.not && typeof pred.not === "object") {
    const parsedNot = parsePredicate(
      pred.not as Record<string, unknown>,
      nowUnixSeconds
    );
    return {
      type: "conditional",
      not: parsedNot,
      isClaimable: !parsedNot.isClaimable,
    };
  }

  return { type: "unknown", isClaimable: true };
}

export function isClaimableNow(
  pred: Record<string, unknown> | ParsedPredicate,
  nowUnixSeconds?: number
): boolean {
  if ("type" in pred && typeof pred.type === "string" && "isClaimable" in pred) {
    return (pred as ParsedPredicate).isClaimable;
  }
  return parsePredicate(pred as Record<string, unknown>, nowUnixSeconds).isClaimable;
}

export interface ClaimableBalanceRecord {
  id: string;
  asset: string;
  amount: string;
  sponsor: string;
  lastModifiedLedger: number;
  claimants: Array<{
    destination: string;
    predicate: Record<string, unknown>;
    parsedPredicate?: ParsedPredicate;
    isClaimable?: boolean;
  }>;
  isClaimableNow?: boolean;
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
  claim: (balanceId: string) => Promise<void>;
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
 * @param publicKey - Stellar public key (G...) to fetch claimable balances for
 *
 * @returns Object containing claimable balance data and methods
 * @returns {ClaimableBalanceRecord[]} returns.balances - List of claimable balances
 * @returns {boolean} returns.isLoading - True during initial fetch
 * @returns {Error|null} returns.error - Any error from the fetch
 * @returns {function} returns.refetch - Manually trigger a refetch
 * @returns {function} returns.claim - Claim a specific balance by ID
 *
 * @example
 * ```tsx
 * const { balances, isLoading, refetch, claim } = useClaimableBalances(publicKey);
 * ```
 */
export function useClaimableBalances(
  publicKey: string | null
): UseClaimableBalancesReturn {
  const { config } = useStellarContext();
  const [state, dispatch] = useReducer(listReducer, listInitial);
  const { claim } = useClaimBalance();

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
        (r: Horizon.ServerApi.ClaimableBalanceRecord) => {
          const claimants = r.claimants.map((c) => {
            const rawPred = c.predicate as Record<string, unknown>;
            const parsedPredicate = parsePredicate(rawPred);
            return {
              destination: c.destination,
              predicate: rawPred,
              parsedPredicate,
              isClaimable: parsedPredicate.isClaimable,
            };
          });
          const userClaimant = claimants.find((c) => c.destination === publicKey);
          const isClaimable = userClaimant ? userClaimant.isClaimable : claimants.some((c) => c.isClaimable);

          return {
            id: r.id,
            asset: r.asset,
            amount: r.amount,
            sponsor: r.sponsor ?? "",
            lastModifiedLedger: r.last_modified_ledger,
            claimants,
            isClaimableNow: isClaimable,
          };
        }
      );

      dispatch({ type: "SUCCESS", payload: balances });
    } catch (err) {
      dispatch({
        type: "ERROR",
        payload: err instanceof Error
          ? err
          : new Error(String(err)),
      });
    }
  }, [publicKey, config.horizonUrl]);

  return { ...state, refetch, claim };
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
    debugLabel: "useClaimBalance",
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
    debugLabel: "useCreateClaimableBalance",
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
        const claimantErr: StellarTransactionError = {
          type: "transaction",
          resultCode: "invalid_claimants",
          message: "At least one claimant is required.",
        };
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

/** Helper alias for claiming a claimable balance */
export const useClaimableBalanceClaim = useClaimBalance;

/** Alias for useClaimableBalances */
export const useClaimableBalance = useClaimableBalances;

