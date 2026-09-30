/**
 * @file useCurrencyDisplay.ts
 * @description Hook for rendering a Stellar amount in both its native asset units
 * and the viewer's local fiat currency.
 * @package stellar-hooks
 * @license MIT
 */

import { useMemo } from "react";
import {
  formatAssetAmount,
  type FormatAssetAmountOptions,
} from "../utils/formatAmount";

export interface UseCurrencyDisplayOptions {
  /** Amount in whole asset units, as a number or a decimal string. */
  amount: string | number | null | undefined;
  /** Asset code shown with the native figure, for example "XLM". */
  assetCode?: string;
  /** Fiat value of one whole asset unit. Omit to render the native amount alone. */
  fiatRate?: number | null;
  /** ISO 4217 code for the fiat figure, for example "USD". */
  fiatCurrency?: string;
  /** BCP 47 tag or tags used for grouping and separators. Defaults to the runtime locale. */
  locale?: string | string[];
  /** Significant digits kept on the fiat figure. Default: 2. */
  fiatDigits?: number;
  /**
   * Extra options forwarded to {@link formatAssetAmount}, for example to change
   * the maximum fraction digits or the asset code position.
   */
  formatOptions?: FormatAssetAmountOptions;
}

export interface UseCurrencyDisplayReturn {
  /** Native figure with its asset code, for example "12.5000000 XLM". */
  assetText: string;
  /** Fiat figure with its currency symbol, or null when no usable rate was given. */
  fiatText: string | null;
  /** Native and fiat together, for example "12.5000000 XLM (~$1.43)". */
  combinedText: string;
  /** The fiat figure as a number, or null when no usable rate was given. */
  fiatValue: number | null;
}

/**
 * Render an amount in its native asset units and, when a rate is available, in
 * the viewer's local currency.
 *
 * The fiat conversion is presentation only: the rate is passed in by the caller,
 * so this hook never issues a network request of its own. Pair it with a price
 * hook such as {@link useOraclePrice} to supply the rate.
 *
 * @example
 * ```tsx
 * const { combinedText, fiatValue } = useCurrencyDisplay({
 *   amount: "12.5",
 *   assetCode: "XLM",
 *   fiatRate: 0.114,
 *   fiatCurrency: "USD",
 *   locale: "en-US",
 * });
 *
 * combinedText; // "12.5000000 XLM (~$1.43)"
 * fiatValue;    // 1.425
 * ```
 */
export function useCurrencyDisplay(
  options: UseCurrencyDisplayOptions,
): UseCurrencyDisplayReturn {
  const {
    amount,
    assetCode,
    fiatRate = null,
    fiatCurrency,
    locale,
    fiatDigits = 2,
    formatOptions,
  } = options;

  return useMemo(() => {
    const assetText = formatAssetAmount(amount, {
      assetCode,
      assetPosition: assetCode ? "suffix" : "none",
      locale,
      ...formatOptions,
    });

    const numeric =
      typeof amount === "string" ? Number(amount) : (amount ?? Number.NaN);
    const usableAmount = Number.isFinite(numeric) ? (numeric as number) : null;
    const usableRate =
      typeof fiatRate === "number" && Number.isFinite(fiatRate) ? fiatRate : null;

    if (usableAmount === null || usableRate === null) {
      return { assetText, fiatText: null, combinedText: assetText, fiatValue: null };
    }

    const fiatValue = usableAmount * usableRate;
    const fiatText = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: fiatCurrency,
      minimumFractionDigits: fiatDigits,
      maximumFractionDigits: fiatDigits,
    }).format(fiatValue);

    return {
      assetText,
      fiatText,
      combinedText: `${assetText} (~${fiatText})`,
      fiatValue,
    };
  }, [
    amount,
    assetCode,
    fiatRate,
    fiatCurrency,
    locale,
    fiatDigits,
    formatOptions,
  ]);
}
