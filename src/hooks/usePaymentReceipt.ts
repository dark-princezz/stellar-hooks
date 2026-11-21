/**
 * @file usePaymentReceipt.ts
 * @description Load a confirmed payment from Horizon and expose a downloadable receipt (#1198).
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useState } from "react";
import { Horizon } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import {
  downloadReceipt,
  receiptFromHorizon,
  ReceiptError,
  type PaymentReceipt,
  type ReceiptFormat,
} from "../utils/receipt";

const PAYMENT_TYPES = new Set(["payment", "path_payment_strict_send", "path_payment_strict_receive"]);

export interface UsePaymentReceiptReturn {
  receipt: PaymentReceipt | null;
  isLoading: boolean;
  error: Error | null;
  /** Saves the receipt as a file; no-op until the receipt has loaded. */
  download: (format?: ReceiptFormat) => string | null;
  refetch: () => Promise<void>;
}

/**
 * @param transactionHash Hash of a confirmed payment (for example `hash` from `usePayment`). Pass `null` to stay idle.
 * @example
 * ```tsx
 * const { hash } = usePayment({ ... });
 * const { receipt, download } = usePaymentReceipt(hash);
 * return receipt && <button onClick={() => download("html")}>Download receipt</button>;
 * ```
 */
export function usePaymentReceipt(transactionHash: string | null | undefined): UsePaymentReceiptReturn {
  const { config, network } = useStellarContext();
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!transactionHash) {
      setReceipt(null);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const server = new Horizon.Server(config.horizonUrl);
      const tx = await server.transactions().transaction(transactionHash).call();
      const ops = await server.operations().forTransaction(transactionHash).limit(200).call();
      const payment = ops.records.find((op) => PAYMENT_TYPES.has(op.type));
      if (!payment) throw new ReceiptError("This transaction does not contain a payment");
      if (tx.successful === false) throw new ReceiptError("This transaction failed, so there is no receipt");
      setReceipt(
        receiptFromHorizon(tx as unknown as Record<string, unknown>, payment as unknown as Record<string, unknown>, String(network)),
      );
    } catch (e) {
      setReceipt(null);
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, [transactionHash, config.horizonUrl, network]);

  useEffect(() => {
    void load();
  }, [load]);

  const download = useCallback(
    (format: ReceiptFormat = "txt") => (receipt ? downloadReceipt(receipt, format) : null),
    [receipt],
  );

  return { receipt, isLoading, error, download, refetch: load };
}
