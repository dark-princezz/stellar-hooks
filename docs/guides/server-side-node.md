# Server-side usage in Node.js

> **Last verified:** stellar-hooks v0.2.0 (2026-11-23)

stellar-hooks includes framework-independent helpers that can be used outside React.

## What works outside React

- Validators and formatters in `src/utils/*`
- Transaction builders (e.g. unsigned XDR builders)
- SEP-10 token verification helpers
- Mock RPC/test utilities for Node test environments

## What requires React

- Hooks (`use*`) must run inside React components/hooks.
- Wallet UI components require a browser DOM.

## Minimal Node.js example

```js
import { buildUnsignedPaymentTransaction } from 'stellar-hooks/utils/server/buildUnsignedTransaction';
import { verifySep10Token } from 'stellar-hooks/utils/server/verifySep10Token';

const xdr = buildUnsignedPaymentTransaction({
  source: 'G...',
  destination: 'G...',
  amount: '10',
  sequence: '123',
  networkPassphrase: 'Test SDF Network ; September 2015',
});
console.log(xdr);

const claims = verifySep10Token({ token: process.env.SEP10_JWT, secret: process.env.JWT_SECRET, audience: 'my-app' });
console.log(claims.sub);
```

## Notes
- Do not use production secrets in tests.
- Keep Node-only helpers (fs/http) out of edge/browser bundles.
