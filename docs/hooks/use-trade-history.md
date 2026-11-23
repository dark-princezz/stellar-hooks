# useTradeHistory

Fetch recent DEX trades for an asset pair as a paginated, chart-friendly list.

## Import

```tsx check
import { Asset } from "@stellar/stellar-sdk";
import { useTradeHistory } from "stellar-hooks";
```

## Usage

```tsx check
import { Asset } from "@stellar/stellar-sdk";
import { useTradeHistory } from "stellar-hooks";

const base = Asset.native();
const counter = new Asset(
  "USDC",
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
);

export function RecentTrades() {
  const { trades, isLoading, nextCursor, setCursor } = useTradeHistory({
    baseAsset: base,
    counterAsset: counter,
    limit: 20,
    order: "desc",
  });

  if (isLoading) return <p>Loading trades…</p>;

  return (
    <div>
      <ul>
        {trades.map((trade) => (
          <li key={trade.id}>
            {trade.baseAssetCode}/{trade.counterAssetCode} @ {trade.price.toFixed(4)}
          </li>
        ))}
      </ul>
      <button disabled={!nextCursor} onClick={() => setCursor(nextCursor ?? undefined)}>
        Next page
      </button>
    </div>
  );
}
```

## Related

- [useTrade](/hooks/use-trade) - place and cancel DEX offers
- [usePriceHistory](/hooks/use-price-history) - aggregated candle data
