# Electron integration guide

## Overview

Electron apps do not have normal browser wallet extensions available. Use wallet-connect style flows, hardware-backed signers, or explicit signing bridges.

## Recommended approaches

1. **External wallet via WalletConnect / deep link** - open system wallet, receive signed tx.
2. **Hardware wallet integration** - sign with Ledger/Trezor through Electron main process bridges.
3. **Custodial/remote signer service** - only for controlled environments; never embed production secrets in renderer.

## Architecture

- Renderer: React UI using stellar-hooks for account/balance/tx state.
- Main process: secure IPC handlers for signing/device access.
- Preload: expose minimal, typed IPC API.

## Security

- Enable `contextIsolation: true`, `nodeIntegration: false`.
- Validate all IPC payloads.
- Do not expose private keys to renderer.
- Use test keys only in automated tests.

## Example flow

```ts
// renderer
const xdr = await buildUnsignedTx(...);
const signed = await window.walletApi.signTransaction(xdr);
await submitSignedTransaction(signed);
```
