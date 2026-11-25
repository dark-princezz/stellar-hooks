import { describe, expect, it } from "vitest";
import {
  filterHistory,
  historyToCsv,
  historyToJson,
  normalizeOperation,
  type NormalizedHistoryEntry,
} from "./historyExport";
import { safeJsonStringify } from "./bigIntSerializer";

const entry = (over: Partial<NormalizedHistoryEntry>): NormalizedHistoryEntry => ({
  id: "1",
  type: "payment",
  createdAt: "2026-03-10T12:00:00Z",
  asset: "native",
  amount: "10.0000000",
  from: "GA",
  to: "GB",
  transactionHash: "abc",
  ...over,
});

describe("normalizeOperation", () => {
  it("maps a payment record", () => {
    const out = normalizeOperation({
      id: "9",
      type: "payment",
      created_at: "2026-03-10T12:00:00Z",
      asset_type: "credit_alphanum4",
      asset_code: "USD",
      asset_issuer: "GISS",
      amount: "5.0",
      from: "GA",
      to: "GB",
      transaction_hash: "h",
    } as never);
    expect(out).toMatchObject({ asset: "USD:GISS", amount: "5.0", from: "GA", to: "GB", transactionHash: "h" });
  });

  it("labels native payments", () => {
    expect(normalizeOperation({ id: "1", type: "payment", asset_type: "native" } as never).asset).toBe("native");
  });
});

describe("filterHistory", () => {
  const rows = [
    entry({ id: "a", createdAt: "2026-03-01T00:00:00Z" }),
    entry({ id: "b", createdAt: "2026-03-10T23:59:59Z", asset: "USD:GISS" }),
    entry({ id: "c", createdAt: "2026-04-01T00:00:00Z", asset: "USD:OTHER" }),
  ];

  it("applies inclusive date bounds, treating a date-only end as the whole day", () => {
    expect(filterHistory(rows, { startDate: "2026-03-02", endDate: "2026-03-10" }).map((r) => r.id)).toEqual(["b"]);
  });

  it("filters by native, code, or code:issuer", () => {
    expect(filterHistory(rows, { asset: "native" }).map((r) => r.id)).toEqual(["a"]);
    expect(filterHistory(rows, { asset: "USD" }).map((r) => r.id)).toEqual(["b", "c"]);
    expect(filterHistory(rows, { asset: "USD:GISS" }).map((r) => r.id)).toEqual(["b"]);
  });

  it("combines filters and returns everything with none", () => {
    expect(filterHistory(rows)).toHaveLength(3);
    expect(filterHistory(rows, { asset: "USD", endDate: new Date("2026-03-31T00:00:00Z") }).map((r) => r.id)).toEqual(["b"]);
  });
});

describe("historyToCsv", () => {
  it("writes a stable header and escapes cells", () => {
    const csv = historyToCsv([entry({ from: 'G"A,1', to: "=HYPERLINK(\"x\")" })]);
    const [header, row] = csv.split("\r\n");
    expect(header).toBe("id,type,createdAt,asset,amount,from,to,transactionHash");
    expect(row).toContain('"G""A,1"');
    expect(row).toContain("'=HYPERLINK");
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("is just the header for no entries", () => {
    expect(historyToCsv([])).toBe("id,type,createdAt,asset,amount,from,to,transactionHash\r\n");
  });
});

describe("historyToJson", () => {
  it("emits the documented envelope", () => {
    const json = JSON.parse(historyToJson([entry({})], { account: "GA", now: new Date("2026-04-02T00:00:00Z") }));
    expect(json).toMatchObject({ schemaVersion: 1, generatedAt: "2026-04-02T00:00:00.000Z", account: "GA" });
    expect(json.entries[0].transactionHash).toBe("abc");
  });

  it("serializes BigInt amount values to strings without throwing", () => {
    // NormalizedHistoryEntry uses string amounts, but verify the envelope
    // itself is safe when other bigint-carrying data is mixed in.
    const payload = {
      schemaVersion: 1,
      generatedAt: new Date("2026-04-02T00:00:00Z").toISOString(),
      entries: [{ id: "1", balance: BigInt("9007199254740993") }],
    };
    expect(() => safeJsonStringify(payload, 2)).not.toThrow();
    const parsed = JSON.parse(safeJsonStringify(payload, 2));
    expect(parsed.entries[0].balance).toBe("9007199254740993");
  });
});
