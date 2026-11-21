/**
 * @file receipt.ts
 * @description Build and download a receipt for a confirmed Stellar payment (#1198).
 * @package stellar-hooks
 * @license MIT
 */

export const RECEIPT_SCHEMA_VERSION = 1;

export type ReceiptFormat = "txt" | "json" | "html";

export class ReceiptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReceiptError";
  }
}

/** What a receipt is built from. Everything here is available from a confirmed payment. */
export interface PaymentReceiptInput {
  /** 64-character hex transaction hash. */
  transactionHash: string;
  /** Decimal amount as a string, e.g. `"12.5"`. */
  amount: string;
  /** Asset code; omit for native XLM. */
  assetCode?: string;
  assetIssuer?: string;
  /** Sender and recipient (`G...`, or muxed `M...`). */
  from: string;
  to: string;
  memo?: string | null;
  /** When the transaction was confirmed. */
  createdAt: Date | string;
  ledger?: number;
  /** Fee charged, in stroops. */
  feeCharged?: string | number;
  /** `testnet`, `mainnet`/`public`, `futurenet` or a custom name. */
  network?: string;
}

export interface PaymentReceipt {
  schemaVersion: typeof RECEIPT_SCHEMA_VERSION;
  transactionHash: string;
  /** Amount with seven decimals, e.g. `12.5000000`. */
  amount: string;
  /** `XLM` for the native asset, otherwise the asset code. */
  asset: string;
  assetIssuer: string | null;
  from: string;
  to: string;
  memo: string | null;
  /** ISO 8601 timestamp. */
  createdAt: string;
  ledger: number | null;
  /** Fee in XLM, or null when unknown. */
  fee: string | null;
  network: string | null;
  /** Link to a public explorer when the network has one. */
  explorerUrl: string | null;
}

const HASH = /^[0-9a-fA-F]{64}$/;
const ADDRESS = /^(G[A-Z2-7]{55}|M[A-Z2-7]{68})$/;
const DECIMAL = /^\d+(\.\d+)?$/;

/** Fixed-point formatting by string, so large or precise amounts never go through floating point. */
function toSevenDecimals(value: string, label: string): string {
  const text = value.trim();
  if (!DECIMAL.test(text)) throw new ReceiptError(`${label} must be a non-negative decimal number`);
  const [whole, fraction = ""] = text.split(".");
  if (fraction.length > 7) throw new ReceiptError(`${label} has more than 7 decimal places`);
  return `${whole}.${fraction.padEnd(7, "0")}`;
}

function stroopsToXlm(stroops: string | number): string | null {
  const text = String(stroops).trim();
  if (!/^\d+$/.test(text)) return null;
  const padded = text.padStart(8, "0");
  return `${padded.slice(0, -7)}.${padded.slice(-7)}`;
}

export function explorerTransactionUrl(hash: string, network?: string): string | null {
  const name = network === "mainnet" || network === "public" ? "public" : network === "testnet" ? "testnet" : null;
  return name ? `https://stellar.expert/explorer/${name}/tx/${hash}` : null;
}

/** Validates the input and returns a normalised receipt. Throws {@link ReceiptError} when it is not a payment. */
export function buildPaymentReceipt(input: PaymentReceiptInput): PaymentReceipt {
  if (!HASH.test(input.transactionHash)) throw new ReceiptError("transactionHash must be a 64-character hex string");
  if (!ADDRESS.test(input.from)) throw new ReceiptError("from must be a Stellar address");
  if (!ADDRESS.test(input.to)) throw new ReceiptError("to must be a Stellar address");
  const created = input.createdAt instanceof Date ? input.createdAt : new Date(input.createdAt);
  if (Number.isNaN(created.getTime())) throw new ReceiptError("createdAt must be a valid date");

  const hash = input.transactionHash.toLowerCase();
  const isNative = !input.assetCode || input.assetCode === "XLM";
  return {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    transactionHash: hash,
    amount: toSevenDecimals(input.amount, "amount"),
    asset: isNative ? "XLM" : (input.assetCode as string),
    assetIssuer: isNative ? null : (input.assetIssuer ?? null),
    from: input.from,
    to: input.to,
    memo: input.memo ? input.memo : null,
    createdAt: created.toISOString(),
    ledger: input.ledger ?? null,
    fee: input.feeCharged === undefined ? null : stroopsToXlm(input.feeCharged),
    network: input.network ?? null,
    explorerUrl: explorerTransactionUrl(hash, input.network),
  };
}

type LooseRecord = Record<string, unknown>;

/**
 * Builds a receipt from Horizon's transaction record and one of its payment operations
 * (`payment`, `path_payment_strict_send` or `path_payment_strict_receive`). For path payments the receipt shows what
 * the recipient received.
 */
export function receiptFromHorizon(tx: LooseRecord, operation: LooseRecord, network?: string): PaymentReceipt {
  const isNative = operation.asset_type === "native";
  const memoType = tx.memo_type;
  return buildPaymentReceipt({
    transactionHash: String(tx.hash),
    amount: String(operation.amount),
    assetCode: isNative ? undefined : String(operation.asset_code ?? ""),
    assetIssuer: isNative ? undefined : String(operation.asset_issuer ?? ""),
    from: String(operation.from ?? tx.source_account),
    to: String(operation.to),
    memo: memoType && memoType !== "none" ? String(tx.memo ?? "") : null,
    createdAt: String(tx.created_at),
    ledger: typeof tx.ledger_attr === "number" ? tx.ledger_attr : typeof tx.ledger === "number" ? (tx.ledger as number) : undefined,
    feeCharged: tx.fee_charged as string | number | undefined,
    network,
  });
}

/** Plain-text receipt, one `Label: value` per line. */
export function receiptToText(receipt: PaymentReceipt): string {
  const lines = [
    "PAYMENT RECEIPT",
    "===============",
    `Amount:       ${receipt.amount} ${receipt.asset}`,
    ...(receipt.assetIssuer ? [`Issuer:       ${receipt.assetIssuer}`] : []),
    `From:         ${receipt.from}`,
    `To:           ${receipt.to}`,
    ...(receipt.memo ? [`Memo:         ${receipt.memo}`] : []),
    `Date (UTC):   ${receipt.createdAt}`,
    ...(receipt.ledger !== null ? [`Ledger:       ${receipt.ledger}`] : []),
    ...(receipt.fee !== null ? [`Fee:          ${receipt.fee} XLM`] : []),
    ...(receipt.network ? [`Network:      ${receipt.network}`] : []),
    `Transaction:  ${receipt.transactionHash}`,
    ...(receipt.explorerUrl ? [`Explorer:     ${receipt.explorerUrl}`] : []),
    "",
  ];
  return lines.join("\n");
}

export function receiptToJson(receipt: PaymentReceipt): string {
  return JSON.stringify(receipt, null, 2) + "\n";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

/** Printable HTML page (use the browser's "Save as PDF" to get a PDF). All values are escaped. */
export function receiptToHtml(receipt: PaymentReceipt): string {
  const rows: Array<[string, string]> = [
    ["Amount", `${receipt.amount} ${receipt.asset}`],
    ...(receipt.assetIssuer ? ([["Issuer", receipt.assetIssuer]] as Array<[string, string]>) : []),
    ["From", receipt.from],
    ["To", receipt.to],
    ...(receipt.memo ? ([["Memo", receipt.memo]] as Array<[string, string]>) : []),
    ["Date (UTC)", receipt.createdAt],
    ...(receipt.ledger !== null ? ([["Ledger", String(receipt.ledger)]] as Array<[string, string]>) : []),
    ...(receipt.fee !== null ? ([["Fee", `${receipt.fee} XLM`]] as Array<[string, string]>) : []),
    ...(receipt.network ? ([["Network", receipt.network]] as Array<[string, string]>) : []),
    ["Transaction", receipt.transactionHash],
  ];
  const body = rows
    .map(([k, v]) => `<tr><th scope="row">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
    .join("\n      ");
  const link = receipt.explorerUrl ? `<p><a href="${escapeHtml(receipt.explorerUrl)}">View on explorer</a></p>` : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Payment receipt ${escapeHtml(receipt.transactionHash.slice(0, 8))}</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem; }
      table { border-collapse: collapse; width: 100%; }
      th, td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #ddd; word-break: break-all; }
      th { width: 8rem; white-space: nowrap; }
    </style>
  </head>
  <body>
    <h1>Payment receipt</h1>
    <table>
      ${body}
    </table>
    ${link}
  </body>
</html>
`;
}

const FORMATS: Record<ReceiptFormat, { render: (r: PaymentReceipt) => string; mime: string }> = {
  txt: { render: receiptToText, mime: "text/plain;charset=utf-8" },
  json: { render: receiptToJson, mime: "application/json;charset=utf-8" },
  html: { render: receiptToHtml, mime: "text/html;charset=utf-8" },
};

export function receiptFilename(receipt: PaymentReceipt, format: ReceiptFormat): string {
  return `stellar-receipt-${receipt.transactionHash.slice(0, 8)}.${format}`;
}

/** Saves the receipt through the browser's download mechanism and returns the file name. Browser only. */
export function downloadReceipt(receipt: PaymentReceipt, format: ReceiptFormat = "txt", filename?: string): string {
  if (typeof document === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    throw new ReceiptError("downloadReceipt needs a browser environment");
  }
  const { render, mime } = FORMATS[format];
  const name = filename ?? receiptFilename(receipt, format);
  const url = URL.createObjectURL(new Blob([render(receipt)], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return name;
}
