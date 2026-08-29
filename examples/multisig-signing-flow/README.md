# 🔐 Stellar Multisig Transaction Signing Flow

A comprehensive example demonstrating how to build and sign multisig Stellar transactions with multiple signers before submission.

## Quick Start

Click the buttons below to open this example in your browser:

| StackBlitz | CodeSandbox | Description |
| --- | --- | --- |
| [![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/dark-princezz/stellar-hooks/tree/main/examples/multisig-signing-flow) | [![Open in CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/github/dark-princezz/stellar-hooks/tree/main/examples/multisig-signing-flow) | Open Multisig Signing Flow |

## Features

This example demonstrates:

- ✅ **Configure multiple signers** with weights and types
- ✅ **Build a transaction** with payment operations
- ✅ **Sign the transaction** multiple times (simulating different signers)
- ✅ **Track signature weight** against account thresholds
- ✅ **Submit only when threshold is met**

## How It Works

### 1. Configure Signers

The example allows you to configure up to 3 signers with their addresses:

- **Signer A** - Primary signer (initial builder)
- **Signer B** - Additional signer
- **Signer C** - Additional signer

Each signer has a weight of 1.

### 2. Build Transaction

Click "Build Transaction" to create the unsigned transaction with:
- Payment operation
- Memo
- Source account

The transaction XDR is displayed for transparency.

### 3. Collect Signatures

Click "Sign Transaction" multiple times to simulate multiple signers:

- Each sign adds a signature
- Track the signature weight
- See which signers have signed

### 4. Submit When Threshold is Met

The transaction can only be submitted when:
- `signatureWeight >= medium_threshold`
- All required signatures are collected

## Threshold Configuration

In Stellar multisig accounts:

- **Low threshold**: Operations with low security requirements
- **Medium threshold**: Payment operations (default: 1)
- **High threshold**: Transaction management operations

This example uses the **medium threshold** for payment validation.

## Use Cases

This pattern is useful for:

- **Corporate treasuries** - Multiple approvals for payments
- **DAO treasuries** - Community voting on fund usage
- **Custodial accounts** - Multi-party control
- **Escrow accounts** - Third-party approval needed

## Requirements

- **Freighter wallet** - Install the [Freighter](https://freighter.app) browser extension

## Development

To run this locally:

```bash
# Clone the repository
git clone https://github.com/dark-princezz/stellar-hooks.git
cd stellar-hooks/examples/multisig-signing-flow

# Install dependencies
npm install

# Start development server
npm run dev
```

## API Reference

This example uses the `useMultiSig` hook which provides:

| Property | Type | Description |
|----------|------|-------------|
| `build` | `(ops: Operation[], opts?: BuildOptions) => Promise<string>` | Build unsigned transaction |
| `sign` | `(xdr?: string) => Promise<string>` | Sign the transaction |
| `submit` | `(signedXdr: string) => Promise<void>` | Submit the transaction |
| `unsignedXdr` | `string \| null` | The unsigned transaction XDR |
| `signatureCount` | `number` | Number of signatures on the transaction |
| `signers` | `SignerEntry[]` | Array of signer entries from account |
| `thresholds` | `Thresholds \| null` | Account thresholds (low, medium, high) |
| `meetsThreshold` | `boolean` | Whether signature weight meets medium threshold |
| `signatureWeight` | `number` | Total weight of all signatures |
| `signedBy` | `string[]` | Public keys that have signed |

## Next Steps

- 📖 [Documentation](https://stellar-hooks.vercel.app)
- 📝 [GitHub Repository](https://github.com/dark-princezz/stellar-hooks)
- 💬 [Discord Community](https://discord.gg/stellar)

## License

MIT License - see [LICENSE](../../LICENSE) for details.
