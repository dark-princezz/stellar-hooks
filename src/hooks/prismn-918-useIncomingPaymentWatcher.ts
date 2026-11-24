import { useCallback, useMemo, useState } from "react";
import { useHorizonStream } from "./useHorizonStream";

export interface IncomingPaymentLike {
  id: string;
  type?: string;
  type_i?: number;
  from?: string;
  to?: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  created_at?: string;
  transaction_hash?: string;
  paging_token?: string;
  [key: string]: unknown;
}

export interface UseIncomingPaymentWatcherOptions {
  accountId?: string;
  enabled?: boolean;
  cursor?: string;
  limit?: number;
  /** Optional filter for a specific asset; native/XLM can be matched by asset_type=native. */
  assetCode?: string;
  assetIssuer?: string;
  onPayment?: (payment: IncomingPaymentLike) => void;
}

/**
 * Standalone helper for issue #918: watch an account payments/operations stream
 * and surface new incoming payments for merchant-style checkout flows.
 */
export function useIncomingPaymentWatcher(options: UseIncomingPaymentWatcherOptions) {
  const { accountId, enabled = true, cursor = "now", limit, assetCode, assetIssuer, onPayment } = options;
  const [payments, setPayments] = useState<IncomingPaymentLike[]>([]);

  const matchesAsset = useCallback(
    (p: IncomingPaymentLike) => {
      if (!assetCode && !assetIssuer) return true;
      if (assetCode === "XLM" || assetCode === "native") return p.asset_type === "native";
      if (assetCode && p.asset_code !== assetCode) return false;
      if (assetIssuer && p.asset_issuer !== assetIssuer) return false;
      return true;
    },
    [assetCode, assetIssuer],
  );

  const handleMessage = useCallback(
    (record: IncomingPaymentLike) => {
      const isPayment = record.type === "payment" || record.type === "create_account" || record.type_i === 1 || record.type_i === 0;
      const isIncoming = !accountId || record.to === accountId || record.type === "create_account";
      if (!isPayment || !isIncoming || !matchesAsset(record)) return;
      setPayments((prev) => {
        if (prev.some((p) => p.id === record.id || (p.paging_token && p.paging_token === record.paging_token))) return prev;
        return [record, ...prev].slice(0, 100);
      });
      onPayment?.(record);
    },
    [accountId, matchesAsset, onPayment],
  );

  const stream = useHorizonStream<IncomingPaymentLike>({
    resource: "operations",
    accountId,
    cursor,
    limit,
    enabled: enabled && !!accountId,
    onMessage: handleMessage,
  });

  const latestIncomingPayment = useMemo(() => payments[0] ?? null, [payments]);

  return {
    ...stream,
    payments,
    latestIncomingPayment,
    clear: () => setPayments([]),
  };
}
