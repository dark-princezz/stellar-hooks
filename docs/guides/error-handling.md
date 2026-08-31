# Error Handling Patterns

`stellar-hooks` does not use one single error strategy everywhere. Some hooks expose a simple `error: Error | null`, some return typed transaction errors, some collect per-item failures, and a few treat "missing data" as a valid `null` result instead of an exception.

This guide groups those patterns so you know what to render, what to retry, and which hooks should be wrapped in `try/catch`.

## The Common Rules

- `error` is usually the last failure captured by the hook.
- `isLoading` means the initial request is in flight.
- `isRefetching` means a refresh is in flight after data already exists.
- `refetch()` retries read hooks.
- `reset()` clears transaction hooks back to `idle`.
- `null` often means "no on-chain data found", not "request failed".

## Pattern 1: Standard Read Hooks

Most read-only hooks follow the same shape:

- `data` or a domain-specific value
- `isLoading`
- `error: Error | null`
- `refetch()`

Use this pattern for hooks such as:

- `useAssets`
- `useContractEvents`
- `useEffects`
- `useFeeStats`
- `useLedgerEntry`
- `useLiquidityPool`
- `useOperations`
- `useSorobanTokenBalance`
- `useStellarAccount`
- `useStellarBalance`
- `useStellarOffers`
- `useStellarToml`
- `useTransactionHistory`

Recommended UI flow:

```tsx
const { data, isLoading, error, refetch } = useStellarAccount(publicKey);

if (isLoading) return <Spinner />;
if (error) return <ErrorBanner message={error.message} onRetry={refetch} />;
if (!data) return <EmptyState />;
```

## Pattern 2: Batched Or Composite Reads

Some hooks wrap multiple lower-level fetches. They preserve partial success instead of failing the entire result.

### `useStellarAccounts`

- `accounts[pk]` is `null` when that specific account failed.
- `errors[pk]` stores the per-key failure.
- Top-level `error` is the first failure in the batch, if any.
- `isError` becomes `true` when any key fails.

### `useAssetMetadata`

- Returns `metadata: null` when the asset does not match the issuer's `stellar.toml`.
- Returns an `error` when the account lookup or TOML fetch fails.

### `useContractStorage`

- Returns `raw: null` and `data: null` when the contract key is missing or invalid.
- Propagates the underlying ledger-entry error through `error`.
- Invalid inputs are treated as a suspended fetch instead of throwing during render.

These hooks are designed so one bad item does not poison the rest of the result set.

## Pattern 3: Wallet And Connection Hooks

Wallet hooks usually surface connection or signing failures in `error: Error | null`.

Hooks in this group include:

- `useFreighter`
- `useFreighterAccounts`
- `useWalletKit`
- `useWalletsKit`
- `useWalletConnect`

Important notes:

- Connection probes clear stale errors before retrying.
- Sign helpers may still throw when called with invalid preconditions, such as no connected wallet.
- `useFreighter` also reports network mismatch separately via `networkPassphraseMismatch` and `networkPassphraseWarning`; that is a guard rail, not an exception.

## Pattern 4: Transaction And Write Hooks

Write hooks use a richer transaction state machine:

- `status`
- `hash`
- `result` where applicable
- `error: StellarTransactionError | null`
- `isLoading`, `isSuccess`, `isError`
- `reset()`

Hooks in this group include:

- `useAccountFlags`
- `useAccountMerge`
- `useBumpSequence`
- `useClaimBalance`
- `useCreateAccount`
- `useCreateClaimableBalance`
- `useInflation`
- `useManageData`
- `useMultiSig`
- `usePathPayment`
- `usePayment`
- `useSorobanContract`
- `useStellarTransaction`
- `useTrade`
- `useTransaction`
- `useTrustline`

How to handle them:

```tsx
const { submit, status, error, reset } = useTransaction();

if (error) {
  return <ErrorBanner message={error.message} onRetry={reset} />;
}

return <button onClick={() => submit(signedXdr)} disabled={status !== "idle"} />;
```

The error object is typed for transaction workflows, so it can describe network failures, simulation failures, submission failures, timeouts, and on-chain transaction failures.

## Pattern 5: Hooks That Return `null` Instead Of Throwing

Some hooks treat "not found" as a normal result:

- `useLedgerEntry` returns `null` when the ledger entry does not exist.
- `useStellarToml` returns `data: null` when no TOML could be resolved yet.
- `useAssetMetadata` returns `metadata: null` when there is no matching asset entry.
- `useContractStorage` returns `data: null` when the entry is absent.

When you see `null` and `error === null`, it usually means "nothing was found", not "the request failed".

## Pattern 6: Config Accessors

`useNetwork` and `useStellarNetwork` only read and mutate provider configuration. They do not expose an `error` field because they are not performing remote I/O.

If a network looks wrong here, the issue is usually app setup or provider configuration rather than a fetch failure.

## Good Defaults

- Show `error.message` when `error` is non-null.
- Use `refetch()` for read retries.
- Use `reset()` for write retries.
- Render partial success for batched hooks instead of discarding the whole result.
- Treat `null` as a first-class state when the hook documents it.

## See Also

- [Soroban Guide](/guide/soroban)
- [useFreighter](/hooks/use-freighter)
- [useTransaction](/hooks/use-transaction)
