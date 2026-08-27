# Path Payment Swap — `stellar-hooks` Example

A complete Vite + React token-swap UI demonstrating how to wire [`usePathPayment`](../../README.md) into a real swap form with slippage protection, transaction lifecycle tracking, and a link to the testnet explorer on success.

---

## What this example shows

| Feature | Details |
|---|---|
| Wallet connection | `useFreighter` — detects Freighter, prompts install or connect |
| Asset selector | XLM (native) ↔ USDC (testnet issuer hard-coded for demo) |
| Strict-send mode | User specifies exactly how much to send; receives *at least* `destMin` |
| Slippage tolerance | 0.5 % / 1 % / 2 % / 5 % selector; drives `destMin` calculation |
| Estimated receive | UI-only estimate (assumes 1:1 rate); real rate is determined by Horizon |
| `destMin` protection | `destMin = estimatedReceive × (1 − slippage)` — transaction reverts on Stellar if the path cannot fulfil this |
| Lifecycle display | idle → submitting → polling → success / error status banners |
| Explorer link | Transaction hash links directly to `stellar.expert/explorer/testnet` |

---

## Swap mechanics

### Strict-send vs strict-receive

Stellar's path payment operation comes in two flavours.

**`strict-send`** (used in this example)

> "I want to send *exactly* X of asset A and receive *at least* Y of asset B."

- `sendAmount` — the exact amount deducted from the sender's account.
- `destMin` — the floor for what the recipient receives. If Horizon cannot route enough through the available order books to deliver `destMin`, the transaction fails and **no funds move**.

**`strict-receive`** (not used here, but supported by the hook)

> "I want the recipient to receive *exactly* Y of asset B; deduct *at most* X from my account."

- `sendAmount` becomes the *maximum* the sender is willing to spend.
- `destMin` becomes the *exact* destination amount.

### Slippage protection

```
destMin = estimatedReceive × (1 − slippage)
```

Example with 1 % slippage and 10 XLM → USDC:

```
estimatedReceive = 10.0000000 USDC  (UI estimate — actual rate set by Horizon)
destMin          = 10 × (1 − 0.01) = 9.9000000 USDC
```

The transaction is submitted with `destMin = 9.9`. If the best available path on testnet only yields 9.85 USDC, the transaction is rejected — protecting the user from unexpected slippage.

### Path auto-discovery

When `path` is omitted from `UsePathPaymentOptions` the hook (via the underlying Stellar SDK) lets Horizon auto-discover the optimal route through intermediate order books. You can supply explicit intermediate assets in the `path` array if you need deterministic routing.

---

## Project structure

```
examples/path-payment-swap/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx      # React root mount
    ├── App.tsx       # Swap UI — wallet connect → swap form
    └── index.css     # Styles
```

---

## How to run

### Prerequisites

- Node.js ≥ 18
- [Freighter browser extension](https://freighter.app) set to **Testnet**
- A funded testnet account — use [Stellar Laboratory Friendbot](https://laboratory.stellar.org/#account-creator?network=test) to fund yours

### Install & start

```bash
# from the repo root
cd examples/path-payment-swap
npm install
npm run dev
```

Open `http://localhost:3000`, connect Freighter, fill in the form, and click **Swap**.

### Build for production

```bash
npm run build
npm run preview
```

---

## Key code snippets

### Wiring `usePathPayment`

```tsx
import { usePathPayment } from "stellar-hooks";
import type { PathPaymentAsset } from "stellar-hooks";

const USDC: PathPaymentAsset = {
  type: "credit",
  code: "USDC",
  issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
};
const XLM: PathPaymentAsset = { type: "native" };

// destMin derived from slippage
const destMin = (parseFloat(sendAmount) * (1 - slippage)).toFixed(7);

const { submit, status, hash, error, isLoading, isSuccess, isError, reset } =
  usePathPayment({
    mode: "strict-send",
    sendAsset: XLM,
    sendAmount,            // exact amount deducted
    destination,           // G… recipient public key
    destAsset: USDC,
    destMin,               // floor for received amount
    fee: 100,              // stroops
    timeoutSeconds: 60,
  });
```

### Transaction lifecycle

```tsx
// status: "idle" | "submitting" | "polling" | "success" | "error"
{status === "submitting" && <p>Submitting…</p>}
{status === "polling"    && <p>Waiting for confirmation…</p>}
{isSuccess && hash && (
  <a href={`https://stellar.expert/explorer/testnet/tx/${hash}`}>
    View on Stellar Expert
  </a>
)}
{isError && <p>{error?.message}</p>}
```

---

## Notes

- This example targets **Stellar Testnet**. Do not use real funds.
- The USDC issuer address is Circle's testnet anchor for demo purposes only.
- The 1:1 estimated receive rate is a UI convenience — the actual conversion rate is whatever Horizon finds via path-finding. Slippage protection via `destMin` is real and enforced at the protocol level.
- To switch to `strict-receive`, change `mode: "strict-receive"` and flip the meaning of `sendAmount` (max to spend) and `destMin` (exact to receive).
