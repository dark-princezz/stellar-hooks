/**
 * @file assetSafety.ts
 * @description Detect asset codes that resemble well-known Stellar assets, including
 * codes that differ only by visually confusable (homoglyph) characters, so that UIs
 * can warn users about potential impersonation.
 * @package stellar-hooks
 */

import { useCallback } from "react";
import type { StellarBalance } from "../types";

/**
 * A well-known asset code (optionally pinned to its canonical issuer) that other
 * codes can be compared against.
 */
export interface WellKnownAsset {
  /** Canonical asset code, e.g. `"USDC"`. */
  code: string;
  /**
   * Canonical issuer public key when the asset has a single well-known issuer.
   * Omit when multiple issuers are legitimate or the issuer is not pinned.
   */
  issuer?: string;
}

/**
 * Well-known Stellar asset codes worth warning about. XLM is included for
 * completeness but is the native asset and has no issuer.
 */
export const WELL_KNOWN_ASSETS: readonly WellKnownAsset[] = [
  { code: "XLM" },
  { code: "USDC", issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5" },
  { code: "EURC", issuer: "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2" },
  { code: "USDT" },
  { code: "PYUSD" },
  { code: "XAUT" },
  { code: "AUDIO" },
  { code: "MERID" },
  { code: "DEJ" },
] as const;

/** Why an asset code was flagged as resembling a well-known asset. */
export type AssetCodeFlagReason =
  /** Code differs from the well-known code only by visually confusable characters. */
  | "confusable-characters"
  /** Code is a near-miss edit distance away from a well-known code. */
  | "similar-code"
  /** Exact code match but the issuer is not the canonical one. */
  | "issuer-mismatch";

/** A well-known asset that a given code resembles. */
export interface AssetCodeMatch {
  /** The well-known asset code that was matched. */
  code: string;
  /** Canonical issuer for that asset, when known. */
  issuer?: string;
  /** 0–1 similarity score between the checked code and the well-known code. */
  similarity: number;
  reasons: AssetCodeFlagReason[];
}

export interface AssetCodeSafetyReport {
  /** True when the code was flagged as resembling a well-known asset. */
  flagged: boolean;
  /** The asset code that was checked. */
  code: string;
  /** The issuer that was checked, if provided. */
  issuer?: string;
  /** Normalized (confusables folded) form of `code`. */
  normalizedCode: string;
  /** Well-known assets this code resembles. Empty when not flagged. */
  matches: AssetCodeMatch[];
}

/**
 * Maps visually confusable characters (Cyrillic, Greek, digits, punctuation) to
 * their Latin ASCII lookalikes so `UDC` folds to `USDC`. Keys are matched after
 * `toUpperCase()`, so only case-insensitive forms are needed.
 */
const CONFUSABLES: Readonly<Record<string, string>> = {
  // Cyrillic capitals that look like Latin letters/digits
  "А": "A", "В": "B", "Е": "E", "К": "K", "М": "M", "Н": "H",
  "О": "O", "Р": "P", "С": "C", "Т": "T", "Х": "X", "Ѕ": "S",
  "І": "I", "Ј": "J", "З": "3", "Ч": "4", "Ү": "Y", "Ԛ": "Q",
  // Greek capitals
  "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H", "Ι": "I",
  "Κ": "K", "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T",
  "Χ": "X", "Υ": "Y",
  // Greek lowercase (toUpperCase does not fold these)
  "α": "A", "β": "B", "ε": "E", "η": "H", "ι": "I", "κ": "K",
  "μ": "M", "ν": "N", "ο": "O", "ρ": "P", "τ": "T", "υ": "Y",
  "χ": "X", "ω": "W",
  // Digits / punctuation / fullwidth lookalikes
  "0": "O", "1": "I", "3": "E", "5": "S", "8": "B", "9": "G",
  "!": "I", "|": "I", "ℓ": "L", "Ｉ": "I", "０": "O", "１": "I",
  "５": "S", "８": "B", "ɡ": "G", "ո": "N",
};

/**
 * Normalizes an asset code for comparison: NFKC, trims, uppercases, and folds
 * visually confusable characters to their ASCII lookalikes.
 */
export function normalizeAssetCode(code: string): string {
  let out = "";
  for (const ch of code.normalize("NFKC").trim().toUpperCase()) {
    out += CONFUSABLES[ch] ?? ch;
  }
  return out;
}

/** Classic Levenshtein edit distance. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

/**
 * Maximum tolerated edit distance between a code and a well-known code before
 * it is considered a near-miss impersonation attempt.
 */
function maxSimilarDistance(code: string): number {
  return code.length <= 5 ? 1 : 2;
}

function similarityScore(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - editDistance(a, b) / maxLen;
}

/**
 * Checks whether an asset code resembles a well-known asset and should be
 * flagged by a UI.
 *
 * An asset is flagged when:
 * - its normalized form exactly matches a well-known code but the raw code uses
 *   confusable characters (e.g. `UDC` with a Cyrillic ), or
 * - it is within a small edit distance of a well-known code (e.g. `USDO`, `USD`), or
 * - it exactly matches a well-known code but a different issuer was supplied and
 *   it is not the canonical issuer (e.g. `USDC` from a non-Circle account).
 *
 * @param code - The asset code to check.
 * @param issuer - Optional issuer public key. When provided, an exact code match
 *   against an asset with a canonical issuer is flagged unless it matches.
 * @param wellKnownAssets - Override the comparison list (defaults to
 *   {@link WELL_KNOWN_ASSETS}).
 * @returns A report describing whether the code was flagged and why.
 *
 * @example
 * ```ts
 * checkAssetCodeSafety("UDC").flagged; // true — Cyrillic 
 * checkAssetCodeSafety("USDO").flagged; // true — one edit away from USDC
 * checkAssetCodeSafety("USDC").flagged; // false — exact known code
 * ```
 */
export function checkAssetCodeSafety(
  code: string,
  issuer?: string,
  wellKnownAssets: readonly WellKnownAsset[] = WELL_KNOWN_ASSETS
): AssetCodeSafetyReport {
  const trimmed = code.trim();
  const normalized = normalizeAssetCode(trimmed);
  const matches: AssetCodeMatch[] = [];

  for (const known of wellKnownAssets) {
    const knownNorm = normalizeAssetCode(known.code);
    const reasons: AssetCodeFlagReason[] = [];

    if (normalized === knownNorm) {
      if (normalized !== trimmed.toUpperCase()) {
        // Folding changed the code → confusable (non-ASCII) characters were used.
        reasons.push("confusable-characters");
      } else if (known.issuer && issuer && issuer !== known.issuer) {
        reasons.push("issuer-mismatch");
      } else {
        continue; // exact known code, canonical or unknown issuer → safe
      }
    } else {
      const distance = editDistance(normalized, knownNorm);
      if (distance > 0 && distance <= maxSimilarDistance(knownNorm)) {
        reasons.push("similar-code");
      } else {
        continue;
      }
    }

    matches.push({
      code: known.code,
      issuer: known.issuer,
      similarity: similarityScore(normalized, knownNorm),
      reasons,
    });
  }

  return {
    flagged: matches.length > 0,
    code: trimmed,
    issuer,
    normalizedCode: normalized,
    matches,
  };
}

/** Convenience boolean wrapper around {@link checkAssetCodeSafety}. */
export function isSuspiciousAssetCode(
  code: string,
  issuer?: string,
  wellKnownAssets: readonly WellKnownAsset[] = WELL_KNOWN_ASSETS
): boolean {
  return checkAssetCodeSafety(code, issuer, wellKnownAssets).flagged;
}

/**
 * Checks the safety of an asset balance's code. Native (XLM) balances are never
 * flagged. Returns `null` when the balance has no `assetCode`.
 */
export function checkAssetBalanceSafety(
  balance: StellarBalance,
  wellKnownAssets: readonly WellKnownAsset[] = WELL_KNOWN_ASSETS
): AssetCodeSafetyReport | null {
  if (balance.isNative || !balance.assetCode) return null;
  return checkAssetCodeSafety(balance.assetCode, balance.assetIssuer, wellKnownAssets);
}

export interface UseAssetSafetyOptions {
  /** Well-known assets to compare against. Defaults to {@link WELL_KNOWN_ASSETS}. */
  wellKnownAssets?: readonly WellKnownAsset[];
}

/**
 * React hook that returns a memoized asset-code safety checker. Use it to warn
 * users when a code resembles a well-known asset.
 *
 * @example
 * ```tsx
 * const checkSafety = useAssetSafety();
 * const report = checkSafety("UDC");
 * if (report.flagged) return <Warning reasons={report.matches.flatMap(m => m.reasons)} />;
 * ```
 */
export function useAssetSafety(options?: UseAssetSafetyOptions) {
  const wellKnownAssets = options?.wellKnownAssets ?? WELL_KNOWN_ASSETS;
  return useCallback(
    (code: string, issuer?: string) => checkAssetCodeSafety(code, issuer, wellKnownAssets),
    [wellKnownAssets]
  );
}
