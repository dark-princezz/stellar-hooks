# @stellar-hooks/svelte (prototype)

Prototype Svelte stores mirroring the most-used React hooks. This package exists to find out which core logic should be extracted before a stable Svelte binding is published; it is not part of the supported `stellar-hooks` surface yet.

## Stores

- `useStellarAccount` — account, balances, loading/error state, polling
- `useSorobanTokenBalance` — Soroban token balance with local formatting

Each store accepts a plain value or a Svelte `Readable`, so changing an address reactively triggers a new request. Polling and subscriptions are released when the last subscriber unsubscribes.

## Usage

```svelte
<script lang="ts">
  import { readable } from "svelte/store";
  import { useStellarAccount } from "@stellar-hooks/svelte";

  const publicKey = readable("GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI");
  const { data, isLoading, xlmBalance, error } = useStellarAccount(publicKey);
</script>

{#if $isLoading}
  <p>Loading…</p>
{:else if $error}
  <p>{$error.message}</p>
{:else if $data}
  <p>{$data.accountId}: {$xlmBalance} XLM</p>
{/if}
```

## Feedback

Report gaps in the store API against the [Svelte prototype issue](https://github.com/dark-princezz/stellar-hooks/issues/1160).
