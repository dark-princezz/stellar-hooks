import { describe, expect, it } from "vitest";
import {
  Account,
  Asset,
  Keypair,
  Memo,
  Networks,
  Operation,
  SorobanDataBuilder,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { classifyOperationRisk, previewTransaction } from "./transactionPreview";

const decode = (op: Parameters<typeof Operation.fromXDRObject>[0]) => Operation.fromXDRObject(op);
const source = Keypair.random().publicKey();
const other = Keypair.random().publicKey();

function build(ops: Parameters<TransactionBuilder["addOperation"]>[0][], opts: { memo?: boolean; soroban?: boolean } = {}) {
  const builder = new TransactionBuilder(new Account(source, "1"), { fee: "100", networkPassphrase: Networks.TESTNET });
  ops.forEach((op) => builder.addOperation(op));
  if (opts.memo) builder.addMemo(Memo.text("invoice 7"));
  if (opts.soroban) builder.setSorobanData(new SorobanDataBuilder().setResourceFee(5000).build());
  return builder.setTimeout(300).build().toXDR();
}

describe("previewTransaction", () => {
  it("summarises source, memo, time bounds, fee and operations", () => {
    const xdr = build([Operation.payment({ destination: other, asset: Asset.native(), amount: "12.5" })], { memo: true });
    const preview = previewTransaction(xdr, Networks.TESTNET);
    expect(preview.source).toBe(source);
    expect(preview.memo).toEqual({ type: "text", value: "invoice 7" });
    expect(preview.timeBounds?.maxTime).not.toBe("0");
    expect(preview.operations).toHaveLength(1);
    expect(preview.operations[0]).toMatchObject({
      type: "payment",
      risk: "low",
      details: { destination: other, amount: "12.5000000", asset: "XLM" },
    });
    expect(preview.highestRisk).toBe("low");
    expect(preview.isFeeBump).toBe(false);
  });

  it("separates the inclusion fee from the Soroban resource fee", () => {
    const xdr = build([Operation.bumpSequence({ bumpTo: "10" })], { soroban: true });
    const { fee } = previewTransaction(xdr, Networks.TESTNET);
    expect(fee.resource).toBe("5000");
    expect(BigInt(fee.total) - BigInt(fee.inclusion)).toBe(5000n);
  });

  it("reports no resource fee for classic transactions", () => {
    const { fee } = previewTransaction(build([Operation.bumpSequence({ bumpTo: "10" })]), Networks.TESTNET);
    expect(fee).toEqual({ total: fee.total, inclusion: fee.total, resource: null });
  });

  it("rejects malformed XDR", () => {
    expect(() => previewTransaction("not-xdr", Networks.TESTNET)).toThrow();
  });
});

describe("risk classification", () => {
  it("flags signer changes, account merge and clawback as high", () => {
    const signer = Operation.setOptions({ signer: { ed25519PublicKey: other, weight: 1 } });
    expect(classifyOperationRisk(decode(signer)).risk).toBe("high");
    expect(classifyOperationRisk(decode(Operation.accountMerge({ destination: other }))).risk).toBe("high");
    expect(classifyOperationRisk(decode(Operation.clawback({ from: other, asset: new Asset("USD", other), amount: "1" }))).risk).toBe("high");
  });

  it("flags thresholds as high and trustline removal and flags as medium", () => {
    expect(classifyOperationRisk(decode(Operation.setOptions({ lowThreshold: 2 }))).risk).toBe("high");
    expect(classifyOperationRisk(decode(Operation.setOptions({ homeDomain: "example.com" }))).risk).toBe("medium");
    expect(classifyOperationRisk(decode(Operation.changeTrust({ asset: new Asset("USD", other), limit: "0" }))).risk).toBe("medium");
  });

  it("leaves ordinary operations low and tracks the highest risk across a transaction", () => {
    expect(classifyOperationRisk(decode(Operation.payment({ destination: other, asset: Asset.native(), amount: "1" })))).toEqual({ risk: "low", reasons: [] });
    const xdr = build([
      Operation.payment({ destination: other, asset: Asset.native(), amount: "1" }),
      Operation.accountMerge({ destination: other }),
    ]);
    const preview = previewTransaction(xdr, Networks.TESTNET);
    expect(preview.highestRisk).toBe("high");
    expect(preview.operations.map((o) => o.risk)).toEqual(["low", "high"]);
  });
});
