# 🌊 Stellar Hooks - Try Online Sandbox

A minimal, ready-to-run sandbox for experimenting with Stellar Hooks without local setup.

## Quick Start

Click the button below to open this sandbox in your browser:

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/dark-princezz/stellar-hooks/tree/main/examples/try-online)

[![Open in CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/github/dark-princezz/stellar-hooks/tree/main/examples/try-online)

## Features

This sandbox includes working examples of:

- ✅ **Wallet Connection** - Connect Freighter wallet
- ✅ **Account Viewer** - Display account details and balances
- ✅ **Balance Viewer** - Show XLM and token balances
- ✅ **Simple Payment** - Send XLM to another address
- ✅ **Path Payment (Swap)** - Multi-hop asset swaps with slippage

## Available Hooks

Try these hooks in the sandbox:

| Hook | Purpose |
|------|---------|
| `useFreighter` | Connect and sign with Freighter wallet |
| `useAlbedo` | Connect Albedo web wallet |
| `useWallet` | Unified multi-wallet interface |
| `usePayment` | Send payments |
| `usePathPayment` | Multi-hop asset swaps |
| `useStellarAccount` | Fetch account details |
| `useStellarBalance` | Get balances |
| `useTransaction` | Build and submit transactions |

## Usage

1. Click "Open in StackBlitz" or "Open in CodeSandbox"
2. The sandbox opens with a live preview
3. Click the toggle buttons to try different examples
4. Click "Fork" to save a copy to your own account
5. Modify the code and see changes in real-time

## Requirements

- **For wallet examples**: Install [Freighter](https://freighter.app) browser extension
- **For web-based wallets**: Use [Albedo](https://www.albedo.link/) for testnet

## Development

To run this locally:

```bash
# Clone the repository
git clone https://github.com/dark-princezz/stellar-hooks.git
cd stellar-hooks/examples/try-online

# Install dependencies
npm install

# Start development server
npm run dev
```

## Related Examples

For more advanced examples, check out:

- **[Multisig Signing Flow](../multisig-signing-flow/)** - Collect multiple signatures for a transaction before submission
- **[Path Payment Swap](../path-payment-swap/)** - Asset swapping with slippage tolerance
- **[Soroban Dashboard](../soroban-dashboard/)** - Soroban contract interactions

## Next Steps

- 📖 [Documentation](https://stellar-hooks.vercel.app)
- 📝 [GitHub Repository](https://github.com/dark-princezz/stellar-hooks)
- 💬 [Discord Community](https://discord.gg/stellar)

## License

MIT License - see [LICENSE](../../LICENSE) for details.
