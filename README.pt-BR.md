# stellar-hooks

[![build status](https://img.shields.io/github/actions/workflow/status/dark-princezz/stellar-hooks/preview.yml?branch=main&style=flat-square&label=build)](https://github.com/dark-princezz/stellar-hooks/actions)
[![npm version](https://img.shields.io/npm/v/stellar-hooks.svg?style=flat-square)](https://www.npmjs.com/package/stellar-hooks)
[![license](https://img.shields.io/github/license/dark-princezz/stellar-hooks.svg?style=flat-square)](LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/stellar-hooks?style=flat-square)](https://bundlephobia.com/package/stellar-hooks)
[![codecov](https://codecov.io/gh/dark-princezz/stellar-hooks/branch/main/graph/badge.svg)](https://codecov.io/gh/dark-princezz/stellar-hooks)

> 📄 Esta é a versão em **português (Brasil)** do README. O conteúdo original em inglês está no [README.md](README.md).


> Hooks React para Stellar e Soroban. O `wagmi` que você estava esperando.


O `stellar-hooks` conecta o [Stellar JS SDK v13](https://github.com/stellar/js-stellar-sdk) e a API da carteira Freighter a um conjunto de hooks React ergonômicos, para que você construa dApps Stellar sem copiar e colar o mesmo boilerplate em todos os repositórios.

## Teste em 30 segundos

```bash
npm install stellar-hooks
```

```tsx
import { StellarProvider, useFreighter } from "stellar-hooks";

function Connect() {
  const { publicKey, connect } = useFreighter();
  return publicKey ? <p>{publicKey}</p> : <button onClick={connect}>Connect Freighter</button>;
}

export default function App() {
  return (
    <StellarProvider network="testnet">
      <Connect />
    </StellarProvider>
  );
}
```

Esse é todo o setup. As seções abaixo explicam o processo passo a passo e depois listam todos os hooks.

## Primeiros passos

Siga estes passos simples para começar a construir dApps Stellar e Soroban com `stellar-hooks`.

### 1. Instalação

Instale a biblioteca com o gerenciador de pacotes de sua preferência:

```bash
npm install stellar-hooks
```
*(Nota: `@stellar/stellar-sdk` e `@stellar/freighter-api` são empacotados como dependências diretas, então você não precisa instalá-los separadamente. Veja [`COMPATIBILITY.md`](COMPATIBILITY.md) para as versões suportadas do SDK e a matriz de compatibilidade).*

### 2. Envoltura sua aplicação com `<StellarProvider>`

Para habilitar o contexto de rede para todos os hooks filhos, envolva o componente raiz da sua aplicação com `StellarProvider`, especificando a rede de destino (`"testnet"`, `"mainnet"` ou `"futurenet"`):

```tsx
// main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { StellarProvider } from "stellar-hooks";
import { App } from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StellarProvider network="testnet">
      <App />
    </StellarProvider>
  </React.StrictMode>
);
```

### 3. Seu primeiro exemplo funcional com `useFreighter`

Use o hook `useFreighter` para conectar à carteira de extensão Freighter, verificar o status da conexão e ler o saldo nativo de XLM do usuário em tempo real:

```tsx
// App.tsx
import { useFreighter, useStellarBalance } from "stellar-hooks";

export function App() {
  const { isInstalled, isConnected, publicKey, connect, disconnect } = useFreighter();
  const { xlmBalance, isLoading } = useStellarBalance(publicKey);

  if (!isInstalled) {
    return <p>Please install the Freighter browser extension to use this dApp.</p>;
  }

  if (!isConnected) {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>Welcome to Stellar dApp</h2>
        <button onClick={connect}>Connect Freighter Wallet</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Connected to Stellar Testnet</h2>
      <p><strong>Account:</strong> {publicKey}</p>
      <p><strong>XLM Balance:</strong> {isLoading ? "Loading..." : \`\${xlmBalance?.balance ?? "0"} XLM\`}</p>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}
```

---

## Início rápido

```bash
npm install stellar-hooks
```

Envoltura sua aplicação com o provider e leia um saldo em um único componente:

```tsx
// main.tsx
import { StellarProvider } from "stellar-hooks";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StellarProvider network="testnet">
    <App />
  </StellarProvider>
);
```

```tsx
// App.tsx
import { useFreighter, useStellarBalance } from "stellar-hooks";

export function App() {
  const { isConnected, publicKey, connect } = useFreighter();
  const { xlmBalance } = useStellarBalance(publicKey);

  if (!isConnected) {
    return <button onClick={connect}>Connect Freighter</button>;
  }

  return (
    <p>
      {publicKey} · {xlmBalance?.balance ?? "..."} XLM
    </p>
  );
}
```

É isso — instalar, conectar, ler um saldo.

---

## Recursos

## Hooks

Todos os hooks listados abaixo estão implementados e exportados a partir do ponto de entrada do pacote. Hooks com um link ↓ têm uma referência expandida mais abaixo nesta página.

#### Carteira e conexão

| Hook | Descrição |
|------|-------------|
| [`useFreighter()`](#usefreighter) ↓ | Conecta à extensão [Freighter](https://freighter.app) (`@stellar/freighter-api` v6); assina transações, auth entries e mensagens. Suporta `signMessage()` e `autoConnect`. |
| `useFreighterAccounts()` | Acompanha endereços Freighter vistos anteriormente no `localStorage`; controla o diálogo de permissão para alternar entre eles. |
| [`useWalletKit()`](#usewalletkit) ↓ | Detecta carteiras Stellar instaladas (Freighter, Lobstr, xBull) e expõe uma interface unificada de conexão/assinatura. |
| `useWalletsKit()` | Adaptador multi-carteira via [`@creit-tech/stellar-wallets-kit`](https://github.com/Creit-Tech/Stellar-Wallets-Kit) (Freighter, xBull, Albedo, Lobstr, WalletConnect, …). |
| `useWalletConnect()` | Adaptador WalletConnect v2 para Stellar / Freighter Mobile. |
| [`useNetwork()`](#usenetwork) ↓ | Lê a configuração de rede ativa e troca de rede em tempo de execução. |
| [`useStellarNetwork()`](#usestellarnetwork) ↓ | Lê a rede ativa e troca dinamicamente com `setNetwork()` — sem recarregar a página. |
| [`useNetworkConfig()`](#usenetworkconfig) ↓ | Lê o objeto completo de configuração de rede ativa a partir do contexto do provider. |
| [`useHorizonServer()`](#usehorizonserver) ↓ | Retorna a instância configurada do servidor Horizon para consultas personalizadas. |
| [`useNetworkStatus()`](#usenetworkstatusoptions) ↓ | Monitora a saúde do Horizon e do RPC para indicadores de status da rede nas interfaces de dApps. |

#### Dados de conta e ledger (leitura)

| Hook | Descrição |
|------|-------------|
| [`useStellarAccount()`](#usestellaraccountpublickey-options) ↓ | Busca (e opcionalmente faz polling de) uma conta completa no Horizon. |
| `useStellarAccounts()` | Busca e faz polling de múltiplas contas em paralelo (sem cascata serial). |
| [`useStellarBalance()`](#usestellarbalancepublickey-options) ↓ | Saldos de XLM e por ativo (wrapper de `useStellarAccount`). |
| `useSorobanTokenBalance()` | Lê saldos de tokens SAC (Stellar Asset Contract) via Soroban RPC. |
| `useNotificationPermission()` | Estado de permissão de Notificações do navegador com um helper `request()`. |
| `useTokenAllowance()` | Lê um allowance de spender SEP-41 e seu ledger de expiração. |
| `useTokenTransfer()` | Transfere um token SEP-41 da carteira conectada com validação prévia. |
| `useTokenBalance()` | Lê um saldo de token SEP-41 com bigint tipado e saída formatada. |
| [`useLedgerEntry()`](#useledgerentryledgerkey-options) ↓ | Lê uma entrada de ledger Soroban bruta pelo seu `xdr.LedgerKey`. |
| `useOperations()` | Busca operações de uma conta ou transação no Horizon; suporta `includeFailed` e paginação por cursor. |
| `useEffects()` | Transmitiu efeitos de conta a partir do Horizon. |
| `useAssets()` | Busca e lista ativos Stellar via Horizon. |
| `useAssetMetadata()` | Busca metadados de um ativo a partir do `stellar.toml` de um domínio. |
| [`useStellarToml()`](#usestellartomldomain-options) ↓ | Busca e analisa o `stellar.toml` de um domínio (SEP-1); expõe o federation server, chave de assinatura, moedas e outros campos bem conhecidos. |
| `useOffers()` | Busca ofertas abertas de uma conta Stellar com helpers de paginação. |
| `useStellarOffers()` | Busca ofertas abertas de uma conta Stellar. |
| [`useOrderBook()`](#useorderbookselling-buying-options) ↓ | Consulta o livro de ofertas da DEX do Stellar para qualquer par de ativos; suporta polling ao vivo. |
| [`useTrades()`](#usestrictpublickey-options) ↓ | Busca o histórico de negociações da DEX de uma conta com filtragem opcional por par de ativos. |
| [`useStrictSendPaths()`](#usestrictsendpathssourceasset-sourceamount-destinationassets-options) ↓ | Descobre caminhos de pagamento e taxas de câmbio pelo endpoint strict-send do Horizon antes de confirmar uma troca. |
| `useClaimableBalances()` | Lista claimable balances de uma conta. |
| [`useAssetBalance()`](#useassetbalancepublickey-asset-options) ↓ | Busca um saldo de ativo específico (nativo ou emitido) para uma dada chave pública. |
| [`useTrustlines()`](#usetrustlinespublickey) ↓ | Lista e gerencia trustlines de uma conta. |
| [`useTransactionHistory()`](#usetransactionhistorypublickey-options) ↓ | Busca histórico de transações paginado de uma conta no Horizon. |
| `useSequenceNumber()` | Acompanha e auto-incrementa o número de sequência de uma conta. |
| `useFeeStats()` | Busca estatísticas recentes de taxas (percentis) no Horizon. |
| `useOfferBook()` | Busca o livro de ofertas de um dado par de ativos. |
| `useLiquidityPool()` | Busca os detalhes de um pool de liquidez pelo ID do pool. |
| `useAccountLiquidityPositions()` | Lista posições de pool de liquidez de uma dada conta. |
| `useAssetSearch()` | Busca ativos Stellar via API do StellarExpert. |

#### Pagamentos e operações (escrita)

| Hook | Descrição |
|------|-------------|
| [`usePayment()`](#usepaymentoptions) ↓ | Constrói, assina e envia um pagamento clássico de XLM / ativo. |
| `usePathPayment()` | Pagamentos por caminho strict send / strict receive. |
| [`useTransaction()`](#usetransactionoptions) ↓ | Envia um XDR pré-assinado e espera até a confirmação (Soroban RPC ou Horizon clássico). |
| `useTrade()` | Cria, modifica e cancela ofertas da DEX do Stellar. |
| `useTrustline()` | Adiciona, remove e modifica trustlines. |
| `useCreateAccount()` | Financia (via Friendbot) e cria novas contas. |
| `useAccountMerge()` | Constrói e envia um merge de conta. |
| `useAccountFlags()` | Define e limpa flags de autorização da conta. |
| `useBumpSequence()` | Aumenta o número de sequência de uma conta. |
| `useMultiSig()` | Constrói uma transação multi-sig, coleta assinaturas e envia quando o threshold é atingido. |
| `useInflation()` | Envia uma operação de inflação (suporte legado). |
| `useClaimBalance()` / `useCreateClaimableBalance()` | Resgata e cria claimable balances. |

#### Soroban / contratos

Para uma análise entre hooks de como `error`, `isError`, `refetch` e `reset` se comportam, veja o guia [Error Handling Patterns](docs/guides/error-handling.md).

| Hook | Descrição |
|------|-------------|
| [`useSorobanContract()`](#usesorobancontractoptions) ↓ | Simula → assina → envia → espera uma chamada de contrato Soroban em um único hook. |
| [`useLedgerEntry()`](#useledgerentryledgerkey-options) ↓ | Lê uma entrada de ledger Soroban bruta sem construir uma chamada de contrato. |
| [`useSorobanServer()`](#usesorobanserver) ↓ | Obtém uma instância configurada de `SorobanRpc.Server` do contexto do provider. |
| `useContractEvents()` | Faz polling de eventos de contrato Soroban a partir do RPC. |
| `useContractId()` | Calcula um ID de contrato a partir de um descritor de ativo (emissor + código). |

---

### `useFreighter()`

Conecta e interage com a carteira de extensão de navegador [Freighter](https://freighter.app). Construído sobre **`@stellar/freighter-api` v6** — `signBlob` é implementado sobre a API `signMessage` do Freighter.

```ts
const {
  isInstalled,             // boolean — is Freighter installed?
  isConnected,             // boolean — has the user granted access?
  publicKey,               // string | null
  network,                 // string | null  e.g. "TESTNET"
  networkPassphrase,       // string | null
  networkPassphraseMismatch, // boolean — true when wallet network differs from `expectedNetworkPassphrase` (or the <StellarProvider> network)
  networkPassphraseWarning,  // string | null — actionable warning text on mismatch; null otherwise
  isLoading,
  isSigningMessage,        // boolean — true while signMessage() is in flight
  isAutoConnecting,        // boolean — true while the autoConnect silent check runs
  error,

  connect,           // () => Promise<void>
  disconnect,        // () => void
  signTransaction,   // (xdr: string, opts?) => Promise<string>
  signAuthEntry,     // (entryPreimageXdr: string) => Promise<string>
  signBlob,          // (blob: string, opts?) => Promise<string>  — wraps signMessage
  signMessage,       // (message: string, opts?) => Promise<string>  — sign arbitrary messages
} = useFreighter();
```

#### Login com Stellar

Use `signMessage()` para implementar fluxos de autenticação challenge-response:

```tsx
import { useFreighter } from "stellar-hooks";

function SignInButton() {
  const { isConnected, publicKey, signMessage, isSigningMessage, connect } = useFreighter();

  async function handleSignIn() {
    if (!isConnected) { await connect(); return; }
    const challenge = `Sign in to MyApp at ${new Date().toISOString()}`;
    const signature = await signMessage(challenge);
    // Send { publicKey, challenge, signature } to your backend for verification
    await fetch("/api/auth", {
      method: "POST",
      body: JSON.stringify({ publicKey, challenge, signature }),
    });
  }

  return (
    <button onClick={handleSignIn} disabled={isSigningMessage}>
      {isSigningMessage ? "Signing…" : "Sign In with Stellar"}
    </button>
  );
}
```

#### Reconexão automática de usuários retornantes

Passe `autoConnect: true` para reconectar silenciosamente usuários que antes concederam acesso — sem popup:

```tsx
const { isConnected, publicKey, isAutoConnecting } = useFreighter({
  autoConnect: true,
});

if (isAutoConnecting) return <p>Reconnecting…</p>;
if (isConnected) return <p>Welcome back, {publicKey}</p>;
```

#### Detecção de incompatibilidade de rede

Se a carteira está em uma rede Stellar diferente da que sua dApp espera, assinar silenciosamente apontaria para o ledger errado. O hook aceita um `expectedNetworkPassphrase` opcional:

```ts
const { networkPassphraseMismatch, networkPassphraseWarning } = useFreighter({
  expectedNetworkPassphrase: "Test SDF Network ; September 2015",
});

// Or, if your app is wrapped in <StellarProvider network="testnet">, the
// expected passphrase is taken from the provider automatically.
```

Renderize `networkPassphraseWarning` para expor o problema, ou condicione a assinatura a um reconhecimento. Veja a [referência da API](./docs/api/hooks/use-freighter.md) para um exemplo completo.

---

### `useNetwork()`

Lê a configuração de rede ativa e troca de rede em tempo de execução. Todos os valores refletem a rede atualmente ativa — incluindo qualquer troca feita via `switchNetwork`.

### `useNetworkConfig()`

Lê o objeto completo de configuração de rede ativa a partir do contexto do provider, sem propagar props pela sua árvore de componentes.

```tsx
import { useNetworkConfig } from "stellar-hooks";

function NetworkBadge() {
  const { network, horizonUrl, sorobanRpcUrl, networkPassphrase } = useNetworkConfig();

  return <pre>{JSON.stringify({ network, horizonUrl, sorobanRpcUrl, networkPassphrase }, null, 2)}</pre>;
}
```

### `useHorizonServer()`

Retorna a instância configurada do servidor Horizon para consultas personalizadas além dos hooks embutidos.

```tsx
import { useHorizonServer } from "stellar-hooks";

function CustomHorizonExample() {
  const server = useHorizonServer();

  async function loadAccountOffers(publicKey: string) {
    return server.offers().forAccount(publicKey).call();
  }

  return null;
}
```

```ts
const {
  network,            // StellarNetwork — "testnet" | "mainnet" | "futurenet" | "custom"
  networkPassphrase,  // string — e.g. "Test SDF Network ; September 2015"
  horizonUrl,         // string — active Horizon REST API endpoint
  sorobanRpcUrl,      // string — active Soroban RPC endpoint
  config,             // NetworkConfig — full { network, horizonUrl, sorobanRpcUrl, networkPassphrase }
  switchNetwork,      // (network: StellarNetwork, customConfig?: CustomNetworkConfig) => void
} = useNetwork();
```

Troque de rede em tempo de execução (ex.: uma interface de configurações):

```tsx
import { useNetwork } from "stellar-hooks";
import type { StellarNetwork } from "stellar-hooks";

function NetworkSwitcher() {
  const { network, switchNetwork } = useNetwork();

  return (
    <select
      value={network}
      onChange={(e) => switchNetwork(e.target.value as StellarNetwork)}
    >
      <option value="testnet">Testnet</option>
      <option value="mainnet">Mainnet</option>
      <option value="futurenet">Futurenet</option>
    </select>
  );
}
```

Ao trocar para uma rede personalizada, passe o `CustomNetworkConfig` completo como segundo argumento:

```ts
switchNetwork("custom", {
  network: "custom",
  horizonUrl: "https://my-horizon.example.com",
  sorobanRpcUrl: "https://my-rpc.example.com",
  networkPassphrase: "My Network ; 2024",
});
```

A rede selecionada é persistida no `localStorage` e sobrevive a recargas da página.

---

### `useStellarNetwork()`

Lê a rede ativa e troca dinamicamente com `setNetwork()` — sem recarregar a página nem remontar o provider. Todos os hooks filhos buscam dados novamente automaticamente quando a rede muda.

```ts
const {
  network,            // StellarNetwork
  networkPassphrase,  // string
  horizonUrl,         // string
  sorobanRpcUrl,      // string
  config,             // NetworkConfig
  setNetwork,         // (network: StellarNetwork, customConfig?: CustomNetworkConfig) => void
} = useStellarNetwork();
```

Exemplo — um alternador testnet/mainnet:

```tsx
import { useStellarNetwork } from "stellar-hooks";

function NetworkToggle() {
  const { network, setNetwork } = useStellarNetwork();

  return (
    <button onClick={() => setNetwork(network === "testnet" ? "mainnet" : "testnet")}>
      Currently: {network} — click to switch
    </button>
  );
}
```

---

### `useWalletKit()`

Detecta carteiras Stellar instaladas (Freighter, Lobstr, xBull) e expõe uma interface unificada — conectar, desconectar e assinar, independentemente de qual carteira está ativa.

```ts
const {
  availableWallets,  // WalletId[] — e.g. ["freighter", "lobstr"]
  activeWallet,      // WalletId | null
  publicKey,         // string | null
  isConnecting,      // boolean
  error,             // Error | null

  setActiveWallet,   // (id: WalletId) => void
  connect,           // (walletId?: WalletId) => Promise<string | null>
  disconnect,        // () => void
  signTransaction,   // (xdr: string, opts?) => Promise<string>
} = useWalletKit();
```

Exemplo — seletor de carteira:

```tsx
import { useWalletKit } from "stellar-hooks";

function WalletPicker() {
  const { availableWallets, activeWallet, publicKey, connect, disconnect } = useWalletKit();

  if (publicKey) {
    return (
      <div>
        <p>Connected via {activeWallet}: {publicKey}</p>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    );
  }

  if (availableWallets.length === 0) return <p>No Stellar wallets detected.</p>;

  return (
    <div>
      {availableWallets.map((id) => (
        <button key={id} onClick={() => connect(id)}>
          Connect {id}
        </button>
      ))}
    </div>
  );
}
```

Gracefully degrades quando uma extensão de carteira não está instalada — ela simplesmente não aparece em `availableWallets`.

---

### `useStellarAccount(publicKey, options?)`

Busca (e opcionalmente faz polling de) uma conta Stellar completa no Horizon.

```ts
const {
  data,           // StellarAccountData | null
  isLoading,
  error,
  lastFetchedAt,  // Date | null
  refetch,
} = useStellarAccount("G...", {
  enabled: true,         // default: true
  refetchInterval: 5000, // poll every 5 s; 0 = disabled (default)
});

// data.balances   → StellarBalance[]
// data.sequence   → string
// data.subentryCount → number
// data.numSponsored  → number
// data.numSponsoring → number
// data.raw        → raw Horizon.AccountResponse
```

---

### `useStellarBalance(publicKey, options?)`

Wrapper conveniente de `useStellarAccount` que expõe o saldo de XLM e, opcionalmente, o saldo de um ativo específico.

```ts
const {
  balances,     // StellarBalance[]
  xlmBalance,   // StellarBalance | null  (the native XLM entry)
  assetBalance, // StellarBalance | null  (the specific asset requested, if any)
  isLoading,
  error,
  refetch,
} = useStellarBalance("G...", { code: "USDC", issuer: "G..." });
```

### `useStellarAccounts(publicKeys[], options?)`

Busca e faz polling de múltiplas contas Stellar em paralelo — útil para listas de multisig, seletores de conta ou qualquer visão em lista. Emite um `Promise.all(loadAccount)` em lote por tick e retorna um mapa por chave.

```ts
const {
  accounts,      // Record<publicKey, StellarAccountData | null>
  errors,        // Record<publicKey, Error | null>
  isLoading,
  isError,
  error,         // First per-key error across the batch, or null
  refetch,
  lastFetchedAt,
} = useStellarAccounts([signerA, signerB, signerC], { refetchInterval: 10_000 });
```

- Entradas `null`/`undefined` no input são ignoradas.
- Chaves duplicadas são deduplicadas antes da chamada ao RPC.
- Uma única conta com falha NÃO contamina o restante do lote — `errors[pk]` carrega erros por chave.

---

### `useSorobanContract(options)`

Simula → assina (via Freighter) → envia → espera uma chamada de contrato Soroban. O ciclo de vida completo em um único hook.

```ts
const { call, status, result, hash, error, reset } = useSorobanContract({
  contractId: "CABC...XYZ",   // Soroban C... contract address
  method: "increment",
  args: [nativeToScVal(1, { type: "u32" })],
  fee: "100",                 // stroops (default: BASE_FEE)
  timeoutSeconds: 30,         // default: 30
});

// Statuses: "idle" | "building" | "signing" | "submitting" | "polling" | "success" | "error"
<button onClick={() => call()} disabled={status !== "idle"}>
  {status}
</button>
```

Você também pode passar uma instância `rpc.Server` pré-configurada pela opção `sorobanRpcServer` para reutilizar uma conexão existente ou um transporte personalizado:

```ts
const { call, status } = useSorobanContract({
  contractId: "CABC...XYZ",
  method: "hello",
  args: [nativeToScVal("world")],
  sorobanRpcServer: myCustomServer,
});
```

`result` contém o valor de retorno bruto `xdr.ScVal`. Analise-o com `scValToNative` do SDK.

---

### `useTransaction(options?)`

Envia um XDR pré-assinado e espera a confirmação. Útil quando você assina fora do React (ex.: carteira de hardware, lado do servidor).

```ts
const { submit, status, hash, isSuccess, isError, error, reset } = useTransaction({
  mode: "soroban",    // "soroban" (default) | "classic"
  timeoutSeconds: 60,
});

await submit(signedXdr);
```

---

### `useNetworkStatus(options?)`

Expõe a saúde do Horizon e do RPC em tempo real. Útil para exibir indicadores de status da rede nas interfaces de dApps.

```ts
const {
  horizonLatency,  // number — latency in ms; Infinity if offline
  rpcLatency,      // number — latency in ms; Infinity if offline
  isHorizonHealthy,// boolean
  isRpcHealthy,    // boolean
  ledger,          // number — latest ledger sequence
} = useNetworkStatus({
  refetchInterval: 10000, // poll every 10s (default)
});
```

Este hook lida graciosamente com timeouts e cenários offline para cada endpoint de forma independente.

---

### `useTransactionHistory(publicKey, options?)`

Busca histórico de transações paginado de uma dada conta Stellar no Horizon.

```ts
const {
  transactions,    // Horizon.TransactionResponse[]
  fetchNextPage,   // () => void
  hasMore,         // boolean
  isLoading,       // boolean
  error,
} = useTransactionHistory("G...", {
  limit: 20,       // default: 10
  order: "desc",   // default: "desc"
});
```

---

### `useLedgerEntry(ledgerKey, options?)`

Lê uma entrada de ledger Soroban bruta pelo seu `xdr.LedgerKey` sem construir uma chamada de contrato.

```ts
import { xdr, Address, Contract } from "@stellar/stellar-sdk";

const key = xdr.LedgerKey.contractData(
  new xdr.LedgerKeyContractData({
    contract: new Address(CONTRACT_ID).toScAddress(),
    key: xdr.ScVal.scvSymbol("Counter"),
    durability: xdr.ContractDataDurability.persistent(),
  })
);

const { data, isLoading, error, refetch } = useLedgerEntry(key, {
  refetchInterval: 3000,
});
```

---

---

### `useAssetBalance(publicKey, asset, options?)`

Busca um saldo de ativo específico (XLM nativo ou ativo emitido) para uma dada chave pública.

```ts
const { balance, isLoading, error } = useAssetBalance("G...", "native");
// balance → StellarBalance | null

const { balance } = useAssetBalance("G...", { code: "USDC", issuer: "G..." });
```

Suporta as mesmas opções `refetchInterval` e `enabled` de `useStellarAccount`.

---

### `useTrustlines(publicKey)`

Lista e gerencia trustlines de uma conta.

```ts
const { trustlines, addTrustline, removeTrustline, status } = useTrustlines("G...");

await addTrustline({ code: "USDC", issuer: "G..." });  // add a trustline
await removeTrustline({ code: "USDC", issuer: "G..." }); // remove (set limit to 0)

// status: "idle" | "submitting" | "success" | "error"
// Each mutation signs via Freighter and submits through Horizon.
```

---

### `useAccountMerge()`

Merge a conta financiada em uma conta de destino via Freighter. Isso fecha permanentemente a conta de origem e transfere todo o seu saldo de XLM — a operação é irreversível.

```ts
const { submit, status, hash, error } = useAccountMerge({
  destination: "GDEST...",
  memo: "closing out", // optional
});

await submit();
```

---

### `useSorobanServer()`

Obtém uma instância configurada de `SorobanRpc.Server` a partir do contexto do `StellarProvider`.

```ts
const server = useSorobanServer();
// Equivalent to: new SorobanRpc.Server(config.sorobanRpcUrl)

// Useful for ad-hoc RPC calls outside of the existing hooks:
const account = await server.getAccount("G...");
const ledgerEntries = await server.getLedgerEntries(key);
```

Lança um erro descritivo se usado fora de `<StellarProvider>`.

---

## Compatibilidade com SEP

Suporte a [Stellar Ecosystem Proposals](https://github.com/stellar/stellar-protocol/tree/master/ecosystem) em toda a biblioteca.

| SEP | Descrição | Hook / API | Status |
|-----|-------------|------------|--------|
| [SEP-1](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0001.md) | Stellar Info File (`stellar.toml`) | `useStellarToml()`, `useAssetMetadata()` | Estável |
| [SEP-6](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0006.md) | Depósito e Saque Programático | — | Planejado |
| [SEP-10](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md) | Stellar Web Authentication | `useWebAuth()` | Experimental |
| [SEP-12](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0012.md) | API de KYC | `useKycStatus()` | Experimental |
| [SEP-24](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md) | Depósito e Saque Hospedado | `useSep24()`, `useAnchorTransactionStatus()` | Experimental |
| [SEP-38](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0038.md) | API de RFQ da Anchor (Cotações) | — | Planejado |

- **Estável** — a API é coberta pelas garantias do semver.
- **Experimental** — utilizável hoje, mas a API pode mudar em uma release menor.
- **Planejado** — no [roadmap](#roadmap), ainda não implementado.

### `useAnchorTransactionStatus(options)`

Faz polling do endpoint `/transaction` de uma âncora SEP-24 até que a transação atinja um status terminal (`completed`, `refunded`, `expired`, `no_market`, `error`). Os timers são limpos ao desmontar e sempre que as opções mudam.

```tsx
const { transaction, status, isPolling, error, refetch } = useAnchorTransactionStatus({
  anchorUrl: "https://testanchor.stellar.org/sep24",
  transactionId,
  jwt,
  pollIntervalMs: 5000, // default
});
```

### `useKycStatus(options)`

Consulta o endpoint `GET /customer` de uma âncora SEP-12. Quando o status é `NEEDS_INFO`, `missingFields` lista os campos obrigatórios (e campos fornecidos rejeitados) que ainda precisam ser enviados.

```tsx
const { status, missingFields, fields, isLoading, error, refetch } = useKycStatus({
  anchorUrl: "https://testanchor.stellar.org/kyc",
  jwt,
  kycType: "sep31-sender", // optional
  id: customerId,          // optional
});
```

---

## Provider

Envoltura sua aplicação (ou a parte que precisa de Stellar) com `<StellarProvider>` para configurar a rede. Todo hook que lê dados da blockchain consome a configuração de endpoints deste provider.

### Props

| Prop | Tipo | Padrão | Descrição |
|------|------|---------|-------------|
| `network` | `StellarNetwork` | `"testnet"` | A rede à qual conectar. Uma de `"testnet"`, `"mainnet"`, `"futurenet"` ou `"custom"`. |
| `customConfig` | `CustomNetworkConfig` | — | Obrigatório quando `network` é `"custom"`. Fornece a URL do Horizon, a URL do Soroban RPC e a passphrase da rede para o seu deploy. |
| `children` | `React.ReactNode` | — | A árvore de componentes que terá acesso ao contexto Stellar. |

### Predefições de rede incorporadas

| Rede | URL do Horizon | URL do Soroban RPC | Passphrase da Rede |
|---------|-------------|-----------------|-------------------|
| `testnet` | `https://horizon-testnet.stellar.org` | `https://soroban-testnet.stellar.org` | `Test SDF Network ; September 2015` |
| `mainnet` | `https://horizon.stellar.org` | `https://mainnet.sorobanrpc.com` | `Public Global Stellar Network ; September 2015` |
| `futurenet` | `https://horizon-futurenet.stellar.org` | `https://rpc-futurenet.stellar.org` | `Test SDF Future Network ; October 2022` |

Estas predefições também são exportadas como `NETWORK_CONFIGS` caso você precise delas fora do React:

```ts
import { NETWORK_CONFIGS } from "stellar-hooks";

const { horizonUrl } = NETWORK_CONFIGS.mainnet;
```

### Exemplos de uso

```tsx
// Testnet (default)
<StellarProvider network="testnet">
  <App />
</StellarProvider>

// Mainnet
<StellarProvider network="mainnet">
  <App />
</StellarProvider>

// Futurenet
<StellarProvider network="futurenet">
  <App />
</StellarProvider>

// Custom / self-hosted network
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

Para informações detalhadas sobre configuração de endpoints RPC e Horizon personalizados, veja o guia [RPC Endpoint Configuration](/guides/rpc-endpoint-configuration) na documentação.

### `CustomNetworkConfig`

Use esta interface ao conectar a uma rede Stellar privada ou auto-hospedada.

| Campo | Tipo | Descrição |
|-------|------|-------------|
| `network` | `"custom"` | Deve ser `"custom"`. |
| `horizonUrl` | `string` | URL base da API REST do Horizon para esta rede. |
| `sorobanRpcUrl` | `string` | Endpoint do Soroban RPC para simulação e submissão de contratos. |
| `networkPassphrase` | `string` | Passphrase da rede usada ao assinar transações. |

### Persistência de rede

`<StellarProvider>` persiste automaticamente a rede ativa no `localStorage` sob as chaves `stellar-hooks:network` e `stellar-hooks:custom-config`. Em carregamentos subsequentes da página, a escolha persistida é restaurada, sobrescrevendo a prop `network`. Para trocar de rede em tempo de execução e persistir a mudança, use [`useNetwork().switchNetwork`](#usenetwork).

---

## Tipos

Todos os tipos são exportados e totalmente documentados via JSDoc.

```ts
import type {
  StellarNetwork,
  NetworkConfig,
  CustomNetworkConfig,
  StellarAccountData,
  StellarBalance,
  FreighterState,
  UseFreighterReturn,
  TransactionStatus,
  ContractCallOptions,
  AssetDescriptor,
  UseAssetBalanceReturn,
  TrustlineAsset,
  UseTrustlinesReturn,
  UseAccountMergeReturn,
} from "stellar-hooks";
```

---

## Requisitos

| Dependência peer | Versão |
|---|---|
| react | ≥ 18 |
| react-dom | ≥ 18 |

A biblioteca é distribuída com `@stellar/stellar-sdk` v13 e `@stellar/freighter-api` v6 como dependências diretas — você não precisa instalá-los separadamente, a menos que precise de uma versão diferente.

---

## Migração

Veja [docs/guides/migration-guide.md](docs/guides/migration-guide.md) para um guia completo sobre como migrar do uso direto de `@stellar/stellar-sdk` para `stellar-hooks`, incluindo comparações de código lado a lado, armadilhas comuns e boas práticas.

---

## Contribuindo

1. `git clone https://github.com/YOUR_USERNAME/stellar-hooks`
2. `npm install`
3. `npm run dev` — compila em modo watch
4. Edite os hooks em `src/hooks/`, os tipos em `src/types/`
5. Abra um PR
6. Execute `npm run changeset` para criar uma nota de changeset para a sua mudança.
7. Se o seu PR incluir mudanças de código, execute `npm run build` antes de abrir o PR.

Por favor, consulte nosso [Guia de Contribuição](CONTRIBUTING.md) e o [Código de Conduta](CODE_OF_CONDUCT.md) para mais detalhes antes de abrir um pull request.

Veja também: [Contribuidores](CONTRIBUTORS.md) · [Programa de Recompensas](BOUNTIES.md) · [Atualizações da Comunidade](COMMUNITY.md)

## Documentação

Documentação completa com exemplos ao vivo está disponível em **[https://spiffamani.github.io/stellar-hooks/](https://spiffamani.github.io/stellar-hooks/)**

Para visualizar o site de documentação localmente:

```bash
npm install
npm run docs:dev
```

O site de documentação estará disponível em `http://localhost:5173` (ou na porta que o VitePress atribuir).

### Compatibilidade WebAuthn / passkey

Contas inteligentes com passkey dependem do suporte ao WebAuthn do navegador e de um autenticador compatível com ES256.

| | Chrome | Safari | Firefox | Edge |
|---|---|---|---|---|
| **Desktop** | ✅ | ✅ macOS | ✅ (Linux: apenas chaves de segurança) | ✅ |
| **Mobile** | ✅ Android | ✅ iOS (todos os navegadores iOS usam WebKit) | ⚠️ Android parcial | ✅ Android |

| Autenticador | Suportado | Sincronizado |
|---|---|---|
| macOS Touch ID / iOS Face ID & Touch ID | ✅ | iCloud Keychain |
| Windows Hello | ✅ | Windows 11 recente |
| Biometria Android | ✅ | Google Password Manager |
| Chaves de segurança YubiKey / FIDO2 | ✅ | Vinculadas ao dispositivo |

Restrições principais: somente HTTPS (ou `localhost`), chamar o WebAuthn diretamente de um gesto do usuário (estrito no Safari) e delegar `publickey-credentials-get` / `-create` a iframes de origem cruzada. Veja **[docs/WEBAUTHN.md](docs/WEBAUTHN.md)** para a matriz completa, ressalvas, detecção de recursos e recomendações de fallback.

---

## Deploys de pré-visualização

Cada pull request recebe um deploy automático de pré-visualização no Vercel do sandbox **try-online**:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/dark-princezz/stellar-hooks)

Os revisores podem **navegar pelos exemplos ao vivo** sem fazer checkout do código localmente! As URLs de pré-visualização seguem o padrão:
```
https://stellar-hooks-git-<branch-name>.vercel.app
```

---

## Processo de release

Este repositório usa Changesets para geração automatizada de changelog, bumps de versionamento e publicação no npm.

- Use `npm run changeset` para adicionar uma nota de release ao seu PR.
- Após um changeset ser mesclado no `main`, o workflow de release do GitHub Actions publicará o pacote automaticamente.
- Para habilitar a publicação automática, adicione `NPM_TOKEN` aos secrets do repositório.

---

## Roadmap

Acompanhe o desenvolvimento ativo e as próximas funcionalidades no nosso **[GitHub Projects Roadmap Board](https://github.com/dark-princezz/stellar-hooks/projects)** e nos **[GitHub Milestones](https://github.com/dark-princezz/stellar-hooks/milestones)**. Para uma detalhagem dos itens planejados, veja [`ROADMAP.md`](ROADMAP.md).

### Entregues

- [x] `useFreighter()` — conexão de carteira Freighter, assinatura e `signMessage`
- [x] `useWalletKit()` / `useWalletsKit()` / `useWalletConnect()` — adaptadores multi-carteira (Freighter, Lobstr, xBull, Albedo)
- [x] `useStellarAccount()` / `useStellarAccounts()` / `useStellarBalance()` — leitura de contas e saldos
- [x] `useTransaction()` / `useStellarTransaction()` — envio e polling de transações
- [x] `usePayment()` — construção, assinatura e envio de pagamentos clássicos
- [x] `usePathPayment()` — pagamentos por caminho strict send / strict receive
- [x] `useClaimableBalance()` — criação e resgate de claimable balances
- [x] `useTrustline()` / `useTrustlines()` — leitura e gestão de trustlines
- [x] `useSorobanContract()` / `useLedgerEntry()` / `useSorobanServer()` — chamadas de contrato Soroban e leituras brutas de ledger
- [x] `useContractEvents()` — polling de eventos de contrato Soroban via RPC
- [x] `useContractId()` — derivação de ID de contrato a partir de um descritor de ativo
- [x] `useOrderBook()` / `useOffers()` / `useTrades()` / `useStrictSendPaths()` — dados da DEX
- [x] `useLiquidityPool()` / `useAccountLiquidityPositions()` — dados de pool de liquidez
- [x] `useStellarToml()` — busca e análise de `stellar.toml` (SEP-1)
- [x] `useMultiSig()` — coleta de assinaturas multisig e submissão
- [x] `useNetworkStatus()` / `useFeeStats()` — saúde da rede e estatísticas de taxas
- [x] Pacotes adaptadores React Query e SWR
- [x] Overlay de atividade de hooks (devtools)

### Planejados por milestone

#### Milestone `v0.3.0` — Soroban avançado e integrações com o ecossistema
- [ ] `useFederation()` — resolução de endereço federado SEP-2
- [ ] `useWebAuth()` — autenticação challenge/response SEP-10
- [ ] `useAllowance()` — gestão de allowance de tokens Soroban
- [ ] `useContractEvents()` v2 — assinatura e filtros de eventos RPC aprimorados

#### Milestone `v0.4.0` — Suporte multiplataforma e streaming
- [ ] `useAnchorTransfer()` — fluxos de depósito e saque SEP-6 / SEP-24
- [ ] `useAnchorQuote()` — cotações firmes SEP-38
- [ ] Variantes em streaming (SSE) para hooks de conta, operação e efeito
- [ ] Suporte a React Native para os hooks de carteira

#### Milestone `v1.0.0` — Prontidão para produção e estabilização da API
- [ ] Taxonomia universal de erros de transação
- [ ] 100% de cobertura de testes nos fluxos críticos de transação
- [ ] Verificação de tipagem TypeScript estrita e declaration maps

## Privacidade e dados de rede

### Quais dados a biblioteca envia pela rede?

**Nada além dos endpoints Horizon e Soroban RPC que você configurar.**

O `stellar-hooks` **não** inclui telemetria, análise, reporte de erros ou rastreamento de terceiros. A biblioteca faz requisições de rede **apenas** aos endpoints que você especifica via `<StellarProvider network="…">` ou uma configuração personalizada:

| Tipo de endpoint | Configurado via | Usado por |
|---|---|---|
| **API REST do Horizon** | `horizonUrl` no `<StellarProvider>` ou predefinição de rede | Conta, saldo, efeitos, operações, negociações, livro de ofertas, pagamentos, caminhos, pools de liquidez, streaming |
| **Soroban RPC** | `sorobanRpcUrl` no `<StellarProvider>` ou predefinição de rede | Simulação de contratos, invocação, eventos, leituras de entrada de ledger |

Nenhuma outra chamada de saída é feita. Especificamente:

- ❌ Sem SDKs de análise ou telemetria (sem Sentry, PostHog, Amplitude, Mixpanel etc.)
- ❌ Sem chamadas de reporte de erros para fora
- ❌ Sem `navigator.sendBeacon()` ou endpoints de ping em segundo plano
- ❌ Sem downloads de configuração remota ou feature flags
- ❌ Sem telemetria de carteira — as interações com carteiras vão diretamente pela própria API do provedor da carteira (ex.: `window.freighter` do Freighter)

Todo o tráfego de rede origina-se de instâncias `Horizon.Server` e `rpc.Server` do [`@stellar/stellar-sdk`](https://github.com/stellar/js-stellar-sdk), que são construídas exclusivamente a partir das URLs que você fornece. As instâncias de servidor são memoizadas por URL (veja `src/utils/memoizedServers.ts`) e nunca são hardcodizadas para nenhum host de terceiros.

### Predefições de rede

As predefições incorporadas resolvem para a infraestrutura pública oficial do Stellar:

| Rede | URL do Horizon | URL do Soroban RPC |
|---|---|---|
| `testnet` | `https://horizon-testnet.stellar.org` | `https://soroban-testnet.stellar.org` |
| `mainnet` | `https://horizon.stellar.org` | `https://mainnet.sorobanrpc.com` |
| `futurenet` | `https://horizon-futurenet.stellar.org` | `https://rpc-futurenet.stellar.org` |

Você pode sobrescrever qualquer uma delas com uma configuração personalizada a qualquer momento.

### Verifique você mesmo

Para auditar as requisições de saída na sua aplicação, use a aba **Network** das DevTools do seu navegador ou envoltura `globalThis.fetch` em um ambiente de teste. Você deve ver apenas requisições para as URLs de Horizon e Soroban RPC que você configurou.

---

## Perguntas frequentes

### Quais redes Stellar são suportadas?

`testnet` (padrão), `mainnet`, `futurenet` e qualquer rede personalizada via o modo `custom` com a prop `customConfig` no `<StellarProvider>`.

### Preciso instalar `@stellar/stellar-sdk` separadamente?

Não — ele é distribuído como dependência direta. Você só precisa instalá-lo separadamente se precisar de uma versão diferente da empacotada.

### Preciso do Freighter para usar estes hooks?

A maioria dos hooks que interagem com contas de usuário (`useFreighter`, `useSorobanContract`, `useStellarBalance` etc.) depende de uma carteira conectada via Freighter. `useStellarAccount` e `useLedgerEntry` são somente leitura e funcionam sem carteira.

### Posso usar estes hooks com React Native?

`useFreighter` depende da API da extensão de navegador Freighter, então funciona apenas em ambientes web. Os demais hooks devem funcionar em qualquer lugar onde você possa executar `@stellar/stellar-sdk`.

### Qual é a diferença entre `useStellarAccount` e `useStellarBalance`?

`useStellarBalance` é um wrapper leve de `useStellarAccount` que expõe o saldo nativo de XLM no nível superior por conveniência.

### Como faço polling de mudanças de conta ou de ledger?

Tanto `useStellarAccount` quanto `useLedgerEntry` aceitam a opção `refetchInterval` (em ms). Defina como `5000` para fazer polling a cada 5 segundos, ou `0` (padrão) para desativar o polling.

### Posso usar estes hooks sem um `<StellarProvider>`?

Não — os hooks consomem a configuração do contexto do provider. Envoltura sua aplicação com `<StellarProvider>` na raiz.

---

## Licença

MIT

---

### `useTrades(publicKey, options?)`

Busca o histórico de negociações da DEX de uma dada conta Stellar pelo endpoint `/accounts/{id}/trades` do Horizon.
Suporta filtragem opcional por par de ativos e paginação por cursor.

```ts
import { useTrades } from "stellar-hooks";
import { Asset } from "@stellar/stellar-sdk";

// Basic usage — account trade history
const {
  trades,        // TradeRecord[]
  isLoading,     // boolean
  error,         // Error | null
  lastFetchedAt, // Date | null
  refetch,       // () => Promise<void>
} = useTrades("G...", {
  limit: 20,              // default: 10
  order: "desc",          // default: "desc"
  cursor: "12345",        // optional, for pagination
  refetchInterval: 10000, // optional, poll every 10 s
});

// With asset pair filter
const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const { trades } = useTrades("G...", {
  baseAsset: Asset.native(),
  counterAsset: new Asset("USDC", USDC_ISSUER),
});
```

Cada `TradeRecord` expõe: `id`, `ledger_close_time`, `base_amount`, `base_asset_type`,
`counter_amount`, `counter_asset_type`, `base_is_seller`, `price`, e mais.

---

### `useOrderBook(selling, buying, options?)`

Consulta o livro de ofertas da DEX do Stellar para um par de ativos venda/compra.
Suporta tanto o XLM nativo quanto qualquer ativo emitido. Opcionalmente faz polling em `refetchInterval` para cotações ao vivo.

```ts
import { useOrderBook } from "stellar-hooks";
import { Asset } from "@stellar/stellar-sdk";

const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

function SwapPriceDisplay() {
  const { bids, asks, isLoading, error, refetch } = useOrderBook(
    Asset.native(),
    new Asset("USDC", USDC_ISSUER),
    { limit: 10, refetchInterval: 5000 },
  );

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Error: {error.message}</p>;

  const bestBid = bids[0]?.price ?? "—";
  const bestAsk = asks[0]?.price ?? "—";

  return (
    <div>
      <p>Best Bid: {bestBid} USDC</p>
      <p>Best Ask: {bestAsk} USDC</p>
    </div>
  );
}
```

| Propriedade | Tipo | Descrição |
|----------|------|-------------|
| `bids` | `OrderBookLevel[]` | Níveis de preço do lado de compra (mais alto primeiro) |
| `asks` | `OrderBookLevel[]` | Níveis de preço do lado de venda (mais baixo primeiro) |
| `raw` | `OrderBookRecord \| null` | Resposta bruta completa do Horizon |
| `isLoading` | `boolean` | `true` enquanto busca |
| `error` | `Error \| null` | Último erro de busca |
| `lastFetchedAt` | `Date \| null` | Marca temporal da última busca bem-sucedida |
| `refetch` | `() => Promise<void>` | Dispara uma nova busca manualmente |

---

### `useStrictSendPaths(sourceAsset, sourceAmount, destinationAssets, options?)`

Descobre caminhos de pagamento disponíveis e taxas de câmbio pelo endpoint `/paths/strict-send` do Horizon
antes de o usuário confirmar uma troca. Consulta novamente automaticamente quando os inputs mudam, com um
debounce configurável (padrão **300 ms**).

```ts
import { useStrictSendPaths } from "stellar-hooks";
import { Asset } from "@stellar/stellar-sdk";

const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

function SwapRatePreview({ sendAmount }: { sendAmount: string }) {
  const { paths, isLoading, error } = useStrictSendPaths(
    Asset.native(),
    sendAmount,
    [new Asset("USDC", USDC_ISSUER)],
    { debounceMs: 300 }, // default
  );

  if (isLoading) return <p>Finding best rate…</p>;
  if (error) return <p>Error: {error.message}</p>;

  const best = paths[0];
  if (!best) return <p>No paths found.</p>;

  return (
    <p>
      Send {best.source_amount} XLM → Receive ~{best.destination_amount} USDC
    </p>
  );
}
```

| Opção | Tipo | Padrão | Descrição |
|--------|------|---------|-------------|
| `debounceMs` | `number` | `300` | Atraso em ms antes de consultar novamente quando os inputs mudam |
| `enabled` | `boolean` | `true` | Defina como `false` para desativar a busca |

| Valor de retorno | Tipo | Descrição |
|---|---|---|
| `paths` | `PathRecord[]` | Caminhos disponíveis ordenados pelo Horizon (melhor primeiro) |
| `isLoading` | `boolean` | `true` enquanto uma consulta está em andamento |
| `error` | `Error \| null` | Último erro de busca |
| `lastFetchedAt` | `Date \| null` | Marca temporal da última busca bem-sucedida |

---

### `useStellarToml(domain, options?)`

Busca e analisa o arquivo `stellar.toml` de um domínio via o resolver do [SEP-1](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0001.md).
O documento completo analisado é retornado como `data`, com os campos bem conhecidos mais usados promovidos
ao nível superior. Os resultados são cacheados por domínio por **5 minutos** por padrão.

```tsx
import { useStellarToml } from "stellar-hooks";

function AnchorInfo() {
  const {
    data,
    federationServer,
    signingKey,
    currencies,
    documentation,
    isLoading,
    error,
  } = useStellarToml("stellar.org");

  if (isLoading) return <p>Loading stellar.toml…</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <h3>{documentation?.ORG_NAME ?? "Unknown org"}</h3>
      <p>Federation: {federationServer ?? "not published"}</p>
      <p>Signing key: {signingKey ?? "none"}</p>
      <ul>
        {currencies.map((c) => (
          <li key={`${c.code}-${c.issuer}`}>{c.code}</li>
        ))}
      </ul>
      <p>Version: {data?.VERSION}</p>
    </div>
  );
}
```

| Opção | Tipo | Padrão | Descrição |
|--------|------|---------|-------------|
| `cacheTTL` | `number` | `300000` | Tempo de vida do cache em ms para o documento resolvido |
| `allowHttp` | `boolean` | `false` | Permite resolver sobre HTTP simples em vez de HTTPS |
| `timeout` | `number` | padrão do SDK | Timeout da requisição em ms repassado ao resolver |

| Valor de retorno | Tipo | Descrição |
|---|---|---|
| `data` | `StellarTomlData \| null` | Documento completo analisado; campos não listados via index signature |
| `federationServer` | `string \| null` | `FEDERATION_SERVER` (SEP-2) |
| `signingKey` | `string \| null` | `SIGNING_KEY` usado para verificar as assinaturas do domínio |
| `webAuthEndpoint` | `string \| null` | `WEB_AUTH_ENDPOINT` (SEP-10) |
| `transferServer` | `string \| null` | `TRANSFER_SERVER` (SEP-6) |
| `kycServer` | `string \| null` | `KYC_SERVER` (SEP-12) |
| `networkPassphrase` | `string \| null` | `NETWORK_PASSPHRASE` na qual o domínio opera |
| `currencies` | `StellarTomlCurrency[]` | Entradas `[[CURRENCIES]]`, array vazio quando ausente |
| `documentation` | `StellarTomlDocumentation \| null` | Metadados de organização `[DOCUMENTATION]` |
| `isLoading` | `boolean` | `true` enquanto o documento está sendo resolvido |
| `error` | `Error \| null` | Último erro de resolução |
| `refetch` | `() => Promise<void>` | Força uma nova busca, ignorando o cache |

Passar `null` ou `undefined` como domínio mantém o hook ocioso e limpa qualquer resultado anterior.
