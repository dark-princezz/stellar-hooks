# @stellar-hooks/solid (prototype)

SolidJS primitives mirroring the account, token balance, and wallet hooks from `stellar-hooks`, built on the framework-agnostic `@stellar-hooks/core` package. This is a spike to check that the core API fits fine-grained reactivity; it is not part of the supported `stellar-hooks` surface yet.

## Primitives

- `createStellarAccount` — account state with reactive address and polling
- `createSorobanTokenBalance` — token balance with local formatting
- `createFreighterWallet` — connection, address, and network state

Values can be passed directly or as accessors/signals. Only the signals that are read are tracked, so changing an address updates the affected resource without re-running unrelated components.

## Usage

```tsx
import { createSignal } from "solid-js";
import { createStellarAccount } from "@stellar-hooks/solid";

function Account() {
  const [publicKey] = createSignal("GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI");
  const { data, isLoading, xlmBalance, error } = createStellarAccount(publicKey);

  return (
    <Show when={!isLoading()} fallback={<p>Loading…</p>}>
      <Show when={!error()} fallback={<p>{error()?.message}</p>}>
        <p>{data()?.accountId}: {xlmBalance()} XLM</p>
      </Show>
    </Show>
  );
}
```

## Feedback

Report API gaps against the [SolidJS prototype issue](https://github.com/dark-princezz/stellar-hooks/issues/1161).
