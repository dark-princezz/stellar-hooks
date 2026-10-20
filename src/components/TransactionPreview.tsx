/**
 * @file TransactionPreview.tsx
 * @description Renders a decoded transaction as a readable list of operations with risk labels.
 * @package stellar-hooks
 * @license MIT
 */

import * as React from "react";
import { useTransactionPreview } from "../hooks/useTransactionPreview";
import type { TransactionPreview as Preview } from "../utils/transactionPreview";

export interface TransactionPreviewProps {
  /** Transaction envelope XDR (base64). Ignored when `preview` is given. */
  xdr?: string;
  /** An already decoded preview. */
  preview?: Preview;
  /** Passphrase used to decode `xdr`; defaults to the provider network. */
  networkPassphrase?: string;
  className?: string;
}

const RISK_LABEL = { low: "Low risk", medium: "Medium risk", high: "High risk" } as const;

/**
 * Lists every operation of a transaction with its amounts, assets and destinations, plus the fee
 * breakdown. Operations with a medium or high risk level carry a visible label.
 */
export function TransactionPreview({
  xdr,
  preview: given,
  networkPassphrase,
  className,
}: TransactionPreviewProps): React.JSX.Element {
  const decoded = useTransactionPreview(given ? null : xdr, networkPassphrase ? { networkPassphrase } : {});
  const preview = given ?? decoded.preview;

  if (!preview) {
    return (
      <div className={className} role="alert">
        {decoded.error ? `Unable to preview transaction: ${decoded.error.message}` : "No transaction to preview"}
      </div>
    );
  }

  return (
    <section className={className} aria-label="Transaction preview">
      <p>
        Source: <code>{preview.source}</code>
      </p>
      {preview.memo && (
        <p>
          Memo ({preview.memo.type}): {preview.memo.value}
        </p>
      )}
      <p>
        Fee: {preview.fee.total} stroops (inclusion {preview.fee.inclusion}
        {preview.fee.resource !== null ? `, resource ${preview.fee.resource}` : ""})
      </p>
      <ol aria-label="Operations">
        {preview.operations.map((op) => (
          <li key={op.index} data-risk={op.risk}>
            <strong>{op.type}</strong>
            {op.risk !== "low" && <span> — {RISK_LABEL[op.risk]}</span>}
            <ul>
              {Object.entries(op.details).map(([key, value]) => (
                <li key={key}>
                  {key}: {value}
                </li>
              ))}
              {op.riskReasons.map((reason) => (
                <li key={reason}>⚠ {reason}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
