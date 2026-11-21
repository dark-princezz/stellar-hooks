# stellar-hooks Next.js App Router Starter

Starter template demonstrating how to use `stellar-hooks` in Next.js 15+ App Router, with React hooks properly isolated to client components (`"use client"`).

## Architecture

- **`src/app/layout.tsx`**: Root server layout.
- **`src/app/providers.tsx`**: Client component wrapping children in `<StellarProvider network="testnet">`.
- **`src/app/page.tsx`**: Server component page embedding client component boundaries.
- **`src/components/WalletConnect.tsx`**: Client component using `useFreighter`.
- **`src/components/BalanceCard.tsx`**: Client component using `useStellarBalance`.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.
