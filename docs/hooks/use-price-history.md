# usePriceHistory

Fetch Horizon trade aggregations as OHLC candles for an asset pair.

## Usage

```tsx check
import { Asset } from "@stellar/stellar-sdk";
import { usePriceHistory } from "stellar-hooks";

const base = Asset.native();
const counter = new Asset(
  "USDC",
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
);

export function PriceChart() {
  const { candles, isLoading, refetch } = usePriceHistory({
    baseAsset: base,
    counterAsset: counter,
    resolution: 3_600_000,
    limit: 100,
  });

  if (isLoading) return <p>Loading candles…</p>;

  return (
    <div>
      <button onClick={() => void refetch()}>Refresh</button>
      <ol>
        {candles.map((candle) => (
          <li key={candle.timestamp}>
            {new Date(candle.timestamp).toLocaleString()}: {candle.close.toFixed(4)}
          </li>
        ))}
      </ol>
    </div>
  );
}
```

Supported resolutions are 1 minute, 5 minutes, 15 minutes, 1 hour, 1 day, and 1 week, expressed in milliseconds.

## Related

- [useTradeHistory](/hooks/use-trade-history) - individual trades
- [useOrderBook](/hooks/use-order-book) - current DEX depth
