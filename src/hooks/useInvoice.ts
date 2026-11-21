/**
 * @file useInvoice.ts
 * @description Hook for creating an invoice reference and watching for incoming Stellar payments carrying that memo.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOptionalStellarContext } from "../context";

export type InvoiceStatus = "pending" | "partial" | "paid" | "overpaid" | "expired";

export interface InvoiceMatchedPayment {
  transactionHash: string;
  from: string;
  amount: string;
  assetCode?: string;
  createdAt: string;
}

export interface UseInvoiceOptions {
  /** Recipient Stellar address expecting payment */
  recipient?: string;
  /** Expected amount to receive (e.g. "25.00" or 25) */
  expectedAmount: string | number;
  /** Optional asset code (defaults to XLM / native) */
  assetCode?: string;
  /** Optional asset issuer if credit asset */
  assetIssuer?: string;
  /** Unique memo identifier. If omitted, generates a unique numeric/text reference */
  memo?: string;
  /** Memo type: "text" | "id" | "hash" (default: "text") */
  memoType?: "text" | "id" | "hash";
  /** Horizon server URL (defaults to context config) */
  horizonUrl?: string;
  /** Polling interval in milliseconds. Default: 4000ms */
  pollInterval?: number;
  /** Whether watching is active. Default: true */
  enabled?: boolean;
  /** Expiration timestamp in milliseconds */
  expiresAt?: number;
  /** Callback fired when a matching payment is received */
  onPaymentReceived?: (payment: InvoiceMatchedPayment, totalReceived: number) => void;
  /** Callback fired when invoice is fully paid or overpaid */
  onPaid?: (totalReceived: number) => void;
}

export interface UseInvoiceReturn {
  /** The invoice memo reference to attach to payment requests */
  memo: string;
  /** Memo type */
  memoType: "text" | "id" | "hash";
  /** Recipient destination address */
  recipient: string;
  /** Expected amount formatted string */
  expectedAmount: string;
  /** Total received amount string */
  receivedAmount: string;
  /** Current payment status */
  status: InvoiceStatus;
  /** True if receivedAmount >= expectedAmount */
  isPaid: boolean;
  /** True if receivedAmount > 0 and < expectedAmount */
  isPartial: boolean;
  /** True if receivedAmount > expectedAmount */
  isOverpaid: boolean;
  /** True if expired */
  isExpired: boolean;
  /** List of matching payments detected */
  payments: InvoiceMatchedPayment[];
  /** Whether a check is currently in progress */
  isLoading: boolean;
  /** Last error encountered during polling */
  error: Error | null;
  /** Manually trigger a payment check */
  checkNow: () => Promise<void>;
  /** Reset invoice state or assign a new memo */
  reset: (newMemo?: string) => void;
}

function generateInvoiceMemo(memoType: "text" | "id" | "hash"): string {
  if (memoType === "id") {
    // Unsigned 64-bit safe positive random integer
    return String(Math.floor(100000 + Math.random() * 900000));
  }
  if (memoType === "hash") {
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  // text memo (max 28 bytes)
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${Date.now().toString().slice(-6)}-${rand}`.slice(0, 28);
}

/**
 * Hook for memo-based payment reconciliation. Creates an invoice reference
 * and monitors Horizon for incoming payments carrying that memo, tracking
 * whether the invoice is pending, partial, paid, or overpaid.
 */
export function useInvoice(options: UseInvoiceOptions): UseInvoiceReturn {
  const context = useOptionalStellarContext();
  const memoType = options.memoType ?? "text";

  const [memo, setMemo] = useState<string>(
    () => options.memo ?? generateInvoiceMemo(memoType)
  );

  const [payments, setPayments] = useState<InvoiceMatchedPayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const recipient = options.recipient ?? "";
  const expectedAmountStr = String(options.expectedAmount);
  const expectedAmountNum = Number(options.expectedAmount);
  const horizonUrl =
    options.horizonUrl ??
    context?.config?.horizonUrl ??
    "https://horizon-testnet.stellar.org";
  const pollInterval = options.pollInterval ?? 4000;
  const enabled = (options.enabled ?? true) && Boolean(recipient) && Boolean(memo);

  const seenTxHashes = useRef<Set<string>>(new Set());
  const onPaidTriggered = useRef(false);

  // Calculate total received amount
  const totalReceivedNum = useMemo(() => {
    return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  const receivedAmount = totalReceivedNum.toFixed(7).replace(/\.?0+$/, "") || "0";

  // Determine status
  const isExpired = options.expiresAt ? Date.now() > options.expiresAt : false;
  const isPaid = totalReceivedNum >= expectedAmountNum && expectedAmountNum > 0;
  const isPartial = totalReceivedNum > 0 && totalReceivedNum < expectedAmountNum;
  const isOverpaid = totalReceivedNum > expectedAmountNum;

  let status: InvoiceStatus = "pending";
  if (isExpired && totalReceivedNum === 0) {
    status = "expired";
  } else if (isOverpaid) {
    status = "overpaid";
  } else if (isPaid) {
    status = "paid";
  } else if (isPartial) {
    status = "partial";
  }

  // Trigger onPaid callback when fully paid
  useEffect(() => {
    if ((isPaid || isOverpaid) && !onPaidTriggered.current) {
      onPaidTriggered.current = true;
      options.onPaid?.(totalReceivedNum);
    }
  }, [isPaid, isOverpaid, totalReceivedNum, options]);

  const checkNow = useCallback(async () => {
    if (!recipient || !memo) return;

    try {
      setIsLoading(true);
      setError(null);

      const endpoint = `${horizonUrl.replace(/\/$/, "")}/accounts/${encodeURIComponent(
        recipient
      )}/transactions?order=desc&limit=20`;

      const res = await fetch(endpoint);
      if (!res.ok) {
        throw new Error(`Failed to query Horizon: HTTP ${res.status}`);
      }

      const data = await res.json();
      const records = data._embedded?.records ?? [];

      const matched: InvoiceMatchedPayment[] = [];

      for (const tx of records) {
        if (!tx.successful) continue;
        if (tx.memo !== memo) continue;

        // Fetch transaction operations to get exact payment amounts
        try {
          const opsRes = await fetch(tx._links?.operations?.href ?? `${horizonUrl.replace(/\/$/, "")}/transactions/${tx.hash}/operations`);
          if (opsRes.ok) {
            const opsData = await opsRes.json();
            const ops = opsData._embedded?.records ?? [];

            for (const op of ops) {
              if (op.type === "payment" && op.to === recipient) {
                // If asset filter specified
                if (options.assetCode && op.asset_code !== options.assetCode) continue;

                matched.push({
                  transactionHash: tx.hash,
                  from: op.from,
                  amount: op.amount,
                  assetCode: op.asset_code ?? "XLM",
                  createdAt: tx.created_at,
                });

                if (!seenTxHashes.current.has(tx.hash)) {
                  seenTxHashes.current.add(tx.hash);
                  options.onPaymentReceived?.(
                    {
                      transactionHash: tx.hash,
                      from: op.from,
                      amount: op.amount,
                      assetCode: op.asset_code ?? "XLM",
                      createdAt: tx.created_at,
                    },
                    totalReceivedNum + Number(op.amount)
                  );
                }
              }
            }
          }
        } catch {
          // If individual ops fetch fails, skip this tx
        }
      }

      setPayments(matched);
      setIsLoading(false);
    } catch (err: unknown) {
      setIsLoading(false);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [recipient, memo, horizonUrl, options, totalReceivedNum]);

  // Polling effect
  useEffect(() => {
    if (!enabled || isPaid || isOverpaid || isExpired) return;

    let active = true;
    const intervalId = setInterval(() => {
      if (active) {
        checkNow();
      }
    }, pollInterval);

    // Initial check
    checkNow();

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [enabled, pollInterval, isPaid, isOverpaid, isExpired, checkNow]);

  const reset = useCallback(
    (newMemo?: string) => {
      const generated = newMemo ?? generateInvoiceMemo(memoType);
      setMemo(generated);
      setPayments([]);
      setError(null);
      seenTxHashes.current.clear();
      onPaidTriggered.current = false;
    },
    [memoType]
  );

  return {
    memo,
    memoType,
    recipient,
    expectedAmount: expectedAmountStr,
    receivedAmount,
    status,
    isPaid,
    isPartial,
    isOverpaid,
    isExpired,
    payments,
    isLoading,
    error,
    checkNow,
    reset,
  };
}
