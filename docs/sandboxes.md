# One-Click CodeSandbox & StackBlitz Templates

Try any `stellar-hooks` React hook live in your browser without cloning or setting up a local project.

## Wallet Hooks

- **`useFreighter`**: [StackBlitz](https://stackblitz.com/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=src/examples/useFreighter.example.tsx) | [CodeSandbox](https://codesandbox.io/s/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=/src/examples/useFreighter.example.tsx)
- **`useAlbedo`**: [StackBlitz](https://stackblitz.com/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=src/examples/useAlbedo.example.tsx) | [CodeSandbox](https://codesandbox.io/s/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=/src/examples/useAlbedo.example.tsx)
- **`useXBull`**: [StackBlitz](https://stackblitz.com/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=src/examples/useXBull.example.tsx) | [CodeSandbox](https://codesandbox.io/s/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=/src/examples/useXBull.example.tsx)
- **`useWallet`**: [StackBlitz](https://stackblitz.com/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=src/examples/useWallet.example.tsx) | [CodeSandbox](https://codesandbox.io/s/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=/src/examples/useWallet.example.tsx)

## Soroban & Ledger Hooks

- **`useSorobanContract`**: [StackBlitz](https://stackblitz.com/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=src/examples/useSorobanContract.example.tsx) | [CodeSandbox](https://codesandbox.io/s/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=/src/examples/useSorobanContract.example.tsx)
- **`useSorobanRead`**: [StackBlitz](https://stackblitz.com/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=src/examples/useSorobanRead.example.tsx) | [CodeSandbox](https://codesandbox.io/s/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=/src/examples/useSorobanRead.example.tsx)
- **`useLedgerEntry`**: [StackBlitz](https://stackblitz.com/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=src/examples/useLedgerEntry.example.tsx) | [CodeSandbox](https://codesandbox.io/s/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=/src/examples/useLedgerEntry.example.tsx)
- **`useLedgerEntries`**: [StackBlitz](https://stackblitz.com/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=src/examples/useLedgerEntries.example.tsx) | [CodeSandbox](https://codesandbox.io/s/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=/src/examples/useLedgerEntries.example.tsx)

## Account & Transaction Hooks

- **`useStellarAccount`**: [StackBlitz](https://stackblitz.com/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=src/examples/useStellarAccount.example.tsx) | [CodeSandbox](https://codesandbox.io/s/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=/src/examples/useStellarAccount.example.tsx)
- **`useStellarBalance`**: [StackBlitz](https://stackblitz.com/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=src/examples/useStellarBalance.example.tsx) | [CodeSandbox](https://codesandbox.io/s/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=/src/examples/useStellarBalance.example.tsx)
- **`usePayment`**: [StackBlitz](https://stackblitz.com/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=src/examples/usePayment.example.tsx) | [CodeSandbox](https://codesandbox.io/s/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=/src/examples/usePayment.example.tsx)
- **`useTrustline`**: [StackBlitz](https://stackblitz.com/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=src/examples/useTrustline.example.tsx) | [CodeSandbox](https://codesandbox.io/s/github/dark-princezz/stellar-hooks/tree/main/examples/sandboxes?file=/src/examples/useTrustline.example.tsx)

## Programmatic Access

You can also fetch template links programmatically in your application:

```ts
import { getSandboxUrls } from "stellar-hooks";

const urls = getSandboxUrls("usePayment");
console.log(urls.stackblitzUrl, urls.codesandboxUrl);
```
