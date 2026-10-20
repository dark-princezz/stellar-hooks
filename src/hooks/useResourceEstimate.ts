/**
 * @file useResourceEstimate.ts
 * @description CPU, memory and footprint figures from a Soroban simulation, with near-limit warnings.
 * @package stellar-hooks
 * @license MIT
 */

import { useMemo } from "react";
import {
  DEFAULT_RESOURCE_LIMITS,
  evaluateResourceUsage,
  extractResourceEstimate,
} from "../utils/resourceEstimate";
import type { ResourceEstimate, ResourceLimits, ResourceWarning } from "../utils/resourceEstimate";

export interface UseResourceEstimateOptions {
  /** Override the per-transaction limits (defaults to current mainnet limits). */
  limits?: Partial<ResourceLimits>;
  /** Fraction of a limit at which a warning is raised. Default 0.8. */
  warnAt?: number;
}

export interface UseResourceEstimateReturn {
  /** Resource figures, or `null` when there is no (successful) simulation. */
  estimate: ResourceEstimate | null;
  /** Resources at or above the warning threshold, most used first. */
  warnings: ResourceWarning[];
  /** `true` when any resource is near its limit: split the work or alert the user. */
  isNearLimit: boolean;
  /** `true` when any resource is at or over its limit and the transaction will likely fail. */
  exceedsLimit: boolean;
}

/**
 * Surfaces the resources a contract call will consume.
 *
 * @example
 * ```tsx
 * const { simulation } = useSorobanContract({ ... });
 * const { estimate, isNearLimit } = useResourceEstimate(simulation);
 * ```
 */
export function useResourceEstimate(
  simulation: unknown,
  options: UseResourceEstimateOptions = {},
): UseResourceEstimateReturn {
  const { warnAt = 0.8, limits } = options;
  const limitsKey = JSON.stringify(limits ?? {});

  return useMemo(() => {
    const estimate = extractResourceEstimate(simulation);
    if (!estimate) return { estimate: null, warnings: [], isNearLimit: false, exceedsLimit: false };
    const merged = { ...DEFAULT_RESOURCE_LIMITS, ...(JSON.parse(limitsKey) as Partial<ResourceLimits>) };
    const evaluation = evaluateResourceUsage(estimate, merged, warnAt);
    return {
      estimate,
      warnings: evaluation.warnings,
      isNearLimit: evaluation.nearLimit,
      exceedsLimit: evaluation.exceedsLimit,
    };
  }, [simulation, limitsKey, warnAt]);
}
