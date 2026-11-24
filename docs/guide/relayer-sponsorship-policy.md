# Relayer Sponsorship Policy

> **Last verified:** stellar-hooks v0.2.0 (2026-11-23)

A relayer sponsors the outer fee-bump envelope so users do not need to hold XLM to pay network fees. The sponsoring account directly bears the cost of every transaction it wraps, so without policy controls even a low-traffic dApp can drain the sponsor's balance quickly—or attract deliberate abuse. This guide explains how to restrict what the relayer will sign, enforce per-account spending limits, and detect misuse early.

---

## How sponsorship works in stellar-hooks

When you pass a `feeBump` option to `useTransaction` or call `useFeeBumpTransaction`, the hook:

1. Signs the user's inner transaction.
2. Wraps it in a `FeeBumpTransaction` sourced from the sponsor key.
3. Signs the outer envelope with the sponsor's key (via Freighter or a `PasskeyFeePayer`).
4. Submits the wrapped envelope to Horizon.

The sponsor account pays the outer fee regardless of whether the inner transaction succeeds. All policy enforcement must therefore happen **before** `submit()` is called, not after.

```
User  ──inner tx──▶  dApp client
                        │
                 feeBump wrapper
                        │
                 Sponsor signs outer tx
                        │
                   ──▶  Horizon
```

---

## Operation allowlists

The simplest protection is refusing to sponsor transaction types your dApp does not need. Decode the inner XDR before wrapping it and reject any operations outside an explicit allowlist.

### Allowlisted operation types

```ts
import { TransactionBuilder, xdr } from "@stellar/stellar-sdk";

const ALLOWED_OPERATION_TYPES = new Set([
  "payment",
  "invokeHostFunction",   // Soroban contract calls
  "changeTrust",
]);

function assertAllowedOperations(innerXdr: string, networkPassphrase: string): void {
  const tx = TransactionBuilder.fromXDR(innerXdr, networkPassphrase);
  if ("innerTransaction" in tx) {
    throw new Error("Inner XDR must not already be a fee-bump envelope.");
  }

  for (const op of tx.operations) {
    if (!ALLOWED_OPERATION_TYPES.has(op.type)) {
      throw new Error(
        `Operation type "${op.type}" is not permitted for sponsored transactions.`
      );
    }
  }
}
```

Call this inside a middleware or directly in an `onBeforeSubmit` callback before the outer envelope is built.

### Contract allowlist for Soroban

If you only sponsor invocations of your own contracts, also check the contract address:

```ts
import { Operation, xdr } from "@stellar/stellar-sdk";

const ALLOWED_CONTRACTS = new Set([
  "CCMY_CONTRACT_ID_1...",
  "CCMY_CONTRACT_ID_2...",
]);

function assertAllowedContract(innerXdr: string, networkPassphrase: string): void {
  const tx = TransactionBuilder.fromXDR(innerXdr, networkPassphrase);
  for (const op of (tx as any).operations) {
    if (op.type === "invokeHostFunction") {
      const contractId: string | undefined = op.func?.invokeContract?.contractAddress?.contractId?.toString("hex");
      if (contractId && !ALLOWED_CONTRACTS.has(contractId)) {
        throw new Error(`Contract ${contractId} is not in the sponsorship allowlist.`);
      }
    }
  }
}
```

---

## Restricting which accounts can be sponsored

Depending on your model you may want an open allowlist (any verified user), a closed allowlist (a fixed set of addresses), or a blocklist (deny known abusers while allowing everyone else).

### Closed allowlist — sign-up gated sponsorship

```ts
// Server-side — your backend issues a short-lived token when the user completes sign-up.
// The relayer verifies the token before wrapping.

async function isEligible(userPublicKey: string): Promise<boolean> {
  const response = await fetch(`/api/sponsorship/eligible?account=${userPublicKey}`);
  if (!response.ok) return false;
  const { eligible } = await response.json() as { eligible: boolean };
  return eligible;
}

// In your relayer service:
async function guardSponsor(innerXdr: string, networkPassphrase: string, userPublicKey: string) {
  if (!(await isEligible(userPublicKey))) {
    throw new Error(`Account ${userPublicKey} is not eligible for sponsorship.`);
  }
  assertAllowedOperations(innerXdr, networkPassphrase);
}
```

### Dynamic blocklist

Maintain a blocklist in a database or key-value store. Add entries automatically when abuse is detected (see [Monitoring for abuse](#monitoring-for-abuse)) or manually when investigating incidents.

```ts
const blockedAccounts = new Set<string>(); // in production: load from Redis / database

function assertNotBlocked(publicKey: string): void {
  if (blockedAccounts.has(publicKey)) {
    throw new Error(`Account ${publicKey} is blocked from sponsorship.`);
  }
}
```

---

## Per-account quotas

Quotas prevent a single address from consuming a disproportionate share of the relayer's budget. Track usage in a persistent store (Redis, Postgres, etc.) and enforce limits in the relayer before signing.

### Sliding-window rate limit

```ts
interface QuotaStore {
  /** Returns usage count for `account` within the last `windowMs` milliseconds. */
  count(account: string, windowMs: number): Promise<number>;
  /** Records one use for `account`. */
  record(account: string): Promise<void>;
}

const WINDOW_MS = 60 * 60 * 1000;   // 1 hour
const MAX_PER_WINDOW = 20;           // maximum sponsored transactions per account per hour

async function enforceQuota(store: QuotaStore, account: string): Promise<void> {
  const used = await store.count(account, WINDOW_MS);
  if (used >= MAX_PER_WINDOW) {
    throw new Error(
      `Account ${account} has reached the sponsorship limit of ${MAX_PER_WINDOW} transactions per hour.`
    );
  }
  await store.record(account);
}
```

### Daily XLM spending cap per account

Track cumulative fees paid on behalf of each account and refuse to sponsor once the daily cap is exceeded:

```ts
const DAILY_FEE_CAP_STROOPS = 10_000_000; // 1 XLM per account per day

interface FeeStore {
  dailyFees(account: string): Promise<number>;
  addFee(account: string, fee: number): Promise<void>;
}

async function enforceFeeCapPerAccount(store: FeeStore, account: string, feeStoops: number): Promise<void> {
  const spent = await store.dailyFees(account);
  if (spent + feeStoops > DAILY_FEE_CAP_STROOPS) {
    throw new Error(
      `Account ${account} has reached the daily sponsorship fee cap.`
    );
  }
  await store.addFee(account, feeStoops);
}
```

### Global relayer budget guard

In addition to per-account limits, guard the relayer's total balance:

```ts
import { Horizon } from "@stellar/stellar-sdk";

const MIN_RELAYER_BALANCE_XLM = 10; // stop sponsoring if balance falls below 10 XLM

async function assertRelayerSolvent(horizonUrl: string, relayerPublicKey: string): Promise<void> {
  const server = new Horizon.Server(horizonUrl);
  const account = await server.loadAccount(relayerPublicKey);
  const nativeBalance = account.balances.find((b) => b.asset_type === "native");
  const xlm = parseFloat(nativeBalance?.balance ?? "0");
  if (xlm < MIN_RELAYER_BALANCE_XLM) {
    throw new Error(
      `Relayer balance (${xlm} XLM) is below the minimum threshold. Sponsorship is temporarily suspended.`
    );
  }
}
```

---

## Wiring policies into the middleware pipeline

stellar-hooks exposes a `TransactionMiddleware` interface and a global registry. Register your relayer policies as middleware so they run automatically for every sponsored submission.

```ts
import {
  registerTransactionMiddleware,
  createValidationMiddleware,
  type TransactionMiddlewareContext,
} from "stellar-hooks";

// 1. Operation allowlist
const operationGuard = createValidationMiddleware((ctx: TransactionMiddlewareContext) => {
  assertAllowedOperations(ctx.signedXdr, ctx.networkPassphrase);
});

// 2. Account eligibility
const eligibilityGuard = createValidationMiddleware(async (ctx) => {
  const userPublicKey = ctx.meta["userPublicKey"] as string | undefined;
  if (!userPublicKey) throw new Error("userPublicKey missing from middleware context.");
  assertNotBlocked(userPublicKey);
  if (!(await isEligible(userPublicKey))) {
    throw new Error("Account is not eligible for sponsorship.");
  }
});

// 3. Quota enforcement
const quotaGuard = createValidationMiddleware(async (ctx) => {
  const userPublicKey = ctx.meta["userPublicKey"] as string;
  await enforceQuota(myQuotaStore, userPublicKey);
});

// Register globally — applies to every useTransaction / useFeeBumpTransaction call in the app.
registerTransactionMiddleware(operationGuard);
registerTransactionMiddleware(eligibilityGuard);
registerTransactionMiddleware(quotaGuard);
```

Pass `userPublicKey` through the middleware context from the calling hook:

```tsx
const { submit } = useTransaction({
  feeBump: { fee: "1000", sponsor: "GSPONSOR..." },
  middleware: [
    async (ctx, next) => {
      ctx.meta["userPublicKey"] = connectedPublicKey;
      await next();
    },
  ],
});
```

---

## Monitoring for abuse

Passive policy checks stop known patterns. Monitoring catches unknown ones.

### Metrics to track

| Metric | Why it matters |
|---|---|
| Sponsored transactions per account per hour | Detects burst abuse and bots |
| Cumulative fees paid per account per day | Catches slow drains |
| Relayer account balance over time | Early warning before funds are exhausted |
| Inner transaction operation distribution | Spikes in unusual op types indicate new abuse vectors |
| Rejected sponsorship requests (by reason) | Confirms policies are firing; shows attempted attack patterns |

### Logging middleware

Add a logging middleware before the guard middlewares so every attempt—allowed or denied—is recorded:

```ts
import { createLoggingMiddleware } from "stellar-hooks";

const auditLogger = createLoggingMiddleware({
  name: "SponsorAudit",
  logger: (message, context) => {
    // Ship to your observability stack (Datadog, OpenTelemetry, Loki, etc.)
    myLogger.info(message, context);
  },
});

// Register before guards so denials are also logged.
registerTransactionMiddleware(auditLogger);
registerTransactionMiddleware(operationGuard);
registerTransactionMiddleware(eligibilityGuard);
registerTransactionMiddleware(quotaGuard);
```

### Automatic blocklist on repeated violations

When the quota guard fires for the same account several times in a short window, automatically add it to the blocklist:

```ts
const VIOLATION_THRESHOLD = 5;         // violations within 10 minutes triggers a block
const VIOLATION_WINDOW_MS = 10 * 60 * 1000;

const violationCounts = new Map<string, { count: number; firstAt: number }>();

function recordViolation(account: string): void {
  const now = Date.now();
  const entry = violationCounts.get(account);

  if (!entry || now - entry.firstAt > VIOLATION_WINDOW_MS) {
    violationCounts.set(account, { count: 1, firstAt: now });
    return;
  }

  entry.count += 1;
  if (entry.count >= VIOLATION_THRESHOLD) {
    blockedAccounts.add(account);
    myLogger.warn(`Account ${account} auto-blocked after ${entry.count} quota violations.`);
    violationCounts.delete(account);
  }
}
```

Call `recordViolation(userPublicKey)` inside your quota guard's catch block.

### Alerting thresholds

Set alerts (e.g., PagerDuty, Slack webhook) on:

- Relayer balance drops below your `MIN_RELAYER_BALANCE_XLM` threshold.
- More than N sponsorship rejections per minute for the same account.
- Any account that hits `MAX_PER_WINDOW` more than once per day (sustained abuse, not a one-off burst).
- Inner transaction fee (`feeBump.fee`) deviates more than 5× from the median fee of the last 100 sponsored transactions—a signal someone is probing how much they can extract.

---

## Passkey / smart account relayers

For passkey smart accounts (`PasskeyFeePayer`), the same principles apply but the policy runs server-side because the fee payer key lives on your backend:

```ts
import { type PasskeyFeePayer } from "stellar-hooks";

function createProductionFeePayer(
  keypair: Keypair,
  quotaStore: QuotaStore
): PasskeyFeePayer {
  return {
    publicKey: keypair.publicKey(),
    async signTransaction(txXdr, { networkPassphrase }) {
      const tx = TransactionBuilder.fromXDR(txXdr, networkPassphrase);

      // Extract the smart account address from the first auth entry.
      const smartAccountAddress = extractSmartAccountAddress(tx);

      assertNotBlocked(smartAccountAddress);
      await enforceQuota(quotaStore, smartAccountAddress);
      assertAllowedOperations(txXdr, networkPassphrase);
      await assertRelayerSolvent(horizonUrl, keypair.publicKey());

      tx.sign(keypair);
      return tx.toXDR();
    },
  };
}
```

Because `signTransaction` is called server-side, you can call your database directly and keep the keypair out of the browser entirely.

---

## Summary checklist

- [ ] Allowlist the operation types the relayer will wrap.
- [ ] For Soroban, also allowlist the contract addresses you deploy.
- [ ] Gate eligibility behind sign-up or KYC if appropriate.
- [ ] Maintain a blocklist; auto-populate it on repeated violations.
- [ ] Enforce a per-account transaction count limit over a sliding window.
- [ ] Enforce a per-account cumulative fee cap per day.
- [ ] Guard the relayer's own balance and suspend sponsorship when it falls below a minimum.
- [ ] Log every sponsorship attempt (allowed and rejected) to an observability system.
- [ ] Alert on relayer balance drops, sustained violation patterns, and anomalous fee spikes.

---

## See also

- [`useFeeBumpTransaction`](/hooks/use-fee-bump-transaction) — wrap pre-built inner transactions.
- [`useTransaction`](/hooks/use-transaction) — `feeBump` option for inline sponsorship.
- [Transaction middleware](/guide/middleware) — register global policies that run on every submission.
- [Passkey onboarding example](/examples/passkey-onboarding) — server-side `PasskeyFeePayer` implementation.
