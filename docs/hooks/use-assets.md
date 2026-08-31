# useAssets

Search and list Stellar assets.

## Import

```tsx
import { useAssets } from 'stellar-hooks'
```

## Usage

```tsx
const { assets, isLoading } = useAssets({
  assetCode: "USDC",
  limit: 10,
})
```

## Related

- [useAssetMetadata](/hooks/use-asset-metadata) - Asset metadata