# Security Trade-offs of Pre-Signed Recurring Transactions (ibinola-927)

Standalone warning documentation for [#927](https://github.com/dark-princezz/stellar-hooks/issues/927): custody and revocation limitations of the pre-signed recurring-payment pattern.

## Pattern summary
A pre-signed recurring-payment flow typically creates a series of transactions in advance (or a transaction with future timebounds/sequence strategy), signs them with the payer's key, and gives them to a service/merchant to submit at scheduled intervals.

## Key trade-offs and risks

### 1. Custody / key exposure boundary
- **No third-party custody of funds**: assets remain in the payer account until submitted transactions execute on-chain.
- **But signed transaction custody exists**: whoever holds pre-signed XDR can submit it when valid. Treat pre-signed envelopes as bearer-like payment authority within their validity window.
- **Operational risk**: storing pre-signed XDR in plaintext DB/logs/backups expands compromise blast radius.

### 2. Revocation limitations
- **Cannot "unsign" a distributed transaction**: once an envelope is shared, revocation is indirect.
- **Common revocation strategies**:
  - **Sequence-number invalidation**: bump account sequence so pre-signed txs with old sequence become invalid. This can invalidate many pending pre-signed txs at once (coarse-grained).
  - **Timebounds**: short validity windows limit exposure but require re-signing/renewal.
  - **Preauthorization/signer controls**: use additional signers, multisig, or pre-auth tx patterns where possible; changing signer weights/thresholds can invalidate dependent flows.
  - **Account merge/reconfiguration**: extreme/operationally heavy; may break other flows.
- **No universal fine-grained revoke**: revoking one future payment without affecting others is difficult unless the construction was designed for it.

### 3. Amount, destination, and timing certainty
- Pre-signed txs lock in critical fields (destination, asset, amount, memo-related behavior depending on construction, fee/source constraints).
- This is good for predictability but bad for flexibility (price changes, subscription updates, paused plans).
- If fee/bump/sequence assumptions change, submission can fail unexpectedly.

### 4. Liveness and submission trust
- A merchant/service may fail to submit on schedule, submit late, or submit at the edge of validity.
- Users need clear visibility into which pre-signed payments remain outstanding, submitted, expired, or invalidated.

### 5. UX and consent expectations
- Users may not understand they granted future spend authority.
- UIs should show: total committed amount, number/installments, per-payment amount, destination, validity windows, and revocation method/cost.

## Recommended guardrails
- Prefer **short timebounds** and explicit renewal over long-lived far-future pre-signed batches.
- Store pre-signed XDR encrypted at rest; minimize logging; redact from telemetry.
- Maintain a revocation runbook: sequence bump/multisig policy change, customer communication, and reconciliation steps.
- Track status in an auditable ledger: created, distributed, submitted, confirmed, failed, expired, revoked.
- For high-value/long-running subscriptions, evaluate alternatives (pull-based flows with explicit user approval, smart-contract/Soroban-based escrow logic where appropriate, or custodial/mediated arrangements with clear trust model).

## Warning
Pre-signed recurring transactions reduce on-demand signing friction but **do not provide simple per-payment revocation**. Treat every pre-signed envelope as sensitive authorization material until it is executed, expired, or invalidated.
