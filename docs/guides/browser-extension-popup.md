# Browser extension popup integration (Manifest V3)

> **Last verified:** stellar-hooks v0.2.0 (2026-11-23)

## Overview

stellar-hooks React hooks can be used in a Manifest V3 extension popup UI. The popup is a browser-like page, but it has extension CSP/storage constraints.

## Setup

- Build popup as a React app (Vite/CRXJS or similar).
- Wrap UI with `StellarProvider`.
- Use wallet connectors that work in extension context; browser extension wallets may require message passing or deep links depending on wallet.

## Manifest considerations

```json
{
  "manifest_version": 3,
  "action": { "default_popup": "index.html" },
  "permissions": ["storage"],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

## Storage

- Prefer `chrome.storage.local` for persistent extension state.
- Do not store private keys in extension storage.
- Store only public data (public key, network, preferences).

## CSP

- Avoid remote scripts; bundle assets.
- If connecting to Horizon/Soroban RPC, include host permissions as needed.
- Inline scripts are restricted by MV3 CSP.

## Wallet notes

- Freighter/Albedo/xBull behavior depends on extension environment and permissions.
- For signing, prefer wallet adapters that support extension popups or use external signing flows.
