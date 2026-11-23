# useOrderBook

Returns bids and asks for a Stellar DEX asset pair and updates as the book changes.

## Usage

```tsx
import { useOrderBook } from 'stellar-hooks';
import { Asset } from '@stellar/stellar-sdk';

const { bids, asks, isLoading, error, refetch } = useOrderBook(
  Asset.native(),
  new Asset('USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'),
  { limit: 20, refetchInterval: 5000 }
);
```

## Options

- `limit` - max price levels per side (default: 20)
- `refetchInterval` - polling interval in ms, 0 disables polling (default: 0)
- `enabled` - whether fetching is enabled (default: true)

## Returns

- `bids`, `asks` - order book levels
- `raw` - full Horizon response
- `isLoading`, `error`, `lastFetchedAt`, `refetch`
