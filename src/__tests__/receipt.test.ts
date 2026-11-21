import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPaymentReceipt,
  downloadReceipt,
  explorerTransactionUrl,
  receiptFilename,
  receiptFromHorizon,
  receiptToHtml,
  receiptToJson,
  receiptToText,
  ReceiptError,
} from "../utils/receipt";

const FROM = "G" + "A".repeat(55);
const TO = "G" + "B".repeat(55);
const HASH = "ab".repeat(32);

const base = { transactionHash: HASH, amount: "12.5", from: FROM, to: TO, createdAt: "2026-01-02T03:04:05Z" };

describe("buildPaymentReceipt", () => {
  it("normalises a native payment", () => {
    const r = buildPaymentReceipt({ ...base, memo: "thanks", ledger: 42, feeCharged: "100", network: "testnet" });
    expect(r).toMatchObject({
      amount: "12.5000000",
      asset: "XLM",
      assetIssuer: null,
      memo: "thanks",
      createdAt: "2026-01-02T03:04:05.000Z",
      ledger: 42,
      fee: "0.0000100",
      network: "testnet",
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${HASH}`,
    });
  });

  it("keeps the issuer for a credit asset", () => {
    const issuer = "G" + "C".repeat(55);
    const r = buildPaymentReceipt({ ...base, assetCode: "USDC", assetIssuer: issuer });
    expect(r.asset).toBe("USDC");
    expect(r.assetIssuer).toBe(issuer);
  });

  it("handles large amounts exactly", () => {
    expect(buildPaymentReceipt({ ...base, amount: "922337203685.4775807" }).amount).toBe("922337203685.4775807");
  });

  it("rejects bad input", () => {
    expect(() => buildPaymentReceipt({ ...base, transactionHash: "nope" })).toThrow(ReceiptError);
    expect(() => buildPaymentReceipt({ ...base, to: "GBAD" })).toThrow(/to must be/);
    expect(() => buildPaymentReceipt({ ...base, amount: "-1" })).toThrow(/amount/);
    expect(() => buildPaymentReceipt({ ...base, amount: "1.12345678" })).toThrow(/7 decimal/);
    expect(() => buildPaymentReceipt({ ...base, createdAt: "not a date" })).toThrow(/createdAt/);
  });
});

describe("explorerTransactionUrl", () => {
  it("only links networks with a public explorer", () => {
    expect(explorerTransactionUrl(HASH, "mainnet")).toContain("/explorer/public/tx/");
    expect(explorerTransactionUrl(HASH, "futurenet")).toBeNull();
    expect(explorerTransactionUrl(HASH)).toBeNull();
  });
});

describe("renderers", () => {
  const receipt = buildPaymentReceipt({ ...base, memo: "<b>hi</b>", network: "testnet", feeCharged: 100 });

  it("text includes the key fields", () => {
    const text = receiptToText(receipt);
    expect(text).toContain("12.5000000 XLM");
    expect(text).toContain(FROM);
    expect(text).toContain(`Transaction:  ${HASH}`);
  });

  it("json round-trips", () => {
    expect(JSON.parse(receiptToJson(receipt))).toEqual(receipt);
  });

  it("html escapes user-controlled values", () => {
    const html = receiptToHtml(receipt);
    expect(html).toContain("&lt;b&gt;hi&lt;/b&gt;");
    expect(html).not.toContain("<b>hi</b>");
  });

  it("names files after the hash", () => {
    expect(receiptFilename(receipt, "json")).toBe("stellar-receipt-abababab.json");
  });
});

describe("receiptFromHorizon", () => {
  const tx = { hash: HASH, created_at: "2026-01-02T03:04:05Z", fee_charged: "100", memo_type: "text", memo: "order 7", source_account: FROM, ledger_attr: 99 };

  it("reads a native payment", () => {
    const r = receiptFromHorizon(tx, { type: "payment", asset_type: "native", amount: "3.0000000", from: FROM, to: TO }, "testnet");
    expect(r).toMatchObject({ asset: "XLM", memo: "order 7", ledger: 99, fee: "0.0000100" });
  });

  it("reads a credit payment and ignores an empty memo", () => {
    const issuer = "G" + "D".repeat(55);
    const r = receiptFromHorizon(
      { ...tx, memo_type: "none" },
      { type: "payment", asset_type: "credit_alphanum4", asset_code: "USDC", asset_issuer: issuer, amount: "1", from: FROM, to: TO },
    );
    expect(r).toMatchObject({ asset: "USDC", assetIssuer: issuer, memo: null });
  });
});

describe("downloadReceipt", () => {
  afterEach(() => vi.restoreAllMocks());

  it("saves through an anchor click and cleans up the object URL", () => {
    const create = vi.fn(() => "blob:receipt");
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    const name = downloadReceipt(buildPaymentReceipt(base), "html");

    expect(name).toBe("stellar-receipt-abababab.html");
    expect(create).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith("blob:receipt");
    expect(document.querySelector("a[download]")).toBeNull();
  });
});
