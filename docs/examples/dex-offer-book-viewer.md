# DEX Offer Book Viewer

Visualizing live bids and asks for Stellar asset pairs using Horizon's order book endpoint.

## Overview

The DEX Offer Book Viewer demonstrates how to use the `useOrderBook` hook to build a responsive, real-time crypto order book display with depth visualization, spread metrics, and auto-refresh intervals.

## Core Hook: `useOrderBook`

```tsx
import { useOrderBook } from 'stellar-hooks'
import { Asset } from '@stellar/stellar-sdk'

function OrderBookWidget() {
  const { bids, asks, isLoading, error, lastFetchedAt, refetch } = useOrderBook(
    Asset.native(),
    new Asset("USDC", "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"),
    {
      limit: 20,
      refetchInterval: 5000,
      enabled: true,
    }
  );

  if (isLoading) return <div>Loading order book...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const bestBid = bids[0]?.price ?? "—";
  const bestAsk = asks[0]?.price ?? "—";

  return (
    <div>
      <h3>XLM / USDC Order Book</h3>
      <p>Best Bid: {bestBid}</p>
      <p>Best Ask: {bestAsk}</p>
      <ul>
        {bids.map((bid, i) => (
          <li key={i}>{bid.price} — {bid.amount} XLM</li>
        ))}
      </ul>
    </div>
  );
}
```

## Running all Examples

```bash
cd examples/dex-offer-book-viewer
npm install
npm run dev
```

See the source code in [`examples/dex-offer-book-viewer`](https://github.com/dark-princezz/stellar-hooks/tree/main/examples/dex-offer-book-viewer).
