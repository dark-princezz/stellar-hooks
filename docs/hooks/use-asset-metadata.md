# useAssetMetadata

Fetch asset metadata from issuer's stellar.toml file.

## Import

```tsx
import { useAssetMetadata } from 'stellar-hooks'
```

## Usage

```tsx
const { metadata, isLoading } = useAssetMetadata("USDC", "GA5Z...")
```

## Related

- [useStellarToml](/hooks/use-stellar-toml) - stellar.toml parsing