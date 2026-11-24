/**
 * @file useBridgeTransfer.ts
 * @description Start a cross-chain bridge transfer from the connected Stellar account.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useState } from "react";
import { useFreighter } from "./useFreighter";
import type { BridgeQuoteParams } from "./useBridgeQuote";

export interface BridgeTransferParams extends BridgeQuoteParams {
  /** Recipient address on the destination chain. */
  destinationAddress: string;
  /** Quote id from `useBridgeQuote`, if the provider requires one. */
  quoteId?: string;
}

export interface BridgeTransfer {
  /** Identifier for tracking the transfer with the provider. */
  transferId: string;
  /** Optional deposit instructions (address / memo / unsigned XDR) returned by the provider. */
  deposit?: Record<string, unknown>;
}

export interface UseBridgeTransferOptions {
  /** Bridge API base URL. Transfers are started with `POST {baseUrl}/transfers`. */
  baseUrl: string;
  /** Optional provider-specific response mapper. */
  parseResponse?: (json: unknown) => BridgeTransfer;
  onSuccess?: (transfer: BridgeTransfer) => void;
  onError?: (error: Error) => void;
}

export interface UseBridgeTransferReturn {
  transfer: (params: BridgeTransferParams) => Promise<BridgeTransfer | null>;
  /** Tracking identifier of the last started transfer. */
  transferId: string | null;
  data: BridgeTransfer | null;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

function defaultParse(json: unknown): BridgeTransfer {
  const t = json as { transferId?: string; id?: string; deposit?: Record<string, unknown> } | null;
  const transferId = t?.transferId ?? t?.id;
  if (!transferId) throw new Error("Bridge response did not include a transfer id.");
  return { transferId, deposit: t?.deposit };
}

/**
 * Initiate a bridge transfer for the connected account and return an id for tracking it.
 * Signing any returned deposit transaction is left to the caller.
 *
 * @example
 * ```tsx
 * const { transfer, transferId } = useBridgeTransfer({ baseUrl: "https://bridge.example.com" });
 * await transfer({ fromChain: "stellar", toChain: "ethereum", asset: "USDC", amount: "100",
 *   destinationAddress: "0xabc..." });
 * ```
 */
export function useBridgeTransfer({
  baseUrl,
  parseResponse = defaultParse,
  onSuccess,
  onError,
}: UseBridgeTransferOptions): UseBridgeTransferReturn {
  const { publicKey } = useFreighter();
  const [data, setData] = useState<BridgeTransfer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const transfer = useCallback(
    async (params: BridgeTransferParams) => {
      const fail = (message: string) => {
        const err = new Error(message);
        setError(err);
        onError?.(err);
        return null;
      };
      setError(null);
      if (!publicKey) return fail("No wallet connected.");
      if (!(Number(params.amount) > 0)) return fail("Amount must be greater than zero.");
      if (!params.destinationAddress) return fail("Destination address is required.");

      setIsLoading(true);
      try {
        const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/transfers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...params, sourceAddress: publicKey }),
        });
        if (!res.ok) throw new Error(`Bridge transfer failed (${res.status}): ${res.statusText}`);
        const result = parseResponse(await res.json());
        setData(result);
        onSuccess?.(result);
        return result;
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    },
    [baseUrl, publicKey, parseResponse, onSuccess, onError],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { transfer, transferId: data?.transferId ?? null, data, isLoading, error, reset };
}
