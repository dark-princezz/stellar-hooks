import type { Horizon } from "@stellar/stellar-sdk";
import { safeJsonStringify } from "./bigIntSerializer";

/** One row of account activity in a stable, export-friendly shape. */
export interface NormalizedHistoryEntry {
  id: string;
  /** Horizon operation type, e.g. `payment`. */
  type: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** `native` for XLM, otherwise `CODE:ISSUER`. */
  asset: string;
  /** Decimal amount as Horizon reports it, or an empty string when the operation has none. */
  amount: string;
  from: string;
  to: string;
  transactionHash: string;
}

export interface HistoryFilter {
  /** Inclusive lower bound. */
  startDate?: Date | string;
  /** Inclusive upper bound. A date-only string includes that whole day (UTC). */
  endDate?: Date | string;
  /** `native`, `CODE`, or `CODE:ISSUER`. */
  asset?: string;
}

/** Version of the JSON document produced by {@link historyToJson}. */
export const HISTORY_JSON_SCHEMA_VERSION = 1;

/**
 * JSON Schema of {@link historyToJson}'s output, for consumers that validate it.
 */
export const HISTORY_JSON_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "stellar-hooks normalized history",
  type: "object",
  required: ["schemaVersion", "generatedAt", "entries"],
  properties: {
    schemaVersion: { const: HISTORY_JSON_SCHEMA_VERSION },
    generatedAt: { type: "string", format: "date-time" },
    account: { type: "string" },
    entries: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "type", "createdAt", "asset", "amount", "from", "to", "transactionHash"],
        properties: {
          id: { type: "string" },
          type: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          asset: { type: "string" },
          amount: { type: "string" },
          from: { type: "string" },
          to: { type: "string" },
          transactionHash: { type: "string" },
        },
      },
    },
  },
} as const;

/** Column order of the CSV export. Stable: new columns are only ever appended. */
export const HISTORY_CSV_COLUMNS = [
  "id",
  "type",
  "createdAt",
  "asset",
  "amount",
  "from",
  "to",
  "transactionHash",
] as const;

type LooseOperation = Record<string, unknown>;

function assetOf(op: LooseOperation): string {
  const type = op.asset_type ?? op.source_asset_type;
  if (type === undefined || type === "native") return op.asset_code ? `${op.asset_code}:${op.asset_issuer}` : type === undefined ? "" : "native";
  return `${op.asset_code ?? ""}:${op.asset_issuer ?? ""}`;
}

/** Converts a Horizon operation record to a {@link NormalizedHistoryEntry}. */
export function normalizeOperation(operation: Horizon.ServerApi.OperationRecord): NormalizedHistoryEntry {
  const op = operation as unknown as LooseOperation;
  const str = (value: unknown): string => (typeof value === "string" ? value : "");
  return {
    id: str(op.id),
    type: str(op.type),
    createdAt: str(op.created_at),
    asset: assetOf(op),
    amount: str(op.amount),
    from: str(op.from) || str(op.funder) || str(op.source_account),
    to: str(op.to) || str(op.account) || str(op.into),
    transactionHash: str(op.transaction_hash),
  };
}

function toTime(value: Date | string, endOfDay: boolean): number {
  if (value instanceof Date) return value.getTime();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const time = Date.parse(dateOnly ? `${value}T00:00:00Z` : value);
  return dateOnly && endOfDay ? time + 24 * 60 * 60 * 1000 - 1 : time;
}

function matchesAsset(entryAsset: string, wanted: string): boolean {
  if (wanted === "native") return entryAsset === "native";
  return wanted.includes(":") ? entryAsset === wanted : entryAsset.split(":")[0] === wanted;
}

/** Narrows history by date range and asset. Entries with unparseable dates are dropped when a date bound is set. */
export function filterHistory(entries: NormalizedHistoryEntry[], filter: HistoryFilter = {}): NormalizedHistoryEntry[] {
  const start = filter.startDate === undefined ? undefined : toTime(filter.startDate, false);
  const end = filter.endDate === undefined ? undefined : toTime(filter.endDate, true);

  return entries.filter((entry) => {
    if (start !== undefined || end !== undefined) {
      const time = Date.parse(entry.createdAt);
      if (Number.isNaN(time)) return false;
      if (start !== undefined && time < start) return false;
      if (end !== undefined && time > end) return false;
    }
    return filter.asset === undefined || matchesAsset(entry.asset, filter.asset);
  });
}

function csvCell(value: string): string {
  // Cells starting with these characters are executed as formulas by spreadsheet apps.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Builds a CSV string (header + one row per entry, `\r\n` line endings) ready to download. */
export function historyToCsv(entries: NormalizedHistoryEntry[]): string {
  const rows = entries.map((entry) => HISTORY_CSV_COLUMNS.map((column) => csvCell(entry[column])).join(","));
  return [HISTORY_CSV_COLUMNS.join(","), ...rows].join("\r\n") + "\r\n";
}

/** Builds the documented JSON export (see {@link HISTORY_JSON_SCHEMA}). */
export function historyToJson(entries: NormalizedHistoryEntry[], options: { account?: string; now?: Date } = {}): string {
  return safeJsonStringify(
    {
      schemaVersion: HISTORY_JSON_SCHEMA_VERSION,
      generatedAt: (options.now ?? new Date()).toISOString(),
      ...(options.account ? { account: options.account } : {}),
      entries,
    },
    2,
  );
}
