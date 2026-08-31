# useStellarToml

Fetch and parse stellar.toml files.

## Import

```tsx
import { useStellarToml } from 'stellar-hooks'
```

## Usage

```tsx
const { data, federationServer, signingKey, currencies, isLoading } = useStellarToml("stellar.org")
```

## Related

- [useAssetMetadata](/hooks/use-asset-metadata) - Asset metadata from stellar.toml