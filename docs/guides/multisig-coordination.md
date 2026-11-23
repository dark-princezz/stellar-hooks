# Coordinating multisig signatures without a backend

> **Last verified:** stellar-hooks v0.2.0 (2026-11-23)

A multisig transaction needs signatures from several people. The transaction envelope (XDR)
is the only thing that has to travel: each signer adds a signature and passes it on. Track
progress with `useCollectSignatures`, which verifies each signature against the account's
signers and thresholds, and submit when `status.satisfied` is true.

## Ways to pass the XDR

| Method | How | Good for | Trade-offs |
| --- | --- | --- | --- |
| **Link** | Put the XDR in a URL fragment (`https://app/sign#xdr=...`) and send it by chat or email. | Remote teams. | Long URLs; chat apps may truncate them; anyone with the link sees the transaction (it holds no secrets, but it is not private). The fragment is not sent to the server. |
| **QR code** | Render the XDR as a QR code and scan it on the next device. | Co-located signers, air-gapped or hardware signers. | A QR holds roughly 2-3 KB, so large transactions need animated or multi-part codes. |
| **File** | Save the XDR as a `.xdr` or `.txt` file and share it. | Large transactions, audit trails, offline signers. | Manual: files get lost or signed twice; versioning is up to you. |
| **Copy and paste** | Copy the base64 string. | The simplest case. | Easy to paste a stale or truncated copy; validate on import. |

## Practices

* **Each signer signs the same transaction.** Hand the XDR on after signing; the previous
  signatures stay attached, so no merging is needed when signing in sequence. If signers sign
  in parallel, combine their signatures onto one envelope before submitting.
* **Check before submitting.** `useCollectSignatures` reports `missing` signers and whether the
  weight meets the low, medium or high threshold the operations require. Submitting early only
  wastes a sequence number's chance.
* **Mind the expiry.** Set a transaction timeout that outlasts the signing round trip; an
  expired envelope has to be rebuilt and re-signed by everyone.
* **Review what you sign.** Show each signer the decoded operations (`useXdrDecoder`) rather
  than the raw string.
* **Do not reuse a sequence number.** Build the transaction once; building a second one
  invalidates the first.
