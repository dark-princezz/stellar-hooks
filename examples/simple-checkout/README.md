# Simple Checkout Example for a Small Shop

An example shop checkout application demonstrating a cart, Stellar payment link generation, and real-time memo-based order reconciliation using `stellar-hooks` and `useInvoice`.

## Features

- 🛒 **Cart Management**: Add products, adjust quantities, calculate total amount in XLM
- 💳 **Shareable Payment Link**: Generates SEP-0007 URIs (`web+stellar:pay?destination=...&amount=...&memo=...`) for opening in wallets (Freighter, Lobstr, Albedo)
- 📡 **Real-time Order Status**: Uses `useInvoice` to watch Horizon for incoming transactions carrying the order memo, updating status between Pending, Partial, and Paid.

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5174](http://localhost:5174) in your browser.
