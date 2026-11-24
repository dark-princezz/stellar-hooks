/**
 * @file useStellarPaymentQR.ts
 * @description Build a SEP-7 payment URI / QR payload from recipient, asset and amount.
 * @package stellar-hooks
 * @license MIT
 */

import { useMemo } from "react";
import { buildSep7PayUri, validateSep7Pay, type Sep7PayParams } from "../utils/sep7";

export type UseStellarPaymentQROptions = Partial<Sep7PayParams>;

export interface UseStellarPaymentQRReturn {
  /** SEP-7 URI; empty string while the inputs are invalid. */
  uri: string;
  /** Value to encode in a QR code (same as `uri`). */
  qrValue: string;
  isValid: boolean;
  errors: string[];
}

/**
 * Generate a SEP-0007 compliant `web+stellar:pay` payload for point-of-sale checkout.
 * Pass `qrValue` to any QR renderer.
 *
 * @example
 * ```tsx
 * const { qrValue, isValid } = useStellarPaymentQR({
 *   destination: "GA5Z...", amount: "12.5", assetCode: "USDC", assetIssuer: "GBBD...",
 * });
 * ```
 */
export function useStellarPaymentQR(options: UseStellarPaymentQROptions): UseStellarPaymentQRReturn {
  const { destination = "", amount, assetCode, assetIssuer, memo, memoType, message, networkPassphrase, callback } =
    options;
  return useMemo(() => {
    const params: Sep7PayParams = {
      destination,
      amount: amount || undefined,
      assetCode: assetCode || undefined,
      assetIssuer: assetIssuer || undefined,
      memo: memo || undefined,
      memoType,
      message: message || undefined,
      networkPassphrase,
      callback,
    };
    const errors = validateSep7Pay(params);
    const uri = errors.length ? "" : buildSep7PayUri(params);
    return { uri, qrValue: uri, isValid: errors.length === 0, errors };
  }, [destination, amount, assetCode, assetIssuer, memo, memoType, message, networkPassphrase, callback]);
}
