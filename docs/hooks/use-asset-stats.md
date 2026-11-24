# useAssetStats

Read aggregate supply, holder, and trading activity for an issued asset.

## Usage

```tsx check
import { useAssetStats } from "stellar-hooks";

const issuer = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

export function AssetOverview() {
  const { stats, isLoading, error, refetch } = useAssetStats({
    assetCode: "USDC",
    assetIssuer: issuer,
  });

  if (isLoading) return <p>Loading asset stats…</p>;
  if (error) return <p>{error.message}</p>;
  if (!stats) return <p>Asset not found.</p>;

  return (
    <div>
      <p>Supply: {stats.totalSupply}</p>
      <p>Holders: {stats.holders}</p>
      <p>Recent trades: {stats.tradeCount ?? "unknown"}</p>
      <button onClick={() => void refetch()}>Refresh</button>
    </div>
  );
}
```

`tradeCount` is `null` when the Horizon server does not report it. `recentTradePrice` is `null` when no recent trade exists.

## Related

- [useAssets](/hooks/use-assets) - list assets
- [useAssetBalance](/hooks/use-asset-balance) - per-account balance
