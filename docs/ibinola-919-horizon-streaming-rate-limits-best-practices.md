# Horizon Streaming Rate Limits and Best Practices (ibinola-919)

Standalone documentation for [#919](https://github.com/dark-princezz/stellar-hooks/issues/919): concurrent Horizon streaming subscriptions, limits, and safe usage patterns.

## What Horizon streaming is
Horizon streaming uses Server-Sent Events (SSE) / long-lived HTTP connections for resources like accounts, operations, effects, ledgers, trades, etc. Each active stream keeps a connection open and consumes server/client resources.

## Practical limits (operator- and deployment-dependent)
There is **no single universal hard number** safe for every app, because limits depend on:
- **Horizon provider / infrastructure**: SDF public Horizon, self-hosted Horizon, or third-party provider quotas.
- **Rate limiting / connection caps**: per-IP/per-key concurrent connection limits, request rate limits, and firewall/load balancer timeouts.
- **Client environment**: browser connection limits per origin, mobile network constraints, memory/CPU for event processing.
- **Query shape**: account-specific streams are cheaper to scale than many broad/global streams.

**Rule of thumb:** treat concurrent streams as scarce. For browser apps, keep active streams low (often 1-5 per tab/user context) and prefer multiplexing/polling fallback for non-critical updates.

## Best practices

### 1. Minimize concurrent streams
- Stream only what the active UI needs; close streams on unmount/tab hide/route change.
- Prefer one account-filtered stream over multiple overlapping streams when possible.
- Avoid opening duplicate streams for the same account/resource across components; share via context/store.

### 2. Use cursors and resume safely
- Start from `cursor=now` for live UI, but persist last-seen cursor/paging token when you need replay/resume.
- On reconnect, resume from last processed cursor to avoid missing events or reprocessing large windows.

### 3. Handle disconnects and backoff
- SSE connections can drop due to proxies, timeouts, deploys, or rate limits.
- Implement exponential backoff with jitter on reconnect; cap max delay.
- Surface connection state (`connected/reconnecting/error`) in devtools/UI where useful.

### 4. Respect provider limits
- Check your Horizon provider docs/quotas (SDF/public vs private). Self-hosted operators should tune rate limiting, max connections, and ingress timeouts.
- If you hit 429/connection refusals/timeouts, reduce concurrency, add backoff, and consider polling or batching.

### 5. Avoid event-processing bottlenecks
- Keep `onMessage` handlers lightweight; offload heavy work and debounce UI updates.
- Deduplicate by event id/paging token where retries/reconnects may replay.

### 6. Prefer polling when real-time is unnecessary
- For dashboards/history views with minute-level freshness, polling with ETag/cursor pagination can be cheaper and more reliable than many SSE streams.

## Recommended `stellar-hooks` usage pattern
- Gate streams behind `enabled` and active visibility.
- Centralize stream lifecycle in one hook/provider per account/resource.
- Provide `onError` and reconnect controls; log/measure reconnect rates.
- For payment notifications, watch only the target account and filter event types client-side.

## Operational checklist
- [ ] Document chosen Horizon provider and its connection/rate limits.
- [ ] Cap concurrent streams per session/tab.
- [ ] Implement reconnect backoff + jitter.
- [ ] Persist/handle cursor for resume where needed.
- [ ] Monitor 429s, disconnect frequency, and event lag.
