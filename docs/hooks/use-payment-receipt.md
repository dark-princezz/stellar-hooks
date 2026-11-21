# usePaymentReceipt

Load a confirmed payment and offer it as a downloadable receipt (amount, asset, sender and recipient, time, memo and
transaction hash).

```tsx
import { usePayment, usePaymentReceipt } from "stellar-hooks";

function Receipt() {
  const { hash } = usePayment({ destination, asset: { type: "native" }, amount: "10" });
  const { receipt, isLoading, error, download } = usePaymentReceipt(hash);

  if (isLoading) return <p>Loading receipt…</p>;
  if (error) return <p role="alert">{error.message}</p>;
  if (!receipt) return null;

  return (
    <>
      <p>{receipt.amount} {receipt.asset} to {receipt.to}</p>
      <button onClick={() => download("txt")}>Download receipt</button>
      <button onClick={() => download("html")}>Printable version</button>
    </>
  );
}
```

Pass `null` for the hash to stay idle. The hook reads the transaction and its operations from Horizon and uses the
first `payment`, `path_payment_strict_send` or `path_payment_strict_receive` operation (for path payments the receipt
shows what the recipient received). A failed transaction or one with no payment sets `error`.

## Without Horizon: the utilities

If you already have the payment data, build the receipt yourself:

```ts
import { buildPaymentReceipt, receiptToText, receiptToJson, receiptToHtml, downloadReceipt } from "stellar-hooks";

const receipt = buildPaymentReceipt({
  transactionHash, amount: "12.5", from, to, memo: "invoice 7", createdAt: new Date(), network: "testnet",
});

downloadReceipt(receipt, "json");   // browser only; returns the file name
receiptToText(receipt);             // string, for emailing or logging
```

| Format | Output |
| --- | --- |
| `txt` | Plain text, one `Label: value` per line |
| `json` | The receipt object (`schemaVersion: 1`) |
| `html` | A printable page with all values escaped; use the browser's "Save as PDF" for a PDF |

Amounts are shown with seven decimals and handled as strings, so they never lose precision. `explorerUrl` is set for
`testnet` and `mainnet`/`public` only.
