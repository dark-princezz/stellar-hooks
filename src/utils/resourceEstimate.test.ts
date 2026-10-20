import { describe, expect, it } from "vitest";
import { SorobanDataBuilder, xdr, Address, Keypair } from "@stellar/stellar-sdk";
import { DEFAULT_RESOURCE_LIMITS, evaluateResourceUsage, extractResourceEstimate } from "./resourceEstimate";

const ledgerKey = () =>
  xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: new Address(Keypair.random().publicKey()).toScAddress(),
      key: xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: xdr.ContractDataDurability.persistent(),
    }),
  );

function simulation(over: { cpu?: number; read?: number; write?: number; readOnly?: number; readWrite?: number; mem?: string } = {}) {
  const builder = new SorobanDataBuilder()
    .setResources(over.cpu ?? 1_000_000, over.read ?? 1_000, over.write ?? 500)
    .setResourceFee(123);
  builder.setReadOnly(Array.from({ length: over.readOnly ?? 2 }, ledgerKey));
  builder.setReadWrite(Array.from({ length: over.readWrite ?? 1 }, ledgerKey));
  return {
    minResourceFee: "4567",
    cost: { cpuInsns: "999", memBytes: over.mem ?? "2000000" },
    transactionData: builder,
  };
}

describe("extractResourceEstimate", () => {
  it("reads CPU, memory, footprint and I/O figures", () => {
    expect(extractResourceEstimate(simulation())).toEqual({
      cpuInstructions: 1_000_000,
      memoryBytes: 2_000_000,
      readOnlyEntries: 2,
      readWriteEntries: 1,
      footprintEntries: 3,
      readBytes: 1_000,
      writeBytes: 500,
      minResourceFee: "4567",
    });
  });

  it("returns null for missing or failed simulations and tolerates partial data", () => {
    expect(extractResourceEstimate(null)).toBeNull();
    expect(extractResourceEstimate({ error: "HostError" })).toBeNull();
    expect(extractResourceEstimate({ cost: { cpuInsns: "42" } })).toMatchObject({
      cpuInstructions: 42,
      memoryBytes: null,
      footprintEntries: 0,
      readBytes: null,
      minResourceFee: null,
    });
  });
});

describe("evaluateResourceUsage", () => {
  it("is quiet well under the limits", () => {
    const estimate = extractResourceEstimate(simulation()) as NonNullable<ReturnType<typeof extractResourceEstimate>>;
    expect(evaluateResourceUsage(estimate)).toEqual({ warnings: [], nearLimit: false, exceedsLimit: false });
  });

  it("warns at the threshold and is critical at or above the limit, most used first", () => {
    const estimate = extractResourceEstimate(
      simulation({ cpu: 85_000_000, write: 132_096, mem: "10" }),
    ) as NonNullable<ReturnType<typeof extractResourceEstimate>>;
    const result = evaluateResourceUsage(estimate);
    expect(result.nearLimit).toBe(true);
    expect(result.exceedsLimit).toBe(true);
    expect(result.warnings.map((w) => [w.resource, w.level])).toEqual([
      ["writeBytes", "critical"],
      ["cpuInstructions", "warning"],
    ]);
  });

  it("honours custom limits and thresholds, and counts the footprint as reads", () => {
    const estimate = extractResourceEstimate(simulation({ readOnly: 8, readWrite: 2 })) as NonNullable<ReturnType<typeof extractResourceEstimate>>;
    expect(evaluateResourceUsage(estimate, { ...DEFAULT_RESOURCE_LIMITS, readEntries: 10 }).warnings[0]).toMatchObject({
      resource: "readEntries",
      used: 10,
      level: "critical",
    });
    expect(evaluateResourceUsage(estimate, DEFAULT_RESOURCE_LIMITS, 0.05).warnings.map((w) => w.resource)).toContain("readEntries");
  });
});
