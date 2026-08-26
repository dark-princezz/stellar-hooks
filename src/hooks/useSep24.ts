/**
 * @file useSep24.ts
 * @description Hook for interactive deposit/withdraw via SEP-24 anchor protocol.
 * @package stellar-hooks
 * @license MIT
 */

import { useState, useCallback } from "react";
import { useStellarContext } from "../context";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Sep24TransactionStatus =
  | "incomplete"
  | "pending_user_transfer_start"
  | "pending_anchor"
  | "pending_stellar"
  | "pending_trust"
  | "pending_user"
  | "completed"
  | "refunded"
  | "expired"
  | "error";

export interface Sep24Transaction {
  /** Unique identifier for this transaction */
  id: string;
  /** Type of transaction: "deposit" or "withdraw" */
  kind: "deposit" | "withdraw";
  /** Current status of the transaction */
  status: Sep24TransactionStatus;
  /** URL with additional info for the user about the transaction */
  more_info_url?: string;
  /** ISO 8601 datetime when the transaction was started */
  started_at?: string;
  /** ISO 8601 datetime when the transaction was completed */
  completed_at?: string;
  /** Amount received (before fees) */
  amount_in?: string;
  /** Amount sent to the user after fees */
  amount_out?: string;
  /** Amount of fee charged */
  amount_fee?: string;
  /** Asset code the user is depositing/withdrawing */
  asset_code?: string;
  /** Stellar account involved in the transaction */
  stellar_account?: string;
  /** Memo for the Stellar transaction */
  memo?: string;
  /** Memo type */
  memo_type?: string;
}

export interface Sep24DepositParams {
  /** Asset code to deposit (e.g. "USDC") */
  assetCode: string;
  /** SEP-10 auth token */
  authToken: string;
  /** Stellar account to deposit to. If omitted, uses the connected wallet */
  account?: string;
  /** Email address for the anchor to contact the user */
  email_address?: string;
  /** Amount to deposit */
  amount?: string;
}

export interface Sep24WithdrawParams {
  /** Asset code to withdraw (e.g. "USDC") */
  assetCode: string;
  /** SEP-10 auth token */
  authToken: string;
  /** Amount to withdraw */
  amount?: string;
  /** Stellar account to withdraw from. If omitted, uses the connected wallet */
  account?: string;
}

export interface UseSep24Options {
  /** Override the anchor URL. Defaults to the Horizon URL base */
  anchorUrl?: string;
  /** Timeout for fetch requests in ms. Default: 30000 */
  timeout?: number;
}

export interface UseSep24Return {
  /** Initiate a deposit transaction via SEP-24 */
  deposit: (params: Sep24DepositParams) => Promise<Sep24Transaction>;
  /** Initiate a withdraw transaction via SEP-24 */
  withdraw: (params: Sep24WithdrawParams) => Promise<Sep24Transaction>;
  /** Poll/get a transaction by ID */
  getTransaction: (id: string, token: string) => Promise<Sep24Transaction>;
  /** Fetch all transactions, optionally filtered */
  getTransactions: (
    token: string,
    filters?: { assetCode?: string; kind?: "deposit" | "withdraw"; limit?: number }
  ) => Promise<Sep24Transaction[]>;
  /** `true` while any SEP-24 request is in flight */
  isLoading: boolean;
  /** Most recent error, or `null` */
  error: Error | null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Interactive deposit and withdraw via SEP-24 ( Stellar Ecosystem Proposal ).
 *
 * Wraps the SEP-24 interactive flow lifecycle — initiating deposits/withdrawals,
 * polling transaction status, and fetching transaction history.
 *
 * @param options - Optional anchor URL override
 * @returns Deposit, withdraw, and transaction query functions
 *
 * @example
 * ```tsx
 * const { deposit, withdraw, isLoading, error } = useSep24();
 *
 * const tx = await deposit({
 *   assetCode: "USDC",
 *   authToken: "eyJ...",
 *   amount: "100",
 * });
 *
 * if (tx.status === "incomplete" && tx.more_info_url) {
 *   window.open(tx.more_info_url);
 * }
 * ```
 */
export function useSep24(options?: UseSep24Options): UseSep24Return {
  const { config } = useStellarContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const baseUrl = options?.anchorUrl || config.horizonUrl.replace(/\/horizon$/, "");
  const timeout = options?.timeout ?? 30000;

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(`${baseUrl}${path}`, {
          ...init,
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          let detail = "";
          try {
            const json = JSON.parse(body);
            detail = json.error || json.message || json.type || "";
          } catch {
            detail = body.slice(0, 200);
          }
          throw new Error(
            `SEP-24 request failed (${response.status}): ${response.statusText}${detail ? ` — ${detail}` : ""}`,
          );
        }

        return (await response.json()) as T;
      } finally {
        clearTimeout(timer);
      }
    },
    [baseUrl, timeout],
  );

  const deposit = useCallback(
    async (params: Sep24DepositParams): Promise<Sep24Transaction> => {
      setIsLoading(true);
      setError(null);

      try {
        const body: Record<string, unknown> = {
          asset_code: params.assetCode,
          account: params.account,
        };
        if (params.email_address) body.email_address = params.email_address;
        if (params.amount) body.amount = params.amount;

        const tx = await request<Sep24Transaction>("/transactions/interactive", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${params.authToken}`,
          },
          body: JSON.stringify(body),
        });

        return tx;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [request],
  );

  const withdraw = useCallback(
    async (params: Sep24WithdrawParams): Promise<Sep24Transaction> => {
      setIsLoading(true);
      setError(null);

      try {
        const body: Record<string, unknown> = {
          asset_code: params.assetCode,
          account: params.account,
        };
        if (params.amount) body.amount = params.amount;

        const tx = await request<Sep24Transaction>("/transactions/interactive", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${params.authToken}`,
          },
          body: JSON.stringify(body),
        });

        return tx;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [request],
  );

  const getTransaction = useCallback(
    async (id: string, token: string): Promise<Sep24Transaction> => {
      return request<Sep24Transaction>(`/transactions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    [request],
  );

  const getTransactions = useCallback(
    async (
      token: string,
      filters?: { assetCode?: string; kind?: "deposit" | "withdraw"; limit?: number },
    ): Promise<Sep24Transaction[]> => {
      const params = new URLSearchParams();
      if (filters?.assetCode) params.set("asset_code", filters.assetCode);
      if (filters?.kind) params.set("kind", filters.kind);
      if (filters?.limit) params.set("limit", String(filters.limit));

      const query = params.toString();
      const path = `/transactions${query ? `?${query}` : ""}`;

      const response = await request<{ transactions: Sep24Transaction[] }>(path, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.transactions;
    },
    [request],
  );

  return { deposit, withdraw, getTransaction, getTransactions, isLoading, error };
}
