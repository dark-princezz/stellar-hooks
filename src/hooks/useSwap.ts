/**
 * @file useSwap.ts
 * @description Execute a token swap from a quote with slippage protection.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { nativeToScVal } from "@stellar/stellar-sdk/minimal";
import { useFreighter } from "./useFreighter";
import { useSorobanContract } from "./useSorobanContract";
import type { SwapQuote } from "./useSwapQuote";
import { getSlippageBps, isValidSlippageBps, minReceived } from "../utils/slippage";
import type { StellarTransactionError, TransactionStatus } from "../types";

export interface UseSwapOptions {
  /** Router contract address (C...). */
  routerId: string;
  /** Router method to call (default `"swap"`). */
  method?: string;
  /** Override the shared slippage tolerance (bps). Defaults to `useSlippageTolerance()`'s value. */
  slippageBps?: number;
  /** Reject quotes older than this many ms (default 30000, 0 disables). */
  maxQuoteAgeMs?: number;
  onSuccess?: (hash: string) => void;
  onError?: (error: StellarTransactionError) => void;
}

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  quote: Pick<SwapQuote, "amountOut" | "fetchedAt">;
}

export interface UseSwapReturn {
  /** Calls `swap(from, token_in, token_out, amount_in, min_out)` on the router. */
  swap: (params: SwapParams) => Promise<void>;
  /** Minimum received used by the last call, in base units. */
  minAmountOut: bigint | null;
  status: TransactionStatus;
  hash: string | null;
  error: StellarTransactionError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
}

/**
 * Build, sign and submit a swap. The contract is given `min_out` derived from the
 * quote and slippage tolerance, so it reverts if the price moves too far.
 *
 * @example
 * ```tsx
 * const { swap } = useSwap({ routerId });
 * await swap({ tokenIn, tokenOut, amountIn, quote });
 * ```
 */
export function useSwap({
  routerId,
  method = "swap",
  slippageBps,
  maxQuoteAgeMs = 30_000,
  onSuccess,
  onError,
}: UseSwapOptions): UseSwapReturn {
  const { publicKey } = useFreighter();
  const contract = useSorobanContract<unknown>(routerId, { method });
  const [validationError, setValidationError] = useState<StellarTransactionError | null>(null);
  const [minAmountOut, setMinAmountOut] = useState<bigint | null>(null);

  const swap = useCallback(
    async ({ tokenIn, tokenOut, amountIn, quote }: SwapParams) => {
      setValidationError(null);
      const fail = (message: string, resultCode: string) => {
        const error: StellarTransactionError = { type: "transaction", resultCode, message };
        setValidationError(error);
        onError?.(error);
      };
      const bps = slippageBps ?? getSlippageBps();
      if (!publicKey) return fail("No wallet connected.", "no_wallet");
      if (!isValidSlippageBps(bps)) return fail("Invalid slippage tolerance.", "invalid_slippage");
      if (amountIn <= 0n) return fail("Amount must be greater than zero.", "invalid_amount");
      if (tokenIn === tokenOut) return fail("Input and output tokens must differ.", "same_token");
      if (maxQuoteAgeMs && Date.now() - quote.fetchedAt > maxQuoteAgeMs) {
        return fail("Quote is stale. Refresh it before swapping.", "stale_quote");
      }

      const minOut = minReceived(quote.amountOut, bps);
      setMinAmountOut(minOut);
      await contract.call({
        method,
        args: [
          nativeToScVal(publicKey, { type: "address" }),
          nativeToScVal(tokenIn, { type: "address" }),
          nativeToScVal(tokenOut, { type: "address" }),
          nativeToScVal(amountIn, { type: "i128" }),
          nativeToScVal(minOut, { type: "i128" }),
        ],
        onError,
      });
    },
    [publicKey, slippageBps, maxQuoteAgeMs, method, contract, onError],
  );

  const notified = useRef<string | null>(null);
  useEffect(() => {
    if (contract.status === "success" && contract.hash && notified.current !== contract.hash) {
      notified.current = contract.hash;
      onSuccess?.(contract.hash);
    }
  }, [contract.status, contract.hash, onSuccess]);

  const reset = useCallback(() => {
    notified.current = null;
    setValidationError(null);
    setMinAmountOut(null);
    contract.reset();
  }, [contract]);

  return {
    swap,
    minAmountOut,
    status: validationError ? "error" : contract.status,
    hash: contract.hash,
    error: validationError ?? contract.error,
    isLoading: !validationError && contract.isLoading,
    isSuccess: !validationError && contract.isSuccess,
    isError: !!validationError || contract.isError,
    reset,
  };
}
