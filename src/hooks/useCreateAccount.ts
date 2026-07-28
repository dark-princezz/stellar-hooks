/**
 * @file useCreateAccount.ts
 * @description Hook for funding (via Friendbot) and creating new Stellar accounts.
 * @package stellar-hooks
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Horizon, TransactionBuilder, Operation } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import type { StellarTransactionError } from "../types";

export interface UseCreateAccountOptions {
  /** Optional Friendbot URL. If not provided, it attempts to infer from the network. */
  friendbotUrl?: string;
}

export interface UseCreateAccountReturn {
  /** Request funding for the given public key from Friendbot (Testnet/Futurenet only) */
  fundWithFriendbot: (publicKey: string) => Promise<void>;
  /** Build a CreateAccount transaction */
  buildCreateAccountTransaction: (
    sourceAccountId: string,
    destinationPublicKey: string,
    startingBalance: string,
    sequenceNumber: string,
    baseFee?: string
  ) => import("@stellar/stellar-sdk").Transaction;
  isLoading: boolean;
  error: StellarTransactionError | null;
}

/**
 * Fund a new Stellar account via Friendbot (testnet/futurenet only) or build a
 * classic `createAccount` operation for mainnet.
 *
 * @example
 * ```tsx
 * const { fundWithFriendbot, isLoading, error } = useCreateAccount();
 *
 * // Fund an account on testnet
 * await fundWithFriendbot("GNEW_PUBLIC_KEY...");
 * ```
 *
 * @example
 * ```tsx
 * // Build a createAccount transaction for mainnet
 * const { buildCreateAccountTransaction } = useCreateAccount();
 * const tx = buildCreateAccountTransaction(
 *   sourceAccountId,
 *   destinationPublicKey,
 *   "1",           // startingBalance in XLM
 *   sequenceNumber,
 * );
 * ```
 */
export function useCreateAccount(options: UseCreateAccountOptions = {}): UseCreateAccountReturn {
  const { config, network } = useStellarContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<StellarTransactionError | null>(null);

  const fundWithFriendbot = useCallback(
    async (publicKey: string) => {
      setIsLoading(true);
      setError(null);

      try {
        let url = options.friendbotUrl;
        if (!url) {
          if (network === "testnet") {
            url = "https://friendbot.stellar.org";
          } else if (network === "futurenet") {
            url = "https://friendbot-futurenet.stellar.org";
          } else {
            throw new Error("Friendbot is only available on testnet or futurenet.");
          }
        }

        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        const response = await fetch(`${url}?addr=${encodeURIComponent(publicKey)}`, {
          signal: abortControllerRef.current.signal,
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const err: StellarTransactionError = {
            type: "network",
            message: errorData?.detail || `Friendbot request failed with status ${response.status}`,
          };
          setError(err);
          throw err;
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        let parsedError: StellarTransactionError;
        if (typeof err === 'object' && err !== null && 'type' in err) {
          parsedError = err as StellarTransactionError;
        } else {
          const message = err instanceof Error ? err.message : String(err);
          parsedError = {
            type: "network",
            message,
          };
        }
        setError(parsedError);
        throw parsedError;
      } finally {
        setIsLoading(false);
      }
    },
    [network, options.friendbotUrl]
  );

  const buildCreateAccountTransaction = useCallback(
    (
      sourceAccountId: string,
      destinationPublicKey: string,
      startingBalance: string,
      sequenceNumber: string,
      baseFee: string = "100"
    ) => {
      // Create a dummy account object just for the builder
      const sourceAccount = new Horizon.AccountResponse({
        account_id: sourceAccountId,
        sequence: sequenceNumber,
        subentry_count: 0,
        balances: [],
        signers: [],
        thresholds: { low_threshold: 0, med_threshold: 0, high_threshold: 0 },
        flags: { auth_required: false, auth_revocable: false, auth_immutable: false },
        id: sourceAccountId,
        paging_token: "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _links: {} as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      return new TransactionBuilder(sourceAccount, {
        fee: baseFee,
        networkPassphrase: config.networkPassphrase,
      })
        .addOperation(
          Operation.createAccount({
            destination: destinationPublicKey,
            startingBalance,
          })
        )
        .setTimeout(30)
        .build();
    },
    [config.networkPassphrase]
  );

  return {
    fundWithFriendbot,
    buildCreateAccountTransaction,
    isLoading,
    error,
  };
}
