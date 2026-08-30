# Migration Guide: Raw stellar-sdk → stellar-hooks

This guide shows how to replace boilerplate `@stellar/stellar-sdk` and `@stellar/freighter-api` code with the equivalent `stellar-hooks` hook. Every before/after pair maps a common pattern you'd write by hand to the hook that replaces it.

---

## Table of Contents

1. [Installation](#1-installation)
2. [Provider setup](#2-provider-setup)
3. [Wallet connection (Freighter)](#3-wallet-connection-freighter)
4. [Fetching an account](#4-fetching-an-account)
5. [Reading balances](#5-reading-balances)
6. [Sending a payment](#6-sending-a-payment)
7. [Path payments](#7-path-payments)
8. [Soroban contract calls](#8-soroban-contract-calls)
9. [Reading a ledger entry](#9-reading-a-ledger-entry)
10. [Submitting pre-signed XDR](#10-submitting-pre-signed-xdr)
11. [Fetching open offers](#11-fetching-open-offers)
12. [Fetching the order book](#12-fetching-the-order-book)
13. [DEX trades](#13-dex-trades)
14. [Claimable balances](#14-claimable-balances)
15. [Contract events](#15-contract-events)
16. [stellar.toml and asset metadata](#16-stellartoml-and-asset-metadata)
17. [Custom / private networks](#17-custom--private-networks)
18. [React Query and SWR adapters](#18-react-query-and-swr-adapters)
19. [TypeScript types reference](#19-typescript-types-reference)
20. [Common pitfalls & best practices](#20-common-pitfalls--best-practices)

---

## 1. Installation

Remove the packages you were managing manually and install `stellar-hooks`. The SDK and Freighter API are bundled as direct dependencies — you no longer need to install them separately.

```bash
# Before — you managed these yourself
npm install @stellar/stellar-sdk @stellar/freighter-api

# After — one package covers everything
npm install stellar-hooks
```

> If you need a specific version of `@stellar/stellar-sdk` that differs from the bundled one, you can still install it alongside `stellar-hooks`. The hooks resolve it from the provider context so there is no conflict.

---

## 2. Provider setup

`stellar-hooks` reads network configuration from a React context. Wrap your app (or the relevant subtree) once and every hook inside picks up the correct Horizon URL, Soroban RPC URL, and network passphrase automatically.

**Before** — you created a `Horizon.Server` and `rpc.Server` everywhere:

```tsx
// Scattered across your components
import { Horizon, rpc } from "@stellar/stellar-sdk";

const horizonServer = new Horizon.Server("https://horizon-testnet.stellar.org");
const rpcServer = new rpc.Server("https://soroban-testnet.stellar.org");
const PASSPHRASE = "Test SDF Network ; September 2015";
```

**After** — declare the network once at the root:

```tsx
// main.tsx
import { StellarProvider } from "stellar-hooks";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StellarProvider network="testnet">
    <App />
  </StellarProvider>
);
```

Built-in presets: `"testnet"` (default), `"mainnet"`, `"futurenet"`.

---

## 3. Wallet connection (Freighter)

**Before** — you called Freighter APIs directly and managed state yourself:

```tsx
import {
  isConnected,
  getPublicKey,
  getNetworkDetails,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";

function WalletButton() {
  const [publicKey, setPublicKey] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    async function probe() {
      const connected = await isConnected();
      if (connected) {
        const pk = await getPublicKey();
        setPublicKey(pk);
      }
    }
    probe();
  }, []);

  async function connect() {
    setLoading(true);
    try {
      const pk = await requestAccess();
      setPublicKey(pk);
    } finally {
      setLoading(false);
    }
  }

  if (!publicKey) return <button onClick={connect} disabled={loading}>Connect</button>;
  return <p>{publicKey}</p>;
}
```

**After** — one hook, zero boilerplate:

```tsx
import { useFreighter } from "stellar-hooks";

function WalletButton() {
  const { isInstalled, isConnected, publicKey, isLoading, connect, disconnect } =
    useFreighter();

  if (!isInstalled) return <p>Install Freighter first.</p>;
  if (!isConnected)
    return <button onClick={connect} disabled={isLoading}>Connect</button>;
  return (
    <div>
      <p>{publicKey}</p>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}
```

The hook also handles:
- Reactive wallet changes (account and network switches via `WatchWalletChanges`)
- Session persistence across page reloads (via `localStorage`)
- `signTransaction`, `signAuthEntry`, and `signBlob` methods ready to use

```tsx
const { signTransaction, signAuthEntry, signBlob } = useFreighter();

// Sign a transaction XDR
const signedXdr = await signTransaction(builtXdr, { networkPassphrase });

// Sign a Soroban auth entry
const signedEntry = await signAuthEntry(entryPreimageXdr);

// Sign arbitrary data (e.g. login proof)
const signature = await signBlob(base64Payload);
```

---

## 4. Fetching an account

**Before** — you created a server, loaded the account, and managed loading/error state yourself:

```tsx
import { Horizon } from "@stellar/stellar-sdk";

function AccountInfo({ publicKey }: { publicKey: string }) {
  const [account, setAccount] = React.useState<Horizon.AccountResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const server = new Horizon.Server("https://horizon-testnet.stellar.org");
    setIsLoading(true);
    server
      .loadAccount(publicKey)
      .then(setAccount)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [publicKey]);

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>{error.message}</p>;
  return <p>Sequence: {account?.sequence}</p>;
}
```

**After**:

```tsx
import { useStellarAccount } from "stellar-hooks";

function AccountInfo({ publicKey }: { publicKey: string }) {
  const { data, isLoading, error } = useStellarAccount(publicKey);

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>{error.message}</p>;
  return <p>Sequence: {data?.sequence}</p>;
}
```

**Optional polling** — set `refetchInterval` to poll automatically:

```tsx
// Re-fetch every 5 seconds
const { data } = useStellarAccount(publicKey, { refetchInterval: 5000 });

// Disable until a condition is met
const { data } = useStellarAccount(publicKey, { enabled: !!publicKey });
```

The returned `data` is a typed `StellarAccountData` object — no need to write your own mapping code:

```ts
data.accountId        // G... address
data.balances         // StellarBalance[]
data.sequence         // string
data.subentryCount    // number
data.numSponsored     // number
data.numSponsoring    // number
data.thresholds       // { lowThreshold, medThreshold, highThreshold }
data.flags            // { authRequired, authRevocable, authImmutable, authClawbackEnabled }
data.raw              // original Horizon.AccountResponse for anything not mapped above
```

---

## 5. Reading balances

**Before** — filter `account.balances` yourself:

```tsx
import { Horizon } from "@stellar/stellar-sdk";

async function getXlmBalance(publicKey: string): Promise<string | null> {
  const server = new Horizon.Server("https://horizon-testnet.stellar.org");
  const account = await server.loadAccount(publicKey);
  const xlm = account.balances.find((b) => b.asset_type === "native");
  return xlm?.balance ?? null;
}

// In a component you'd also wire up useState/useEffect/error handling...
```

**After**:

```tsx
import { useStellarBalance } from "stellar-hooks";

function Balances({ publicKey }: { publicKey: string }) {
  const { xlmBalance, balances, isLoading, error, refetch } =
    useStellarBalance(publicKey);

  if (isLoading) return <p>Loading…</p>;

  return (
    <section>
      <p>XLM: {xlmBalance?.balance ?? "–"}</p>
      <ul>
        {balances
          .filter((b) => !b.isNative)
          .map((b) => (
            <li key={`${b.assetCode}:${b.assetIssuer}`}>
              {b.assetCode} — {b.balance}
            </li>
          ))}
      </ul>
      <button onClick={refetch}>Refresh</button>
    </section>
  );
}
```

Each `StellarBalance` entry includes a pre-parsed `balanceFloat` for math operations so you don't need to call `parseFloat(b.balance)` yourself.

---

## 6. Sending a payment

**Before** — build, sign, and submit manually:

```tsx
import { Asset, Horizon, Memo, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

async function sendPayment(publicKey: string) {
  const server = new Horizon.Server("https://horizon-testnet.stellar.org");
  const PASSPHRASE = "Test SDF Network ; September 2015";

  const sourceAccount = await server.loadAccount(publicKey);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: "100",
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: "GBXXX...",
        asset: Asset.native(),
        amount: "10",
      })
    )
    .addMemo(Memo.text("Thanks!"))
    .setTimeout(60)
    .build();

  const signedXdr = await signTransaction(tx.toXDR(), {
    networkPassphrase: PASSPHRASE,
  });

  const signedTx = TransactionBuilder.fromXDR(signedXdr, PASSPHRASE);
  const result = await server.submitTransaction(signedTx);
  console.log(result.hash);
}
```

**After**:

```tsx
import { usePayment } from "stellar-hooks";

function SendButton() {
  const { submit, status, hash, error, isLoading, reset } = usePayment({
    destination: "GBXXX...",
    asset: { type: "native" },
    amount: "10",
    memo: "Thanks!",
  });

  return (
    <div>
      <button onClick={submit} disabled={isLoading}>Send XLM</button>
      {status === "success" && <p>Sent! Hash: {hash}</p>}
      {error && <p>{error.message} <button onClick={reset}>Retry</button></p>}
    </div>
  );
}
```

For non-native assets, use `{ type: "credit", code: "USDC", issuer: "GISSUER..." }`.

The `status` field tracks the full lifecycle: `"idle"` → `"submitting"` → `"polling"` → `"success"` (or `"error"`).

---

## 7. Path payments

**Before** — choose between `pathPaymentStrictSend` and `pathPaymentStrictReceive`, build the operation, sign, and submit:

```tsx
import { Asset, Horizon, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

async function strictSend(publicKey: string) {
  const server = new Horizon.Server("https://horizon-testnet.stellar.org");
  const PASSPHRASE = "Test SDF Network ; September 2015";
  const account = await server.loadAccount(publicKey);

  const tx = new TransactionBuilder(account, { fee: "100", networkPassphrase: PASSPHRASE })
    .addOperation(
      Operation.pathPaymentStrictSend({
        sendAsset: Asset.native(),
        sendAmount: "10",
        destination: "GBXXX...",
        destAsset: new Asset("USDC", "GISSUER..."),
        destMin: "9",
        path: [],
      })
    )
    .setTimeout(60)
    .build();

  const signed = await signTransaction(tx.toXDR(), { networkPassphrase: PASSPHRASE });
  const result = await server.submitTransaction(
    TransactionBuilder.fromXDR(signed, PASSPHRASE) as any
  );
  console.log(result.hash);
}
```

**After**:

```tsx
import { usePathPayment } from "stellar-hooks";

// Strict send — send exactly 10 XLM, receive at least 9 USDC
const { submit, status, hash, error } = usePathPayment({
  mode: "strict-send",
  sendAsset: { type: "native" },
  sendAmount: "10",
  destination: "GBXXX...",
  destAsset: { type: "credit", code: "USDC", issuer: "GISSUER..." },
  destMin: "9",
});

// Strict receive — receive exactly 10 USDC, send at most 11 XLM
const { submit } = usePathPayment({
  mode: "strict-receive",
  sendAsset: { type: "native" },
  sendAmount: "11",
  destination: "GBXXX...",
  destAsset: { type: "credit", code: "USDC", issuer: "GISSUER..." },
  destMin: "10",
});
```

Leave `path` empty (the default) and Horizon will auto-select the best path.

---

## 8. Soroban contract calls

This is where `stellar-hooks` saves the most code. A raw Soroban call requires simulation, auth assembly, signing, submission, and polling — roughly 60–80 lines even with the SDK helpers.

**Before**:

```tsx
import {
  Contract, rpc, Transaction, TransactionBuilder,
  Networks, BASE_FEE, nativeToScVal, scValToNative,
} from "@stellar/stellar-sdk";
import { getPublicKey, signTransaction } from "@stellar/freighter-api";

async function callIncrement() {
  const PASSPHRASE = Networks.TESTNET;
  const server = new rpc.Server("https://soroban-testnet.stellar.org");
  const contract = new Contract("CABC...XYZ");
  const publicKey = await getPublicKey();

  const account = await server.getAccount(publicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(contract.call("increment", nativeToScVal(1, { type: "u32" })))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResult)) throw new Error(simResult.error);

  const preparedTx = rpc.assembleTransaction(tx, simResult).build();

  const signedXdr = await signTransaction(preparedTx.toXDR(), {
    networkPassphrase: PASSPHRASE,
  });

  const signedTx = TransactionBuilder.fromXDR(signedXdr, PASSPHRASE) as Transaction;
  const sendResult = await server.sendTransaction(signedTx);
  if (sendResult.status === "ERROR") throw new Error("Submission failed");

  // Poll until confirmed
  let getResult;
  do {
    await new Promise((r) => setTimeout(r, 1000));
    getResult = await server.getTransaction(sendResult.hash);
  } while (getResult.status === rpc.Api.GetTransactionStatus.NOT_FOUND);

  if (getResult.status === rpc.Api.GetTransactionStatus.FAILED)
    throw new Error("Transaction failed");

  const returnValue = scValToNative(
    getResult.resultMetaXdr.v3().sorobanMeta()!.returnValue()
  );
  console.log("Result:", returnValue);
}
```

**After**:

```tsx
import { useSorobanContract } from "stellar-hooks";
import { nativeToScVal, scValToNative } from "@stellar/stellar-sdk";

function IncrementButton() {
  const { call, status, result, hash, error, isLoading, reset } =
    useSorobanContract({
      contractId: "CABC...XYZ",
      method: "increment",
      args: [nativeToScVal(1, { type: "u32" })],
    });

  const parsed = result ? scValToNative(result as any) : null;

  return (
    <div>
      <p>Status: {status}</p>
      {parsed != null && <p>Return value: {String(parsed)}</p>}
      {hash && <p>Hash: {hash}</p>}
      {error && <p>{error.message}</p>}
      <button onClick={() => call()} disabled={isLoading}>Increment</button>
      {status !== "idle" && <button onClick={reset}>Reset</button>}
    </div>
  );
}
```

**Status progression:** `"idle"` → `"building"` → `"signing"` → `"submitting"` → `"polling"` → `"success"` (or `"error"`)

Use `simulate()` to do a dry-run without signing or submitting:

```tsx
const { simulate } = useSorobanContract({ contractId, method, args });
const simResponse = await simulate();
console.log(simResponse.cost); // resource usage and fee estimates
```

---

## 9. Reading a ledger entry

**Before** — construct the key, call `getLedgerEntries`, decode the result:

```tsx
import { rpc, xdr, Address, scValToNative } from "@stellar/stellar-sdk";

async function readCounter(contractId: string) {
  const server = new rpc.Server("https://soroban-testnet.stellar.org");

  const key = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: new Address(contractId).toScAddress(),
      key: xdr.ScVal.scvSymbol("Counter"),
      durability: xdr.ContractDataDurability.persistent(),
    })
  );

  const result = await server.getLedgerEntries(key);
  if (result.entries.length === 0) return null;

  const entry = result.entries[0];
  return scValToNative(entry.val.contractData().val());
}
```

**After**:

```tsx
import { useLedgerEntry } from "stellar-hooks";
import { xdr, Address, scValToNative } from "@stellar/stellar-sdk";

const CONTRACT_ID = "CABC...XYZ";

const key = xdr.LedgerKey.contractData(
  new xdr.LedgerKeyContractData({
    contract: new Address(CONTRACT_ID).toScAddress(),
    key: xdr.ScVal.scvSymbol("Counter"),
    durability: xdr.ContractDataDurability.persistent(),
  })
);

function CounterDisplay() {
  const { data, isLoading, error, refetch } = useLedgerEntry(key, {
    refetchInterval: 3000, // poll every 3 s
  });

  const value = data ? scValToNative(data.val.contractData().val()) : null;

  if (isLoading) return <p>Loading…</p>;
  return (
    <div>
      <p>Counter: {value ?? "–"}</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

Pass `enabled: false` to skip the initial fetch and trigger it manually with `refetch()`.

---

## 10. Submitting pre-signed XDR

Sometimes you sign a transaction outside React (hardware wallet, server-side co-signer, etc.) and just need to submit and poll from the UI.

**Before**:

```tsx
import { rpc, TransactionBuilder } from "@stellar/stellar-sdk";

async function submitSigned(signedXdr: string) {
  const PASSPHRASE = "Test SDF Network ; September 2015";
  const server = new rpc.Server("https://soroban-testnet.stellar.org");
  const tx = TransactionBuilder.fromXDR(signedXdr, PASSPHRASE);

  const send = await server.sendTransaction(tx);
  if (send.status === "ERROR") throw new Error("Failed");

  // poll...
  let res;
  do {
    await new Promise((r) => setTimeout(r, 1000));
    res = await server.getTransaction(send.hash);
  } while (res.status === rpc.Api.GetTransactionStatus.NOT_FOUND);
}
```

**After**:

```tsx
import { useTransaction } from "stellar-hooks";

function SubmitPanel() {
  const { submit, status, hash, error } = useTransaction({ mode: "soroban" });

  async function handleSubmit(signedXdr: string) {
    await submit(signedXdr);
  }

  return (
    <div>
      <p>Status: {status}</p>
      {hash && <p>Hash: {hash}</p>}
      {error && <p>{error.message}</p>}
    </div>
  );
}
```

Use `mode: "classic"` for Horizon (non-Soroban) transactions. The hook handles exponential back-off polling internally.

---

## 11. Fetching open offers

**Before**:

```tsx
import { Horizon } from "@stellar/stellar-sdk";

async function getOffers(publicKey: string) {
  const server = new Horizon.Server("https://horizon-testnet.stellar.org");
  const response = await server.offers().forAccount(publicKey).call();
  return response.records;
}
```

**After**:

```tsx
import { useStellarOffers } from "stellar-hooks";

function OfferList({ publicKey }: { publicKey: string }) {
  const { offers, isLoading, error, refetch } = useStellarOffers(publicKey, {
    refetchInterval: 10_000,
  });

  if (isLoading) return <p>Loading…</p>;
  return (
    <ul>
      {offers.map((o) => (
        <li key={o.id}>{o.selling.asset_type} → {o.buying.asset_type} @ {o.price}</li>
      ))}
    </ul>
  );
}
```

---

## 12. Fetching the order book

**Before**:

```tsx
import { Asset, Horizon } from "@stellar/stellar-sdk";

async function getOrderbook() {
  const server = new Horizon.Server("https://horizon-testnet.stellar.org");
  const ob = await server
    .orderbook(Asset.native(), new Asset("USDC", "GISSUER..."))
    .limit(20)
    .call();
  return ob;
}
```

**After**:

```tsx
import { useOfferBook } from "stellar-hooks";
import { Asset } from "@stellar/stellar-sdk";

function Orderbook() {
  const { data, isLoading, error } = useOfferBook({
    selling: Asset.native(),
    buying: new Asset("USDC", "GISSUER..."),
    limit: 20,
    refetchInterval: 5000,
  });

  if (isLoading) return <p>Loading…</p>;
  return (
    <div>
      <h3>Bids</h3>
      <pre>{JSON.stringify(data?.bids, null, 2)}</pre>
      <h3>Asks</h3>
      <pre>{JSON.stringify(data?.asks, null, 2)}</pre>
    </div>
  );
}
```

> `useOfferBook` is available from `stellar-hooks` but not yet re-exported from the main index. Import it directly: `import { useOfferBook } from "stellar-hooks/src/hooks/useOfferBook"` until the next release adds it to the public surface.

---

## 13. DEX trades

**Before** — manually query Horizon's trades endpoint with filtering:

```tsx
import { Asset, Horizon } from "@stellar/stellar-sdk";

async function getTrades(publicKey: string) {
  const server = new Horizon.Server("https://horizon-testnet.stellar.org");
  const response = await server
    .trades()
    .forAccount(publicKey)
    .limit(20)
    .order("desc")
    .call();
  return response.records;
}

// With asset pair filtering
async function getFilteredTrades(publicKey: string) {
  const server = new Horizon.Server("https://horizon-testnet.stellar.org");
  const response = await server
    .trades()
    .forAccount(publicKey)
    .forAssetPair(Asset.native(), new Asset("USDC", "GISSUER..."))
    .limit(50)
    .call();
  return response.records;
}
```

**After**:

```tsx
import { useTrades } from "stellar-hooks";
import { Asset } from "@stellar/stellar-sdk";

function TradeHistory({ publicKey }: { publicKey: string }) {
  const { trades, isLoading, error, refetch } = useTrades(publicKey, {
    limit: 20,
    order: "desc",
    refetchInterval: 15_000, // poll every 15 seconds
  });

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>{error.message}</p>;

  return (
    <div>
      <ul>
        {trades.map((t) => (
          <li key={t.id}>
            {t.base_amount} {t.base_asset_code || "XLM"} → {t.counter_amount} {t.counter_asset_code || "XLM"}
          </li>
        ))}
      </ul>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}

// With asset pair filtering
function FilteredTrades({ publicKey }: { publicKey: string }) {
  const { trades } = useTrades(publicKey, {
    baseAsset: Asset.native(),
    counterAsset: new Asset("USDC", "GISSUER..."),
    limit: 50,
  });

  return (
    <ul>
      {trades.map((t) => (
        <li key={t.id}>
          XLM/USDC trade: {t.base_amount} XLM → {t.counter_amount} USDC
        </li>
      ))}
    </ul>
  );
}
```

Supports cursor-based pagination via the `cursor` option for infinite scroll patterns.

---

## 14. Claimable balances

Two separate hooks cover listing and claiming:

**Before**:

```tsx
import { Asset, Horizon, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

// List
const server = new Horizon.Server("https://horizon-testnet.stellar.org");
const res = await server.claimableBalances().claimant(publicKey).call();
const balances = res.records;

// Claim
const account = await server.loadAccount(publicKey);
const tx = new TransactionBuilder(account, { fee: "100", networkPassphrase: PASSPHRASE })
  .addOperation(Operation.claimClaimableBalance({ balanceId }))
  .setTimeout(60)
  .build();
const signed = await signTransaction(tx.toXDR(), { networkPassphrase: PASSPHRASE });
await server.submitTransaction(TransactionBuilder.fromXDR(signed, PASSPHRASE) as any);
```

**After**:

```tsx
import { useClaimableBalances, useClaimBalance } from "stellar-hooks";

function ClaimableList({ publicKey }: { publicKey: string }) {
  const { balances, isLoading, refetch } = useClaimableBalances(publicKey);
  const { claim, status, hash, error } = useClaimBalance({
    onSuccess: (h) => { console.log("Claimed!", h); refetch(); },
  });

  return (
    <ul>
      {balances.map((b) => (
        <li key={b.id}>
          {b.asset} — {b.amount}
          <button onClick={() => claim(b.id)} disabled={status !== "idle"}>
            Claim
          </button>
        </li>
      ))}
    </ul>
  );
}
```

> `useClaimableBalances` and `useClaimBalance` are exported from `@stellar-hooks/swr`. They are implemented in the core package but not yet on the main `stellar-hooks` index; add the swr package or import from the source path directly until the next release.

---

## 15. Contract events

**Before**:

```tsx
import { rpc } from "@stellar/stellar-sdk";

async function getEvents(contractId: string) {
  const server = new rpc.Server("https://soroban-testnet.stellar.org");
  const response = await server.getEvents({
    startLedger: 1000000,
    filters: [{ type: "contract", contractIds: [contractId] }],
    pagination: { limit: 100 },
  });
  return response.events;
}
```

**After**:

```tsx
import { useContractEvents } from "stellar-hooks";

function EventLog({ contractId }: { contractId: string }) {
  const { data: events, isLoading, error } = useContractEvents({
    contractId,
    startLedger: 1000000,
    refetchInterval: 3000, // stream new events every 3 s
  });

  if (isLoading) return <p>Loading…</p>;
  return (
    <ul>
      {events.map((e) => (
        <li key={e.id}>{e.type} — {e.pagingToken}</li>
      ))}
    </ul>
  );
}
```

Topic filtering:

```tsx
useContractEvents({
  contractId,
  topics: [["transfer"], ["GBXXX..."]],
  type: "contract",
  limit: 50,
});
```

---

## 16. stellar.toml and asset metadata

**Before**:

```tsx
import { StellarToml } from "@stellar/stellar-sdk";

async function getToml(domain: string) {
  const toml = await StellarToml.Resolver.resolve(domain);
  return toml;
}

// Finding asset metadata still required a second account fetch for home_domain,
// then a toml fetch, then a CURRENCIES filter — all wired together manually.
```

**After** — fetch toml for a domain:

```tsx
import { useStellarToml } from "stellar-hooks";

const { data, isLoading } = useStellarToml("stellar.org");
// data.CURRENCIES, data.DOCUMENTATION, data.VALIDATORS
```

**After** — resolve full asset metadata in one call:

```tsx
import { useAssetMetadata } from "stellar-hooks";

function AssetInfo({ code, issuer }: { code: string; issuer: string }) {
  const { metadata, isLoading } = useAssetMetadata(code, issuer);

  if (isLoading) return <p>Loading…</p>;
  return (
    <div>
      <img src={metadata?.image} alt={metadata?.name} />
      <p>{metadata?.name} — {metadata?.desc}</p>
    </div>
  );
}
```

`useAssetMetadata` composes `useStellarAccount` and `useStellarToml` internally: it loads the issuer account to get `home_domain`, fetches that domain's `stellar.toml`, then finds and returns the matching `CURRENCIES` entry.

---

## 17. Custom / private networks

**Before** — you passed URLs manually to every server instance:

```tsx
const HORIZON = "https://my-horizon.example.com";
const RPC = "https://my-rpc.example.com";
const PASSPHRASE = "My Network ; 2024";

// And then in every function...
const horizonServer = new Horizon.Server(HORIZON);
const rpcServer = new rpc.Server(RPC);
```

**After** — configure once on the provider, all hooks inherit it:

```tsx
<StellarProvider
  network="custom"
  customConfig={{
    network: "custom",
    horizonUrl: "https://my-horizon.example.com",
    sorobanRpcUrl: "https://my-rpc.example.com",
    networkPassphrase: "My Network ; 2024",
  }}
>
  <App />
</StellarProvider>
```

You can also export `NETWORK_CONFIGS` to read the built-in presets in non-React code:

```ts
import { NETWORK_CONFIGS } from "stellar-hooks";

const { horizonUrl, sorobanRpcUrl, networkPassphrase } = NETWORK_CONFIGS.mainnet;
```

---

## 18. React Query and SWR adapters

If your project already uses React Query or SWR you can swap the core hooks for adapter versions that plug into your existing cache layer.

### SWR adapter (`@stellar-hooks/swr`)

```bash
npm install @stellar-hooks/swr swr
```

```tsx
import { SWRConfig } from "swr";
import {
  StellarProvider,
  useStellarAccount,
  useStellarBalance,
  useFreighter,
} from "@stellar-hooks/swr"; // <- same API, SWR-powered

function App() {
  return (
    <StellarProvider network="testnet">
      <SWRConfig value={{ refreshInterval: 10000 }}>
        <Wallet />
      </SWRConfig>
    </StellarProvider>
  );
}
```

Every read hook returns the standard SWR response and accepts SWR options:

```tsx
// Poll via SWR config
const { data, mutate } = useStellarAccount(publicKey, {
  refreshInterval: 5000,
  revalidateOnFocus: true,
});

// Manually revalidate after a transaction
await submitPayment();
await mutate();
```

Mutation hooks (`useFreighter`, `useSorobanContract`, `useTransaction`, `usePayment`, `usePathPayment`) are re-exported directly from `stellar-hooks` — they don't need SWR caching.

### React Query adapter (`@stellar-hooks/query`)

```bash
npm install @stellar-hooks/query react-query
```

```tsx
import {
  useStellarAccountQuery,
  useStellarBalanceQuery,
  useFreighterQuery,
} from "@stellar-hooks/query";

// Fetch account with React Query cache
const { data, isLoading } = useStellarAccountQuery(publicKey, {
  staleTime: 60_000,   // 1 minute
  gcTime: 300_000,     // 5 minutes
});

// Connect wallet as a mutation
const { mutate: connect, isPending } = useFreighterQuery();
```

Cache keys used internally:
- Account: `["stellarAccount", publicKey]`
- Balance: `["stellarBalance", publicKey]`

---

## 19. TypeScript types reference

All types are exported and fully documented. Import them with `import type` to keep your bundle clean.

```ts
import type {
  // Network
  StellarNetwork,       // "mainnet" | "testnet" | "futurenet" | "custom"
  NetworkConfig,        // { network, horizonUrl, sorobanRpcUrl, networkPassphrase }
  CustomNetworkConfig,  // same shape, network is always "custom"

  // Account
  StellarAccountData,   // parsed account including balances, thresholds, flags, raw
  StellarBalance,       // { assetType, assetCode?, assetIssuer?, balance, balanceFloat, isNative, ... }

  // Wallet
  FreighterState,       // { isInstalled, isConnected, publicKey, network, networkPassphrase, ... }
  UseFreighterReturn,   // FreighterState + connect, disconnect, signTransaction, signAuthEntry, signBlob
  SignTransactionOptions, // { networkPassphrase?, address? }

  // Transactions
  TransactionStatus,    // "idle" | "building" | "signing" | "submitting" | "polling" | "success" | "error"
  TransactionState,     // { status, hash, result, error, isLoading, isSuccess, isError }

  // Soroban contract
  ContractCallOptions,  // { contractId, method, args?, fee?, timeoutSeconds?, sorobanRpcServer?, ... }
  UseContractCallReturn, // TransactionState + call, simulate, reset

  // Ledger
  LedgerEntryState,     // { data, isLoading, error, lastFetchedAt, refetch }

  // Path payment
  PathPaymentAsset,     // { type: "native" } | { type: "credit"; code: string; issuer: string }
  UsePathPaymentOptions,
  UsePathPaymentReturn,

  // stellar.toml
  StellarTomlData,      // { CURRENCIES?, VALIDATORS?, DOCUMENTATION?, ... }
  UseStellarTomlReturn,

  // Asset metadata
  AssetMetadata,        // { code?, issuer?, name?, desc?, image?, ... }
  UseAssetMetadataReturn,

  // Offers
  UseStellarOffersOptions,
  UseStellarOffersReturn,

  // Provider
  StellarProviderProps,
  StellarContextValue,
} from "stellar-hooks";
```

---

## 20. Common pitfalls & best practices

### State cleanup and polling intervals

**Before** — manual cleanup is error-prone:

```tsx
function AccountDisplay({ publicKey }: { publicKey: string }) {
  const [account, setAccount] = useState(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const server = new Horizon.Server("https://horizon-testnet.stellar.org");
      const acc = await server.loadAccount(publicKey);
      setAccount(acc);
    }, 5000);

    // BUG: Missing cleanup interval if publicKey changes
    return () => clearInterval(interval);
  }, [publicKey]);

  return <div>{account?.sequence}</div>;
}
```

**After** — hooks handle cleanup automatically:

```tsx
function AccountDisplay({ publicKey }: { publicKey: string }) {
  const { data } = useStellarAccount(publicKey, {
    refetchInterval: 5000,
  });

  return <div>{data?.sequence}</div>;
}
```

All hooks with `refetchInterval` clean up intervals on unmount and refetch when dependencies change.

### Network passphrase mismatches

**Before** — silent failures when wallet and dApp networks differ:

```tsx
async function sendPayment() {
  const server = new Horizon.Server("https://horizon-testnet.stellar.org");
  const PASSPHRASE = "Test SDF Network ; September 2015";
  
  // BUG: If Freighter is on mainnet, this transaction targets the wrong network
  const signedXdr = await signTransaction(tx.toXDR(), { networkPassphrase: PASSPHRASE });
  await server.submitTransaction(signedXdr);
}
```

**After** — detect and warn about mismatches:

```tsx
const { networkPassphraseMismatch, networkPassphraseWarning, signTransaction } = useFreighter();

if (networkPassphraseMismatch) {
  return <p className="error">{networkPassphraseWarning}</p>;
}

// Only sign when networks match
const signedXdr = await signTransaction(tx.toXDR());
```

### Provider wrapping

**Before** — passing config down through props:

```tsx
function App() {
  const horizonUrl = "https://horizon-testnet.stellar.org";
  const networkPassphrase = "Test SDF Network ; September 2015";
  
  return (
    <WalletList horizonUrl={horizonUrl} networkPassphrase={networkPassphrase} />
  );
}

function WalletList({ horizonUrl, networkPassphrase }: Props) {
  // Have to pass these down to every component that needs them
  return <AccountCard horizonUrl={horizonUrl} networkPassphrase={networkPassphrase} />;
}
```

**After** — context eliminates prop drilling:

```tsx
function App() {
  return (
    <StellarProvider network="testnet">
      <WalletList />
    </StellarProvider>
  );
}

function WalletList() {
  // All hooks automatically use the provider's network config
  const { data } = useStellarAccount(publicKey);
  return <AccountCard />;
}
```

### Error handling patterns

**Before** — scattered try/catch and error state:

```tsx
function PaymentForm() {
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setIsSubmitting(true);
    setError(null);
    try {
      const server = new Horizon.Server("https://horizon-testnet.stellar.org");
      // ... build transaction
      await server.submitTransaction(signedTx);
    } catch (err) {
      setError(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button onClick={submit} disabled={isSubmitting}>
      {isSubmitting ? "Sending..." : "Send"}
    </button>
  );
}
```

**After** — consistent error and loading states:

```tsx
function PaymentForm() {
  const { submit, status, error, isLoading } = usePayment({
    destination: "GXXX...",
    amount: "10",
  });

  return (
    <button onClick={submit} disabled={isLoading}>
      {status === "submitting" ? "Sending..." : "Send"}
    </button>
  );
}
```

### Sequence number management

**Before** — race conditions when submitting multiple transactions:

```tsx
async function sendTwoPayments() {
  const server = new Horizon.Server("https://horizon-testnet.stellar.org");
  const account = await server.loadAccount(publicKey);
  
  const tx1 = new TransactionBuilder(account, { fee: "100", networkPassphrase: PASSPHRASE })
    .addOperation(Operation.payment({ destination: "G1...", amount: "10" }))
    .build();
  
  const tx2 = new TransactionBuilder(account, { fee: "100", networkPassphrase: PASSPHRASE })
    .addOperation(Operation.payment({ destination: "G2...", amount: "10" }))
    .build();
  
  // BUG: Both transactions have the same sequence number — second will fail
  await server.submitTransaction(tx1);
  await server.submitTransaction(tx2);
}
```

**After** — hooks manage sequence numbers automatically:

```tsx
function SendTwoPayments() {
  const { submit: submit1, status: status1 } = usePayment({
    destination: "G1...",
    amount: "10",
  });
  
  const { submit: submit2, status: status2 } = usePayment({
    destination: "G2...",
    amount: "10",
  });

  async function sendBoth() {
    await submit1();
    // Hooks refetch account data between submissions
    await submit2();
  }

  return <button onClick={sendBoth}>Send Both</button>;
}
```

### Asset balance precision

**Before** — manual float conversion:

```tsx
const balance = account.balances[0].balance;
const balanceFloat = parseFloat(balance); // Loss of precision possible
```

**After** — pre-converted values:

```tsx
const { xlmBalance } = useStellarBalance(publicKey);
// xlmBalance.balanceFloat is already a number for math operations
const doubleBalance = xlmBalance.balanceFloat * 2;
```

### Soroban contract XDR assembly

**Before** — manual ScVal construction is error-prone:

```tsx
const args = [
  nativeToScVal(1, { type: "u32" }),
  nativeToScVal("hello", { type: "string" }),
  // Easy to mix up types or forget conversion
];
```

**After** — use helper functions and validate types:

```tsx
import { nativeToScVal, scValToNative } from "@stellar/stellar-sdk";

const { call } = useSorobanContract({
  contractId: "CABC...",
  method: "my_method",
  args: [
    nativeToScVal(1, { type: "u32" }),
    nativeToScVal("hello", { type: "string" }),
  ],
});

// Always validate return values
const result = scValToNative(callResult as any);
```

### Memory leaks with polling

**Before** — intervals can continue after component unmount:

```tsx
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 5000);
  
  // BUG: Missing cleanup on unmount
}, []);
```

**After** — hooks handle cleanup:

```tsx
const { data } = useStellarAccount(publicKey, {
  refetchInterval: 5000,
});
// Interval is automatically cleared on unmount
```

### Network switching

**Before** — page reload required:

```tsx
function NetworkSwitcher() {
  const [network, setNetwork] = useState("testnet");
  
  const switchNetwork = (newNetwork: string) => {
    setNetwork(newNetwork);
    window.location.reload(); // Poor UX
  };
  
  return <button onClick={() => switchNetwork("mainnet")}>Switch to Mainnet</button>;
}
```

**After** — seamless runtime switching:

```tsx
function NetworkSwitcher() {
  const { network, setNetwork } = useNetwork();
  
  return (
    <button onClick={() => setNetwork("mainnet")}>
      Switch to {network === "testnet" ? "Mainnet" : "Testnet"}
    </button>
  );
}
```

All child hooks automatically refetch when the network changes.

---

## Quick reference: before vs. after

| Raw SDK task | stellar-hooks equivalent |
|---|---|
| `Horizon.Server.loadAccount()` | `useStellarAccount(publicKey)` |
| Filter `account.balances` for XLM | `useStellarBalance(publicKey).xlmBalance` |
| `requestAccess()` + `getPublicKey()` | `useFreighter()` |
| `signTransaction()` from freighter-api | `useFreighter().signTransaction()` |
| Build + sign + `server.submitTransaction()` | `usePayment(options)` |
| `pathPaymentStrictSend/Receive` + submit | `usePathPayment(options)` |
| Simulate + auth + submit + poll Soroban | `useSorobanContract(options)` |
| `server.getLedgerEntries(key)` | `useLedgerEntry(key)` |
| `server.sendTransaction()` + poll loop | `useTransaction({ mode })` |
| `server.offers().forAccount()` | `useStellarOffers(publicKey)` |
| `server.orderbook(selling, buying)` | `useOfferBook({ selling, buying })` |
| `server.trades().forAccount()` | `useTrades(publicKey)` |
| `server.claimableBalances().claimant()` | `useClaimableBalances(publicKey)` |
| `claimClaimableBalance` operation + submit | `useClaimBalance().claim(balanceId)` |
| `server.getEvents(...)` | `useContractEvents(options)` |
| `StellarToml.Resolver.resolve(domain)` | `useStellarToml(domain)` |
| Account `home_domain` → toml → CURRENCIES | `useAssetMetadata(code, issuer)` |
| `new Horizon.Server(url)` everywhere | `<StellarProvider network="testnet">` once |
| Manual `useState` + `useEffect` + error state | Handled by every hook automatically |

---

## Need help?

- [stellar-hooks README](../README.md)
- [Freighter API v1 → v6 migration guide](./freighter-api-migration.md)
- [GitHub Issues](https://github.com/dark-princezz/stellar-hooks/issues)
- [Stellar Developer Docs](https://developers.stellar.org)
- [Freighter API Docs](https://docs.freighter.app)
