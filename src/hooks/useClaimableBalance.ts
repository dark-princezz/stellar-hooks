import { useCallback, useReducer } from "react";
import {
  Horizon,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { useTransaction } from "./useTransaction";
import { useFreighter } from "./useFreighter";
import type { TransactionStatus } from "../types";

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

export interface UseClaimableBalancesReturn extends ClaimableBalancesState {
  refetch: () => Promise<void>;
}

export interface UseClaimBalanceReturn {
  claim: (balanceId: string) => Promise<void>;
  status: TransactionStatus;
  hash: string | null;
  error: Error | null;
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
        payload: err instanceof Error ? err : new Error(String(err)),
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
 * const { claim, status, hash, error } = useClaimBalance();
 *
 * return <button onClick={() => claim(balance.id)}>Claim</button>;
 * ```
 */
export function useClaimBalance(): UseClaimBalanceReturn {
  const { config } = useStellarContext();
  const { signTransaction, publicKey } = useFreighter();
  const { submit: submitXdr, reset, ...txState } = useTransaction({
    mode: "classic",
  });

  const claim = useCallback(
    async (balanceId: string) => {
      if (!publicKey) {
        throw new Error("Freighter is not connected. Call connect() first.");
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
      const signedXdr = await signTransaction(builtXdr, {
        networkPassphrase: config.networkPassphrase,
      });

      // 4. Submit and poll via useTransaction internals
      await submitXdr(signedXdr);
    },
    [publicKey, config, signTransaction, submitXdr]
  );

  return {
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