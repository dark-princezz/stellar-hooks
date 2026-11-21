/**
 * @file useRefund.ts
 * @description Hook for issuing full or partial refund payments to the original sender.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useMemo, useState } from "react";
import { useOptionalStellarContext } from "../context";
import {
  buildRefundPayment,
  validateRefund,
  ReceivedPaymentInfo,
  RefundPaymentOptions,
  RefundValidationResult,
  RefundPaymentResult,
} from "../utils/refund";

export interface UseRefundOptions {
  /** Original received payment details */
  payment?: ReceivedPaymentInfo | null;
  /** Callback fired on successful refund */
  onSuccess?: (result: RefundPaymentResult) => void;
  /** Callback fired on refund error */
  onError?: (error: Error) => void;
}

export interface UseRefundReturn {
  /** Builds the refund payment operation and validates amounts */
  buildRefund: (overrideOptions?: RefundPaymentOptions) => RefundPaymentResult;
  /** Validation result for the current payment and refund options */
  validate: (overrideOptions?: RefundPaymentOptions) => RefundValidationResult;
  /** Whether a refund operation is currently being prepared */
  isPreparing: boolean;
  /** Last error encountered */
  error: Error | null;
  /** Clear error state */
  reset: () => void;
}

/**
 * Hook for building return payments to the original sender of a received payment,
 * with built-in validation preventing excess refunds.
 */
export function useRefund(options: UseRefundOptions = {}): UseRefundReturn {
  const context = useOptionalStellarContext();
  const [error, setError] = useState<Error | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  const payment = options.payment;

  const validate = useCallback(
    (overrideOptions: RefundPaymentOptions = {}): RefundValidationResult => {
      if (!payment) {
        return {
          isValid: false,
          errors: ["No payment provided to refund."],
          validatedRefundAmount: "0",
          isPartial: false,
          isFull: false,
        };
      }
      return validateRefund(payment, overrideOptions);
    },
    [payment]
  );

  const buildRefund = useCallback(
    (overrideOptions: RefundPaymentOptions = {}): RefundPaymentResult => {
      if (!payment) {
        const err = new Error("No payment provided to refund.");
        setError(err);
        options.onError?.(err);
        throw err;
      }

      setIsPreparing(true);
      setError(null);

      try {
        const mergedOpts: RefundPaymentOptions = {
          networkPassphrase: context?.config?.networkPassphrase,
          ...overrideOptions,
        };

        const result = buildRefundPayment(payment, mergedOpts);
        setIsPreparing(false);
        options.onSuccess?.(result);
        return result;
      } catch (err: unknown) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setIsPreparing(false);
        setError(errorObj);
        options.onError?.(errorObj);
        throw errorObj;
      }
    },
    [payment, context, options]
  );

  const reset = useCallback(() => {
    setError(null);
    setIsPreparing(false);
  }, []);

  return {
    buildRefund,
    validate,
    isPreparing,
    error,
    reset,
  };
}
