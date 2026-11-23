# Known Issues

This page tracks problems that depend on a specific wallet extension, SDK, or runtime version. It complements the general [troubleshooting guide](./troubleshooting.md) and the [compatibility matrix](./compatibility-matrix.md).

Entries are ordered by the component that causes them, not by the hook that surfaces them. Before opening a new issue, check whether your version appears here; a workaround may already exist.

## Wallets

| Wallet / version | Symptom | Workaround | Tracking |
| --- | --- | --- | --- |
| Freighter (older releases) | `useFreighter` cannot see the extension or reports "wallet not detected" after the page loads. | Reload the page after installing or updating Freighter, and check that the extension has permission for the current site. See [Freighter connection errors](./troubleshooting.md). | [#727](https://github.com/dark-princezz/stellar-hooks/issues/727) |
| Freighter connected to a different network | A transaction is prepared for testnet but the wallet signs for pubnet, or signing fails with a network mismatch. | Read the wallet passphrase before signing and pass the matching `network` to `StellarProvider`. Detection is tracked in [#1120](https://github.com/dark-princezz/stellar-hooks/issues/1120). | [#1120](https://github.com/dark-princezz/stellar-hooks/issues/1120) |
| Ledger devices with outdated ledger-app-stellar firmware | Contract transactions fail during simulation or signing; classic payments continue to work. | Update ledger-app-stellar through Ledger Live. Check the current results in the [hardware wallet compatibility matrix](./HARDWARE_WALLET_COMPATIBILITY.md). | [#902](https://github.com/dark-princezz/stellar-hooks/issues/902) |

## SDK and runtime

| Component / version | Symptom | Workaround | Tracking |
| --- | --- | --- | --- |
| `@stellar/stellar-sdk` 12.x | Newer Soroban RPC fee fields may be `null`; strict bundlers may not resolve `@stellar/stellar-sdk/minimal`. | Upgrade to `^13.0.0`. If you must stay on 12.x, use `"moduleResolution": "bundler"` or `"node16"`. | [Compatibility matrix](./compatibility-matrix.md) |
| `@stellar/stellar-sdk` 11.x and older | Soroban contract calls fail with incompatible XDR envelopes or missing exports. | Upgrade to `>=12.0.0` (13.x recommended). | [Compatibility matrix](./compatibility-matrix.md) |
| Soroban `i64` / `i128` values | `JSON.stringify()` throws `Do not know how to serialize a BigInt`. | Convert with `scValToNative()` or a formatting utility before storing or logging values. | [#972](https://github.com/dark-princezz/stellar-hooks/issues/972) |
| Horizon URL used as an RPC URL (or vice versa) | Requests fail with 404 or serialization errors even though the network name is correct. | Set `horizonUrl` and `sorobanRpcUrl` separately in `StellarProvider`. | [Compatibility matrix](./compatibility-matrix.md) |

## Reporting a new known issue

Include exact versions for the wallet extension, `@stellar/stellar-sdk`, `@stellar/freighter-api`, and `stellar-hooks`. If possible, fork the [minimal reproduction starter](https://github.com/dark-princezz/stellar-hooks/tree/main/templates/minimal-repro), change only what is needed to trigger the problem, and link that repository from your report.

When a fix ships, update the table row with the first `stellar-hooks` version that contains it instead of deleting the row; older releases remain affected.
