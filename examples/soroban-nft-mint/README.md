# Soroban NFT Mint Example

A complete Vite + React example demonstrating how to mint NFTs on the Stellar
Soroban smart-contract platform using the **stellar-hooks** library.

## What this example covers

| Feature | Details |
|---|---|
| Wallet connection | Freighter browser extension via `useFreighter` |
| Full mint flow | simulate → sign → submit → poll via `useSorobanContract` |
| Lifecycle status display | Each stage is shown in the UI with a live status badge |
| Balance query | Read-only `balance(owner)` call after minting |
| Error handling | User-facing error messages for every failure path |

The complete mint flow follows this sequence:

```
idle → simulating → signing (Freighter prompt) → submitting → polling → success / error
```

## Assumed NFT contract ABI

The example targets any Soroban contract that exposes these two functions,
consistent with the SEP-0056 / Soroban token interface extended with an NFT
`mint` entry-point:

```rust
// Mint one NFT to a recipient
fn mint(env: Env, to: Address, token_id: u64);

// Return the number of NFTs held by an owner
fn balance(env: Env, owner: Address) -> u64;
```

Arguments are encoded with `@stellar/stellar-sdk`:

- `to` / `owner` — `xdr.ScVal.scvAddress(...)` from an `Address` object
- `token_id` — `xdr.ScVal.scvU64(new xdr.Uint64(value))`

## Prerequisites

- Node.js ≥ 18
- [Freighter wallet](https://freighter.app) browser extension installed and
  set to **Testnet**
- A deployed Soroban NFT contract on Testnet that matches the ABI above

## Deploying a test NFT contract

If you don't have a contract yet, you can deploy the sample Rust contract
included in the Soroban examples repository:

```bash
# 1. Install Stellar CLI
cargo install --locked stellar-cli --features opt

# 2. Generate a testnet keypair and fund it
stellar keys generate --global alice --network testnet
stellar keys fund alice --network testnet

# 3. Clone and build the soroban-examples repo
git clone https://github.com/stellar/soroban-examples
cd soroban-examples/token

# 4. Build
stellar contract build

# 5. Deploy (note the returned contract ID)
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/soroban_token_contract.wasm \
  --source alice \
  --network testnet
```

Copy the **contract ID** (starts with `C`) that the deploy command prints —
you'll paste it into the app's "NFT Contract ID" field.

> **Tip:** You can also use [Stellar Laboratory](https://laboratory.stellar.org)
> to deploy and inspect contracts interactively.

## Running the example

```bash
# From the repo root
cd examples/soroban-nft-mint

npm install
npm run dev
```

Open your browser at `http://localhost:5173`.

## Using the app

1. **Connect Wallet** — click *Connect Freighter* and approve in the extension.
2. **Contract ID** — paste the `C…` contract ID you deployed above.
3. **Mint NFT**
   - Enter the recipient Stellar address (`G…`).
   - Enter a unique Token ID (integer).
   - Click **Mint NFT**.
   - Watch the status badge advance through each lifecycle stage.
   - On success the transaction hash is displayed with a link to Stellar Expert.
4. **Query Balance** — enter any `G…` address and click **Query Balance** to
   see how many NFTs they hold (read-only, no transaction required).

## Project structure

```
soroban-nft-mint/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx       # ReactDOM.createRoot + StellarProvider wrapper
    ├── App.tsx        # Full NFT mint UI
    └── index.css      # Styles
```

## Key hooks used

### `useFreighter`

```tsx
const { isConnected, publicKey, connect, disconnect, isInstalled } = useFreighter();
```

Manages wallet connection state. The component renders wallet-install and
wallet-connect gates before showing the main UI.

### `useSorobanContract` — mint (write)

```tsx
const mintContract = useSorobanContract<void>({
  contractId,
  method: "mint",
  args: [addressToScVal(recipient), u64ToScVal(BigInt(tokenId))],
  parseResult: () => undefined,
});

await mintContract.call(); // simulate → sign → submit → poll
```

### `useSorobanContract` — balance (read)

```tsx
const balanceContract = useSorobanContract<bigint>({
  contractId,
  method: "balance",
  args: [addressToScVal(owner)],
  parseResult: (scVal) => BigInt(scVal.u64().toString()),
});

await balanceContract.query(); // simulate only, no signature required
```

## Error handling

All errors surface through the hook's `.error` property and are displayed in
the UI as red alert boxes. The `try/catch` around `call()` / `query()` also
logs the full error to the browser console for debugging.

Common failure reasons:

| Error | Likely cause |
|---|---|
| `HostError: Error(Contract, ...)` | Token ID already minted or unauthorised caller |
| `Simulation failed` | Contract ID is wrong or contract not deployed |
| `User declined` | User rejected the Freighter signature prompt |
| `Account not found` | Recipient address not activated on testnet |

## Related resources

- [Stellar Hooks documentation](https://github.com/dark-princezz/stellar-hooks)
- [Soroban documentation](https://soroban.stellar.org)
- [Freighter wallet](https://freighter.app)
- [Stellar Laboratory](https://laboratory.stellar.org)
- [Stellar Expert (testnet explorer)](https://stellar.expert/explorer/testnet)
