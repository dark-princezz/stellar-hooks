# FAQ

> **Last verified:** stellar-hooks v0.2.0 (2026-11-23)

Short answers to the questions that come up most often. For version-specific wallet behavior, see the [compatibility matrix](../compatibility-matrix.md); for error messages, see [Troubleshooting](./troubleshooting.md).

## Wallet and connection

### My wallet is not detected. What should I check?

1. Confirm the extension is installed, unlocked, and enabled on the current site.
2. Reload the page after installing or updating the extension. Some wallets only inject their API on page load.
3. Check that `useFreighter()` reports `isInstalled: true` before calling `connect()`.
4. If you are server-side rendering, only connect after the component has mounted.

If none of these help, open a [bug report](https://github.com/dark-princezz/stellar-hooks/issues/new/choose) and include the wallet name and version. The repository also provides a minimal reproduction starter for bug reports.

### How do I detect a network mismatch?

Read the passphrase reported by the wallet and compare it with the one in your provider configuration:

```tsx
const { networkPassphrase, networkPassphraseMismatch } = useFreighter({
  expectedNetworkPassphrase: "Test SDF Network ; September 2015",
});
```

Prompt the user to switch networks in the wallet before signing. `networkPassphraseMismatch` is available in recent versions; older releases expose only `networkPassphrase`.

### Why does signing work on testnet but fail on mainnet?

Horizon and Soroban RPC endpoints are separate. If `horizonUrl` points to testnet while `networkPassphrase` is mainnet, transactions are built against one network and signed for another. Set both URLs explicitly in `StellarProvider` (see [Configuration](./configuration.md)).

## Fees and transactions

### Why do I get a fee error?

Horizon rejects transactions whose fee is below the network minimum. Read the current network fee with `useFeeStats()` instead of hard-coding a value, and rebuild the transaction immediately before signing so the fee and sequence number are fresh.

### Why did my transaction time out?

After submission, the network needs time to close a ledger. `useTransaction()` and `useTransactionStatus()` expose a polling state; wait for a `success` or `error` status before showing a receipt, and use `refetch()` if the network was busy.

### Can I sponsor fees for my users?

Yes. Build a fee-bump transaction or use a relayer, then submit the wrapped transaction. See the fee-bump examples in the [transactions guide](./transactions.md).

## General usage

### Do I need a `<StellarProvider>`?

Yes. Hooks read network configuration from provider context. Wrap your application once near the root.

### Which networks are supported?

`testnet`, `mainnet`, `futurenet`, and custom networks supplied through `customNetworkConfig` on `<StellarProvider>`.

### Can I use these hooks with React Native or SSR?

Wallet hooks depend on browser extensions and must run in the browser. Read-only hooks can run wherever `@stellar/stellar-sdk` runs; guard all browser-only APIs during server rendering.

### How do I keep data fresh?

Pass `refetchInterval` (in milliseconds) to hooks such as `useStellarAccount()` or `useLedgerEntry()`. Set it to `0` to disable polling.

### Where do I report a bug?

Open an issue with exact package and wallet versions, the expected and actual behavior, and a link to a minimal reproduction. See the [bug report template](https://github.com/dark-princezz/stellar-hooks/blob/main/.github/ISSUE_TEMPLATE/bug_report.md).
