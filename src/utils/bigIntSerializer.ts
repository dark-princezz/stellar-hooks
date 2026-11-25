/**
 * @file bigIntSerializer.ts
 * @description BigInt-safe JSON serialization utilities.
 *
 * JavaScript's `JSON.stringify` throws a `TypeError` when it encounters a
 * `bigint` value. Soroban smart-contract hooks return balances, sequence
 * numbers, and vote tallies as `bigint`, so any code path that serializes
 * hook state — devtools output, JSON export, clipboard copy — must handle
 * `bigint` explicitly.
 *
 * These utilities convert every `bigint` to its decimal string representation
 * so the resulting JSON is valid and lossless for values beyond
 * `Number.MAX_SAFE_INTEGER`.
 *
 * @package stellar-hooks
 * @license MIT
 */

/**
 * A `JSON.stringify` replacer that converts `bigint` values to their decimal
 * string representation (e.g. `9007199254740993n` → `"9007199254740993"`).
 *
 * Pass this as the second argument to `JSON.stringify` wherever hook state,
 * devtools output, or export payloads may contain Soroban `bigint` values.
 *
 * @example
 * ```ts
 * JSON.stringify({ balance: 9007199254740993n }, bigIntReplacer, 2);
 * // → '{\n  "balance": "9007199254740993"\n}'
 * ```
 */
export function bigIntReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

/**
 * Drop-in replacement for `JSON.stringify` that never throws on `bigint`
 * values. All `bigint`s are serialized as their decimal string representation
 * so the output is valid JSON.
 *
 * Any replacer you supply is applied *after* the BigInt conversion, allowing
 * you to compose additional transformations.
 *
 * @param value    - The value to serialize.
 * @param indent   - Passed to `JSON.stringify` as the `space` argument.
 * @param replacer - Optional additional replacer applied after BigInt conversion.
 *
 * @example
 * ```ts
 * safeJsonStringify({ balance: 500n, label: "XLM" }, 2);
 * // → '{\n  "balance": "500",\n  "label": "XLM"\n}'
 * ```
 */
export function safeJsonStringify(
  value: unknown,
  indent?: number | string,
  replacer?: (key: string, val: unknown) => unknown,
): string {
  const combined = (key: string, val: unknown): unknown => {
    const afterBigInt = bigIntReplacer(key, val);
    return replacer ? replacer(key, afterBigInt) : afterBigInt;
  };
  return JSON.stringify(value, combined, indent);
}
