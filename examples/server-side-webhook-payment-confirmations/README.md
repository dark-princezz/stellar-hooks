# Server-side webhook example for payment confirmations (prismn-917)

Standalone example for [#917](https://github.com/dark-princezz/stellar-hooks/issues/917): watch an account via Horizon streaming and fire a webhook on incoming payments.

## What this example shows
- Connect to Horizon SSE payment/operation stream for a configured account.
- Filter incoming payment/create_account operations.
- POST a JSON webhook when a matching payment is seen.
- Deduplicate by operation/paging token to reduce replay noise.
- Reconnect with backoff on stream errors.

## Files
- `index.mjs` - Node.js example script.
- `.env.example` - required environment variables.

## Run
```bash
cd examples/server-side-webhook-payment-confirmations
cp .env.example .env
# edit .env
node index.mjs
```

## Notes
- This is a standalone example; it is not wired into package exports/builds.
- Use HTTPS webhook endpoints in production and sign webhook payloads (e.g. HMAC) before trusting them downstream.
- For high reliability, persist cursor and process events idempotently in your webhook consumer.
