# useStellarPaymentQR / useWalletDeepLink

```tsx
const { qrValue, isValid, errors } = useStellarPaymentQR({
  destination: 'GA5Z...', amount: '12.5', assetCode: 'USDC', assetIssuer: 'GBBD...',
})

const { buildLink, open } = useWalletDeepLink({ wallet: 'lobstr' })
open({ type: 'pay', destination: 'GA5Z...', amount: '10' })
```

`useStellarPaymentQR` produces a SEP-7 `web+stellar:pay` URI to encode with any QR
renderer (none is bundled). `useWalletDeepLink` wraps the same builder for `pay` and
`tx` requests; the LOBSTR and Albedo URL shapes are best-effort and should be
verified against each wallet's current docs. `wallet: "custom"` takes a base you supply.

See `examples/qr-scanner-payment` for the scanner side, and `parseSep7PayUri` /
`buildSep7PayUri` in `utils/sep7`.
