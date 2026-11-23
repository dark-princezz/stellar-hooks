# Next.js Server Actions + stellar-hooks

This example shows a server action that builds an unsigned transaction and a client component that signs and submits it with a wallet.

## Server action

```ts
// app/actions/build-payment.ts
'use server';

import { buildUnsignedPaymentTransaction } from 'stellar-hooks/utils/server/buildUnsignedTransaction';

export async function buildPaymentAction(input: {
  source: string;
  destination: string;
  amount: string;
  sequence: string;
}) {
  return buildUnsignedPaymentTransaction({
    ...input,
    networkPassphrase: 'Test SDF Network ; September 2015',
  });
}
```

## Client component

```tsx
'use client';

import { useTransition } from 'react';
import { useFreighter } from 'stellar-hooks';
import { buildPaymentAction } from './actions/build-payment';

export function PayButton() {
  const { publicKey, signTransaction } = useFreighter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending || !publicKey}
      onClick={() => startTransition(async () => {
        const xdr = await buildPaymentAction({ source: publicKey!, destination: 'G...', amount: '10', sequence: '123' });
        const signed = await signTransaction(xdr, { networkPassphrase: 'Test SDF Network ; September 2015' });
        // submit signed XDR to Horizon/Soroban RPC
        console.log(signed);
      })}
    >
      Pay
    </button>
  );
}
```

## Notes
- Keep signing on the client wallet; the server only builds unsigned XDR.
- Validate all inputs server-side before building transactions.
