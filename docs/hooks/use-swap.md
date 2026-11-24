# Swap hooks

```tsx
const { slippageBps, setSlippageBps } = useSlippageTolerance()
const { quote, isHighImpact, isStale } = useSwapQuote({ routerId, tokenIn, tokenOut, amountIn })
const { swap, minAmountOut } = useSwap({ routerId })

await swap({ tokenIn, tokenOut, amountIn, quote })
```

- `useSwapQuote` calls `get_quote(token_in, token_out, amount_in)` on the router
  and refreshes before the quote goes stale. The quote includes `route` and
  `priceImpactBps`; `isHighImpact` flags quotes above `highImpactBps` (default 3%).
- `useSwap` calls `swap(from, token_in, token_out, amount_in, min_out)` where
  `min_out = amountOut * (10000 - slippageBps) / 10000`.
- `useSlippageTolerance` is the single, validated (1–5000 bps) setting every swap
  hook defaults to. It is persisted to `localStorage` when available.

The router method names and return shape are assumptions; override `method` and
`parseQuote` for your router.
