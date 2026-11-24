# Building a review-and-sign screen

> **Last verified:** stellar-hooks v0.2.0 (2026-11-23)

Before asking a user to sign, show them what the transaction does. This guide combines the
XDR decoder, the Soroban argument decoder and the signing hooks into one confirmation step.

## 1. Decode what will be signed

```tsx
import { decodeXdr } from "stellar-hooks";

const decoded = decodeXdr(xdr); // or the useXdrDecoder hook for interactive decoding
```

List each operation (type, destination, asset, amount) from the decoded result instead of
showing the raw base64. For contract calls, name the arguments with the contract spec:

```tsx
import { decodeInvocationArgs } from "stellar-hooks";

const rows = decodeInvocationArgs(invokeArgs, "transfer", spec);
// [{ name: "to", type: "address", value: "G..." }, { name: "amount", type: "i128", value: 100n }]
```

Without a spec the arguments are still decoded, labelled `arg0`, `arg1`.

## 2. Flag what needs attention

Add your own checks before the sign button, for example:

* a destination account that does not exist yet, or a first-time destination
* an amount above a limit you choose
* `setOptions` or `accountMerge` operations (they change who controls the account)
* an unknown contract or function

Show flags in plain language next to the operation they refer to, and require an extra
confirmation for the serious ones.

## 3. Sign

```tsx
const { signTransaction } = useSignTransaction();
<button onClick={() => signTransaction(xdr, { networkPassphrase })} disabled={blockingFlags.length > 0}>Sign</button>
```

For multisig, share the result with `toShareLink` and track progress with
`useCollectSignatures` (see `multisig-coordination.md`).

## Principles

* Decode from the XDR the wallet will actually sign, not from the form state that produced it.
* Never hide operations: show all of them, including ones that look routine.
* Make the destructive path the harder one to click.
