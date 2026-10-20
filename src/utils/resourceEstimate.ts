/**
 * @file resourceEstimate.ts
 * @description Extract Soroban resource figures from a simulation and compare them with per-transaction limits.
 * @package stellar-hooks
 */

export interface ResourceEstimate {
  /** CPU instructions the invocation is expected to use. */
  cpuInstructions: number | null;
  /** Peak memory in bytes (reported by the simulator's `cost` payload when available). */
  memoryBytes: number | null;
  /** Ledger entries only read. */
  readOnlyEntries: number;
  /** Ledger entries read and written. */
  readWriteEntries: number;
  /** Total ledger entries touched (the footprint size). */
  footprintEntries: number;
  readBytes: number | null;
  writeBytes: number | null;
  /** Minimum resource fee in stroops, as a string. */
  minResourceFee: string | null;
}

export interface ResourceLimits {
  cpuInstructions: number;
  memoryBytes: number;
  readEntries: number;
  writeEntries: number;
  readBytes: number;
  writeBytes: number;
}

/**
 * Per-transaction limits at the time of writing. They are network settings and can change by
 * validator vote, so override them from the live network config when accuracy matters.
 */
export const DEFAULT_RESOURCE_LIMITS: ResourceLimits = {
  cpuInstructions: 100_000_000,
  memoryBytes: 41_943_040,
  readEntries: 100,
  writeEntries: 50,
  readBytes: 200_000,
  writeBytes: 132_096,
};

export type ResourceName = keyof ResourceLimits;
export type WarningLevel = "warning" | "critical";

export interface ResourceWarning {
  resource: ResourceName;
  used: number;
  limit: number;
  /** used / limit */
  ratio: number;
  /** `critical` once the limit is reached or exceeded, `warning` when at or above the threshold. */
  level: WarningLevel;
}

export interface ResourceEvaluation {
  warnings: ResourceWarning[];
  /** True when any resource is at or above the warning threshold. */
  nearLimit: boolean;
  /** True when any resource is at or above its limit. */
  exceedsLimit: boolean;
}

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

interface SimulationLike {
  minResourceFee?: string | number | bigint;
  cost?: { cpuInsns?: unknown; memBytes?: unknown } | null;
  transactionData?: {
    build?: () => {
      resources: () => Record<string, () => unknown> & { footprint: () => { readOnly: () => unknown[]; readWrite: () => unknown[] } };
    };
  } | null;
  /** Present on error responses. */
  error?: unknown;
}

/**
 * Reads CPU, memory, footprint and I/O figures from a Soroban RPC simulation response. Fields the RPC did
 * not provide are `null`; a failed simulation yields `null` overall.
 */
export function extractResourceEstimate(simulation: unknown): ResourceEstimate | null {
  const sim = simulation as SimulationLike | null | undefined;
  if (!sim || sim.error) return null;

  let cpu = toNumber(sim.cost?.cpuInsns);
  let readBytes: number | null = null;
  let writeBytes: number | null = null;
  let readOnly = 0;
  let readWrite = 0;

  try {
    const resources = sim.transactionData?.build?.().resources();
    if (resources) {
      cpu = toNumber(resources.instructions?.()) ?? cpu;
      readBytes = toNumber(resources.readBytes?.() ?? resources.diskReadBytes?.());
      writeBytes = toNumber(resources.writeBytes?.());
      const footprint = resources.footprint();
      readOnly = footprint.readOnly().length;
      readWrite = footprint.readWrite().length;
    }
  } catch {
    // Keep whatever was extracted; partial estimates are still useful.
  }

  return {
    cpuInstructions: cpu,
    memoryBytes: toNumber(sim.cost?.memBytes),
    readOnlyEntries: readOnly,
    readWriteEntries: readWrite,
    footprintEntries: readOnly + readWrite,
    readBytes,
    writeBytes,
    minResourceFee: sim.minResourceFee === undefined ? null : String(sim.minResourceFee),
  };
}

/**
 * Flags resources at or above `threshold` (default 80%) of their limit. Read entries count the whole
 * footprint (every entry is read); write entries count read-write entries only.
 */
export function evaluateResourceUsage(
  estimate: ResourceEstimate,
  limits: ResourceLimits = DEFAULT_RESOURCE_LIMITS,
  threshold = 0.8,
): ResourceEvaluation {
  const usage: Array<[ResourceName, number | null]> = [
    ["cpuInstructions", estimate.cpuInstructions],
    ["memoryBytes", estimate.memoryBytes],
    ["readEntries", estimate.footprintEntries],
    ["writeEntries", estimate.readWriteEntries],
    ["readBytes", estimate.readBytes],
    ["writeBytes", estimate.writeBytes],
  ];

  const warnings: ResourceWarning[] = [];
  for (const [resource, used] of usage) {
    if (used === null) continue;
    const limit = limits[resource];
    const ratio = used / limit;
    if (ratio >= threshold) {
      warnings.push({ resource, used, limit, ratio, level: ratio >= 1 ? "critical" : "warning" });
    }
  }
  warnings.sort((a, b) => b.ratio - a.ratio);

  return {
    warnings,
    nearLimit: warnings.length > 0,
    exceedsLimit: warnings.some((w) => w.level === "critical"),
  };
}
