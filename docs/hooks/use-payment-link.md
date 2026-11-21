# usePaymentLink

Generate shareable Stellar payment requests (SEP-0007 URIs and wallet web links).

## Import

```tsx
import { usePaymentLink } from 'stellar-hooks'
```

## Usage

### Basic Native Payment Link

```tsx
function PaymentQrModal() {
  const { uri, albedoUrl, isValid, openInWallet, copyToClipboard } = usePaymentLink({
    recipient: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    amount: "25",
    asset: "native",
    memo: "Order #4092",
  })

  return (
    <div>
      <p>Payment URI: <code>{uri}</code></p>
      <button onClick={() => openInWallet("sep7")} disabled={!isValid}>
        Open in Compatible Wallet
      </button>
      <button onClick={() => openInWallet("albedo")} disabled={!isValid}>
        Pay with Albedo
      </button>
      <button onClick={() => copyToClipboard("uri")} disabled={!isValid}>
        Copy Payment Link
      </button>
    </div>
  )
}
```

### Credit Asset Payment Link

```tsx
const paymentLink = usePaymentLink({
  recipient: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
  amount: "50",
  asset: {
    type: "credit",
    code: "USDC",
    issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  },
  memo: "10982",
  memoType: "id",
})
```

## API

### Parameters

```typescript
interface UsePaymentLinkOptions {
  /** Recipient Stellar public key (G...), muxed address (M...), or federated address */
  recipient?: string
  /** Destination address alias */
  destination?: string
  /** Amount to request */
  amount?: string | number
  /** Asset descriptor (native or credit) or asset code */
  asset?: PaymentLinkAsset
  /** Optional asset code if not specified via asset object */
  assetCode?: string
  /** Optional asset issuer if not specified via asset object */
  assetIssuer?: string
  /** Optional payment memo */
  memo?: string
  /** Memo type: "text" | "id" | "hash" | "return" */
  memoType?: PaymentLinkMemoType
  /** Optional message displayed to the user by compatible wallets */
  message?: string
  /** Optional callback URL to receive signed transaction info */
  callbackUrl?: string
  /** Network passphrase */
  networkPassphrase?: string
  /** Custom handler for opening URIs */
  openUri?: (uri: string) => void
}
```

### Return Value

```typescript
interface UsePaymentLinkReturn {
  /** Standard SEP-0007 URI: web+stellar:pay?... */
  uri: string
  /** Standard SEP-0007 URI: web+stellar:pay?... */
  sep7Uri: string
  /** Web URL for Albedo web signer: https://albedo.link/#pay?... */
  albedoUrl: string
  /** Web link URL for Lobstr: https://lobstr.co/pay?... */
  lobstrUrl: string
  /** Value suitable for encoding in a QR code (standard SEP-0007 URI) */
  qrValue: string
  /** Whether the current parameters form a valid payment request */
  isValid: boolean
  /** List of validation error messages */
  errors: string[]
  /** Open payment link in wallet or browser */
  openInWallet: (target?: "sep7" | "albedo" | "lobstr" | "browser") => void
  /** Copy payment URI or specified URL to clipboard */
  copyToClipboard: (target?: "uri" | "albedo" | "lobstr") => Promise<boolean>
}
```

## Related

- [usePayment](/hooks/use-payment) - Submit payments directly through connected wallets
- [usePathPayment](/hooks/use-path-payment) - Cross-asset path payments
