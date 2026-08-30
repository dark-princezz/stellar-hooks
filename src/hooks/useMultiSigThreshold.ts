/**
 * @file useMultiSigThreshold.ts
 * @description Hook for reading an account's signer weights and thresholds and
 * checking whether a given signature set satisfies a threshold.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useMemo } from "react";
import { useStellarContext } from "../context";
import { getHorizonServer } from "../utils/memoizedServers";
import { useStellarQuery } from "./useStellarQuery";
import type { SignerEntry, Thresholds } from "./useMultiSig";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseMultiSigThresholdOptions {
  /** Disable fetching while `false`. Default: `true`. */
  enabled?: boolean;
  /** Poll the account's signer/threshold data every N ms. `0` (default) disables polling. */
  refetchInterval?: number;
}

export interface UseMultiSigThresholdReturn {
  /** Signer entries (key, type, weight) on the account. */
  signers: SignerEntry[];
  /** Thresholds (low, medium, high), or `null` when the account defines none. */
  thresholds: Thresholds | null;
  /** `true` while the account data is being fetched. */
  isLoading: boolean;
  /** Most recent fetch error, or `null`. */
  error: Error | null;
  /** Manually re-fetch the account's signer/threshold data. */
  refetch: () => Promise<void>;
  /** Sum of the weights of the given signer public keys against the account's signers. */
  weightOf: (publicKeys: string[]) => number;
  /** Whether the given signer public keys satisfy the given threshold level. Default level: `"medium"`. */
  meetsThreshold: (publicKeys: string[], level?: ThresholdLevel) => boolean;
  /** The required weight for the given threshold level. */
  thresholdFor: (level: ThresholdLevel) => number;
}

export type ThresholdLevel = "low" | "medium" | "high";

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface AccountSignerRecord {
  key: string;
  public_key?: string;
  type: string;
  weight: number;
}

interface AccountThresholdRecord {
  low_threshold: number;
  med_threshold: number;
  high_threshold: number;
}

interface HorizonAccountData {
  signers?: AccountSignerRecord[];
  thresholds?: AccountThresholdRecord;
}

function parseSigners(account: HorizonAccountData): SignerEntry[] {
  if (!account.signers || !Array.isArray(account.signers)) return [];

  return account.signers.map((s) => ({
    key: s.key ?? s.public_key ?? "",
    type: (s.type ?? "ed25519_public_key") as SignerEntry["type"],
    weight: s.weight ?? 0,
  }));
}

function parseThresholds(account: HorizonAccountData): Thresholds | null {
  if (!account.thresholds) return null;
  return {
    low: account.thresholds.low_threshold ?? 0,
    medium: account.thresholds.med_threshold ?? 0,
    high: account.thresholds.high_threshold ?? 0,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Read an account's signer weights and thresholds and check whether a given
 * set of signer public keys satisfies a given threshold.
 *
 * Useful for rendering multi-sig payment flows (e.g. showing how much weight a
 * chosen set of signatures currently carries) without signing anything.
 *
 * @param publicKey Account (G…) whose signers/thresholds to read.
 * @param options   Configuration (enabled, refetchInterval).
 *
 * @example
 * ```tsx
 * const { signers, thresholds, meetsThreshold, weightOf } =
 *   useMultiSigThreshold("GAAZI4...");
 *
 * const needs = thresholds?.medium; // e.g. 2
 * const have = weightOf(["GAAA...", "GBBB..."]); // e.g. 3
 * const enough = meetsThreshold(["GAAA...", "GBBB..."]); // true
 * ```
 */
export function useMultiSigThreshold(
  publicKey: string | null | undefined,
  options: UseMultiSigThresholdOptions = {},
): UseMultiSigThresholdReturn {
  const { enabled = true, refetchInterval = 0 } = options;
  const { config } = useStellarContext();

  const fetcher = useCallback(
    async (_signal?: AbortSignal) => {
      if (!publicKey) return null;
      const server = getHorizonServer(config.horizonUrl);
      const account = await server.loadAccount(publicKey);
      const accountData = account as unknown as HorizonAccountData;
      return {
        signers: parseSigners(accountData),
        thresholds: parseThresholds(accountData),
      };
    },
    [publicKey, config.horizonUrl],
  );

  const state = useStellarQuery<{ signers: SignerEntry[]; thresholds: Thresholds | null } | null>(
    fetcher,
    {
      enabled: enabled && Boolean(publicKey),
      refetchInterval,
      initialData: null,
      debugLabel: "useMultiSigThreshold",
    },
  );

  const signers = useMemo(() => state.data?.signers ?? [], [state.data]);
  const thresholds = useMemo(() => state.data?.thresholds ?? null, [state.data]);

  const weightOf = useCallback(
    (publicKeys: string[]): number => {
      const weightMap = new Map<string, number>();
      for (const s of signers) weightMap.set(s.key, s.weight);
      return publicKeys.reduce((sum, key) => sum + (weightMap.get(key) ?? 0), 0);
    },
    [signers],
  );

  const thresholdFor = useCallback(
    (level: ThresholdLevel): number => (thresholds ? thresholds[level] : 0),
    [thresholds],
  );

  const meetsThreshold = useCallback(
    (publicKeys: string[], level: ThresholdLevel = "medium"): boolean =>
      thresholds !== null && weightOf(publicKeys) >= thresholdFor(level),
    [thresholds, weightOf, thresholdFor],
  );

  const refetch = useCallback(async () => {
    await state.refetch();
    // `state` itself is intentionally omitted: `state.refetch` is the only
    // stable field this callback needs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.refetch]);

  return {
    signers,
    thresholds,
    isLoading: state.isLoading,
    error: state.error,
    refetch,
    weightOf,
    meetsThreshold,
    thresholdFor,
  };
}