/**
 * Standalone helper for issue #915: fiat-value conversion helper built on
 * `useOraclePrice`-style oracle data, for wallet-style UIs.
 *
 * This file is self-contained and does not wire into existing exports/hooks.
 */

export interface OraclePriceLike {
  /** Price of 1 unit of asset in quote currency (e.g. USD). */
  price: number | string | null | undefined;
  /** Optional decimals/precision metadata from oracle. */
  decimals?: number;
  /** Optional quote currency label, e.g. "USD". */
  quoteCurrency?: string;
}

export interface UseOraclePriceLikeResult {
  data?: OraclePriceLike | null;
  price?: number | string | null;
  loading?: boolean;
  isLoading?: boolean;
  error?: Error | null;
}

export interface FormatFiatValueOptions {
  locale?: string;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  fallback?: string;
}

export function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function convertAssetAmountToFiat(
  amount: number | string | null | undefined,
  oracle: OraclePriceLike | UseOraclePriceLikeResult | null | undefined,
): number | null {
  const amountNum = toNumber(amount);
  if (amountNum === null) return null;

  const priceSource = (oracle as UseOraclePriceLikeResult | null | undefined)?.data ?? oracle;
  const rawPrice =
    toNumber((priceSource as OraclePriceLike | null | undefined)?.price) ??
    toNumber((oracle as UseOraclePriceLikeResult | null | undefined)?.price);
  if (rawPrice === null) return null;

  const decimals = (priceSource as OraclePriceLike | null | undefined)?.decimals;
  const normalizedPrice =
    typeof decimals === "number" && Number.isFinite(decimals) ? rawPrice / 10 ** decimals : rawPrice;

  const fiat = amountNum * normalizedPrice;
  return Number.isFinite(fiat) ? fiat : null;
}

export function formatFiatValue(
  fiatValue: number | null,
  options: FormatFiatValueOptions = {},
): string {
  const {
    locale = "en-US",
    currency = "USD",
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    fallback = "—",
  } = options;
  if (fiatValue === null || !Number.isFinite(fiatValue)) return fallback;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(fiatValue);
}

/**
 * UI-friendly helper that can sit on top of `useOraclePrice` output.
 * Example:
 * const oracle = useOraclePrice(...);
 * const fiat = useFiatValueFromOracle(balance, oracle, { currency: 'USD' });
 */
export function useFiatValueFromOracle(
  amount: number | string | null | undefined,
  oracle: OraclePriceLike | UseOraclePriceLikeResult | null | undefined,
  options: FormatFiatValueOptions = {},
) {
  const value = convertAssetAmountToFiat(amount, oracle);
  const quoteCurrency =
    options.currency ??
    ((oracle as UseOraclePriceLikeResult | null | undefined)?.data as OraclePriceLike | null | undefined)
      ?.quoteCurrency ??
    "USD";
  return {
    value,
    formatted: formatFiatValue(value, { ...options, currency: quoteCurrency }),
    loading: Boolean(
      (oracle as UseOraclePriceLikeResult | null | undefined)?.loading ??
        (oracle as UseOraclePriceLikeResult | null | undefined)?.isLoading,
    ),
    error: ((oracle as UseOraclePriceLikeResult | null | undefined)?.error ?? null) as Error | null,
  };
}
