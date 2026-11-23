# Edge Runtime Compatibility

> **Last verified:** stellar-hooks v0.2.0 (2026-11-23)

This guide documents edge runtime compatibility for non-React stellar-hooks utilities.

## Scope

Framework-independent utilities under `src/utils/*` and server helpers should avoid Node-only APIs where possible.

## Compatibility

| Utility | Node.js | Vercel Edge | Cloudflare Workers | Notes |
|---|---:|---:|---:|---|
| Validators / formatters | ✅ | ✅ | ✅ | Pure JS/TS |
| Transaction XDR builders | ✅ | ✅ | ⚠️ | Depends on `@stellar/stellar-sdk` bundle/runtime APIs |
| Record/replay file helpers | ✅ | ❌ | ❌ | Uses `node:fs`; use in Node/CI only |
| Mock Soroban RPC server | ✅ | ❌ | ❌ | Uses `node:http`; local test server only |

## Recommendations

- Use non-React utilities in edge runtimes only when they have no Node built-in dependencies.
- Keep file-system and HTTP server mocks in Node test environments.
- For edge environments, prefer passing prebuilt XDR or using fetch-based RPC calls.
- Validate `@stellar/stellar-sdk` compatibility in your target edge runtime before production use.

## Verification

Run targeted checks in CI for Node, and smoke-test edge bundles for utilities you expose to edge handlers.
