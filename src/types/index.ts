/**
 * @file index.ts
 * @description Common type definitions for the stellar-hooks library.
 * @package stellar-hooks
 * @license MIT
 */

import type { Horizon, xdr, Contract } from "@stellar/stellar-sdk";
import type * as rpc from "@stellar/stellar-sdk/rpc";

// ─── Network ──────────────────────────────────────────────────────────────────

/**
 * Identifies the Stellar network to connect to.
 *
 * @example
 * ```ts
 * const network: StellarNetwork = "testnet";
 * switchNetwork("mainnet");
 * ```
 */
export type StellarNetwork = "mainnet" | "testnet" | "futurenet" | "custom";

/**
 * Endpoint configuration for a Stellar network preset.
 *
 * @example
 * ```ts
 * const config: NetworkConfig = NETWORK_CONFIGS.testnet;
 * console.log(config.horizonUrl); // "https://horizon-testnet.stellar.org"
 * ```
 */
/**
 * Network configuration for a non-custom (preset) network.
 * This is kept separate so `custom` configs remain discriminated.
 */
export interface PresetNetworkConfig {
  /** The preset network identifier (`"mainnet"`, `"testnet"`, or `"futurenet"`). */
  network: Exclude<StellarNetwork, "custom">;
  /** Horizon REST API endpoint URL for this network. */
  horizonUrl: string;
  /** Soroban RPC endpoint URL for contract simulation and submission. */
  sorobanRpcUrl: string;
  /** Stellar network passphrase used when signing transactions. */
  networkPassphrase: string;
}

/**
 * Union of preset or custom network configuration. When `network === "custom"`
 * the `CustomNetworkConfig` shape is enforced by the discriminant.
 */
export type NetworkConfig = PresetNetworkConfig | CustomNetworkConfig;

import {
  type StellarPublicKey,
  type StellarContractId,
  type StellarXdrString,
  type StellarTxHash,
  type StellarAssetIssuer,
  asPublicKey,
  asContractId,
  asXdrString,
  asTxHash,
  asAssetIssuer,
  unsafeAsPublicKey,
  unsafeAsContractId,
  unsafeAsXdrString,
  unsafeAsTxHash,
  unsafeAsAssetIssuer,
} from "./branded";

export {
  type StellarPublicKey,
  type StellarContractId,
  type StellarXdrString,
  type StellarTxHash,
  type StellarAssetIssuer,
  asPublicKey,
  asContractId,
  asXdrString,
  asTxHash,
  asAssetIssuer,
  unsafeAsPublicKey,
  unsafeAsContractId,
  unsafeAsXdrString,
  unsafeAsTxHash,
  unsafeAsAssetIssuer,
};

/**
 * Endpoint configuration for a private or self-hosted Stellar network.
 *
 * Pass this object to the `customConfig` prop when {@link StellarProviderProps.network}
 * is `"custom"`.
 *
 * @example
 * ```tsx
 * <StellarProvider
 *   network="custom"
 *   customConfig={{
 *     network: "custom",
 *     horizonUrl: "https://my-horizon.example.com",
 *     sorobanRpcUrl: "https://my-rpc.example.com",
 *     networkPassphrase: "My Network ; 2024",
 *   }}
 * >
 *   ...
 * </StellarProvider>
 * ```
 */
export interface CustomNetworkConfig {
  /** Must be `"custom"` when supplying a custom network configuration. */
  network: "custom";
  /**
   * Horizon REST API base URL for this network.
   * @example "https://my-horizon.example.com"
   */
  horizonUrl: string;
  /**
   * Soroban RPC endpoint URL for contract simulation and submission.
   * @example "https://my-rpc.example.com"
   */
  sorobanRpcUrl: string;
  /**
   * Stellar network passphrase used when signing transactions.
   * @example "My Network ; 2024"
   */
  networkPassphrase: string;
}

/**
 * Configuration options for the `useOffers` hook.
 */
export interface UseOffersOptions {
  /** Whether the hook should actively fetch data. @default true */
  enabled?: boolean;
  /** Interval in milliseconds to automatically refetch offers. */
  refetchInterval?: number;
  /** Maximum number of offer records to fetch per page. */
  limit?: number;
}

/**
 * Return value of the `useOffers` hook.
 */
export interface UseOffersReturn {
  /** Array of offer records from Horizon. */
  offers: Horizon.ServerApi.OfferRecord[];
  /** `true` while the initial fetch is in flight. */
  isLoading: boolean;
  /** Most recent fetch error, or `null`. */
  error: Error | null;
  /** Manually trigger a re-fetch of the current page. */
  refetch: () => Promise<void>;
  /** Fetch the next page of offers. */
  nextPage: () => Promise<void>;
  /** Fetch the previous page of offers. */
  prevPage: () => Promise<void>;
}

// Re-export new hook types so consumers can import from "stellar-hooks"
export type {
  TradeRecord,
  UseTradesOptions,
  UseTradesReturn,
} from "../hooks/useTrades";

export type {
  OrderBookLevel,
  OrderBookRecord,
  UseOrderBookOptions,
  UseOrderBookReturn,
} from "../hooks/useOrderBook";

export type {
  PathRecord,
  UseStrictSendPathsOptions,
  UseStrictSendPathsReturn,
} from "../hooks/useStrictSendPaths";

/**
 * Pre-configured network settings for built-in Stellar networks.
 * Use these to access Horizon URLs, Soroban RPC endpoints, and network passphrases
 * for mainnet, testnet, and futurenet.
 */
export const NETWORK_CONFIGS: Record<Exclude<StellarNetwork, "custom">, NetworkConfig> = {
  mainnet: {
    network: "mainnet",
    horizonUrl: "https://horizon.stellar.org",
    sorobanRpcUrl: "https://mainnet.sorobanrpc.com",
    networkPassphrase: "Public Global Stellar Network ; September 2015",
  },
  testnet: {
    network: "testnet",
    horizonUrl: "https://horizon-testnet.stellar.org",
    sorobanRpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
  },
  futurenet: {
    network: "futurenet",
    horizonUrl: "https://horizon-futurenet.stellar.org",
    sorobanRpcUrl: "https://rpc-futurenet.stellar.org",
    networkPassphrase: "Test SDF Future Network ; October 2022",
  },
};

// ─── Account ──────────────────────────────────────────────────────────────────

/**
 * Parsed Stellar account data returned by `useStellarAccount`.
 *
 * @example
 * ```ts
 * const { account } = useStellarAccount(publicKey);
 * console.log(account?.sequence);       // "12345678"
 * console.log(account?.balances[0].balance); // "100.0000000"
 * ```
 */
export interface StellarAccountData {
  /** Stellar public key (G...) that identifies this account. */
  accountId: StellarPublicKey;
  /** All balances held by this account (native XLM + issued assets). */
  balances: StellarBalance[];
  /** Current sequence number, incremented with each transaction. */
  sequence: string;
  /** Number of sub-entries (trustlines, offers, signers, data entries) consuming base reserves. */
  subentryCount: number;
  /** Number of entries this account is being sponsored for by other accounts. */
  numSponsored: number;
  /** Number of entries this account is sponsoring for other accounts. */
  numSponsoring: number;
  /** Operation weight thresholds required for low, medium, and high security operations. */
  thresholds: {
    /** Weight required for low-security operations (e.g. AllowTrust). */
    lowThreshold: number;
    /** Weight required for medium-security operations (e.g. Payment). */
    medThreshold: number;
    /** Weight required for high-security operations (e.g. SetOptions, AccountMerge). */
    highThreshold: number;
  };
  /** Authorization flags controlling how this account's issued assets behave. */
  flags: {
    /** When true, the issuer must approve each trustline before the holder can receive the asset. */
    authRequired: boolean;
    /** When true, the issuer can revoke existing trustlines to freeze assets. */
    authRevocable: boolean;
    /** When true, none of the authorization flags can ever be changed. */
    authImmutable: boolean;
    /** When true, the issuer can claw back (burn) the asset from any holder's account. */
    authClawbackEnabled: boolean;
  };
  /**
   * The original, unprocessed Horizon API response.
   * Use this to access any Horizon fields not mapped above (e.g. `data`, `signers`, `_links`).
   */
  raw: Horizon.AccountResponse;
}

/**
 * A single balance entry from a Stellar account.
 *
 * @example
 * ```ts
 * const { xlmBalance } = useStellarBalance(publicKey);
 * if (xlmBalance) {
 *   console.log(xlmBalance.balance);      // "100.0000000"
 *   console.log(xlmBalance.balanceFloat); // 100
 *   console.log(xlmBalance.isNative);     // true
 * }
 * ```
 */
export interface StellarBalance {
  /** Horizon asset type string (e.g. `"native"`, `"credit_alphanum4"`, `"credit_alphanum12"`). */
  assetType: string;
  /** Asset code (e.g. `"USDC"`). Undefined for native XLM. */
  assetCode?: string;
  /** Issuer public key (G...) for non-native assets. Undefined for native XLM. */
  assetIssuer?: StellarAssetIssuer;
  /** Balance as a numeric string with 7 decimal places (e.g. `"100.0000000"`). */
  balance: string;
  /** Balance pre-parsed as a floating-point number for convenience (e.g. `100`). */
  balanceFloat: number;
  /** Outstanding buy-side liabilities (amount reserved in open buy offers). */
  buyingLiabilities: string;
  /** Outstanding sell-side liabilities (amount reserved in open sell offers). */
  sellingLiabilities: string;
  /** Trustline limit for non-native assets. Undefined for native XLM. */
  limit?: string;
  /** `true` when this entry represents the native XLM balance. */
  isNative: boolean;
}

// ─── Wallet / Freighter ───────────────────────────────────────────────────────

/**
 * State snapshot of the Freighter browser extension wallet.
 *
 * @example
 * ```ts
 * const { isInstalled, isConnected, publicKey } = useFreighter();
 * if (!isInstalled) return <p>Install Freighter</p>;
 * if (!isConnected) return <button onClick={connect}>Connect</button>;
 * return <p>{publicKey}</p>;
 * ```
 */
export interface FreighterState {
  /** Whether the Freighter browser extension is detected in the current environment. */
  isInstalled: boolean;
  /** Whether the user has granted the dApp access to their Freighter wallet. */
  isConnected: boolean;
  /** Connected wallet's Stellar public key (G...), or `null` when not connected. */
  publicKey: StellarPublicKey | null;
  /** Network name reported by Freighter (e.g. `"TESTNET"`), or `null` when unavailable. */
  network: string | null;
  /** Network passphrase reported by Freighter, or `null` when unavailable. */
  networkPassphrase: string | null;
  /** `true` when Freighter's network passphrase differs from the app's expected network. */
  networkPassphraseMismatch: boolean;
  /** Actionable warning message when {@link networkPassphraseMismatch} is `true`; otherwise `null`. */
  networkPassphraseWarning: string | null;
  /** `true` while the initial Freighter detection or a connect/disconnect call is in progress. */
  isLoading: boolean;
  /** Most recent error from a Freighter interaction, or `null`. */
  error: Error | null;
}

/**
 * Configuration options for the `useFreighter` hook.
 */
export interface UseFreighterOptions {
  /**
   * Expected Stellar network passphrase for this dApp.
   * Defaults to the {@link StellarProvider} config when the hook runs inside the provider.
   */
  expectedNetworkPassphrase?: string;
  /**
   * When `true`, the hook checks `isAllowed()` on mount and silently
   * reconnects if the user previously granted access — no popup prompt.
   * @default false
   */
  autoConnect?: boolean;
}

/**
 * Return value of the `useFreighter` hook.
 * Extends {@link FreighterState} with wallet interaction methods.
 */
export interface UseFreighterReturn extends FreighterState {
  /** `true` while a `signMessage()` call is in flight. */
  isSigningMessage: boolean;
  /** `true` while the `autoConnect` silent-reconnect check is in flight on mount. */
  isAutoConnecting: boolean;
  /** Request wallet access from the user. Resolves when the user approves or rejects. */
  connect: () => Promise<void>;
  /** Clear the active wallet session (does not revoke permissions in Freighter itself). */
  disconnect: () => void;
  /**
   * Sign a Stellar transaction XDR with the connected Freighter wallet.
   * @example
   * ```ts
   * const signed = await signTransaction(builtXdr, { networkPassphrase });
   * ```
   */
  signTransaction: (xdr: StellarXdrString, opts?: SignTransactionOptions) => Promise<StellarXdrString>;
  /** Sign a Soroban authorization entry preimage XDR with the connected wallet. */
  signAuthEntry: (entryPreimageXdr: StellarXdrString) => Promise<StellarXdrString>;
  /** Sign an arbitrary data blob (e.g. for off-chain login proofs). */
  signBlob: (blob: string, opts?: { accountToSign?: string }) => Promise<string>;
  /**
   * Sign an arbitrary message string (e.g. for sign-in-with-Stellar flows).
   * Sets `isSigningMessage` to `true` while in flight.
   */
  signMessage: (message: string, opts?: { accountToSign?: string }) => Promise<string>;
}

/**
 * Options for signing transactions with Freighter.
 */
export interface SignTransactionOptions {
  /** Override the network passphrase used for signing (defaults to the provider's network). */
  networkPassphrase?: string;
  /** Specific account address to sign with (useful when Freighter has multiple accounts). */
  address?: string;
  /** When `true`, Freighter submits the transaction directly after signing. */
  submit?: boolean;
  /** Custom Horizon URL for Freighter to submit the transaction to. */
  submitUrl?: string;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

/**
 * Distinguishes between different categories of transaction errors.
 * Consumers can now differentiate network failures from on-chain transaction failures.
 *
 * @example
 * ```ts
 * const { error } = useTransaction(...);
 * if (error?.type === 'network') {
 *   console.error("Network issue:", error.message);
 * } else if (error?.type === 'transaction') {
 *   console.error("On-chain failure:", error.resultCode);
 * }
 * ```
 */
export type StellarTransactionError =
  | {
      /** Request never reached the network */
      type: 'network';
      /** Human-readable description of the network error. */
      message: string;
    }
  | {
      /** Transaction submitted but failed on-chain */
      type: 'transaction';
      /** Stellar result code (e.g., `"op_underfunded"`, `"tx_bad_seq"`). */
      resultCode: string;
      /** Human-readable description of the on-chain failure. */
      message: string;
    }
  | {
      /** Operation timed out before completing */
      type: 'timeout';
      /** Human-readable description of the timeout. */
      message: string;
    };

/**
 * Lifecycle stages of a Stellar transaction submission.
 *
 * @example
 * ```ts
 * const { status } = useSorobanContract("C...", { method: "increment" });
 * // "idle" → "building" → "signing" → "submitting" → "polling" → "success" | "error"
 * const isInFlight = status !== "idle" && status !== "success" && status !== "error";
 * ```
 */
export type TransactionStatus =
  | "idle"
  | "building"
  | "signing"
  | "submitting"
  | "polling"
  | "success"
  | "error";

/**
 * Generic transaction state shared by all transactional hooks.
 *
 * @example
 * ```ts
 * const { status, hash, result, error, isLoading, isSuccess, isError } = useSorobanContract(...);
 * if (isSuccess) console.log("tx hash:", hash);
 * if (isError && error?.type === 'network') console.error("Network error");
 * if (isError && error?.type === 'transaction') console.error("On-chain failure:", error.resultCode);
 * ```
 */
export interface TransactionState<TResult = unknown> {
  /** Current lifecycle stage of the transaction. */
  status: TransactionStatus;
  /** Transaction hash returned on successful submission, or `null` before submission. */
  hash: StellarTxHash | null;
  /** Parsed result value from the transaction (e.g. Soroban return value), or `null`. */
  result: TResult | null;
  /** Structured error when the transaction fails, or `null` on success. */
  error: StellarTransactionError | null;
  /** `true` while the transaction is in any in-flight stage (building, signing, submitting, or polling). */
  isLoading: boolean;
  /** `true` when the transaction has been confirmed on-chain. */
  isSuccess: boolean;
  /** `true` when the transaction has failed or an error occurred. */
  isError: boolean;
}

// ─── Soroban Contract ─────────────────────────────────────────────────────────

/**
 * Configuration options for invoking a Soroban contract method.
 */
export interface ContractCallOptions<TResult = unknown> {
  /** Soroban contract address (C...) */
  contractId: StellarContractId;
  /** Name of the Soroban contract method to invoke. */
  method: string;
  /** Arguments to pass to the contract method as ScVal values. */
  args?: xdr.ScVal[];
  /** Fee in stroops. Defaults to 100 */
  fee?: number;
  /** Timeout in seconds. Defaults to 30 */
  timeoutSeconds?: number;
  /** Custom Soroban RPC server instance. If not provided, one is created from the provider config. */
  sorobanRpcServer?: rpc.Server;
  /** Callback fired when the transaction is successfully confirmed. */
  onSuccess?: (result: TResult) => void;
  /** Callback fired when the transaction fails or an error occurs. */
  onError?: (error: StellarTransactionError) => void;
  /**
   * Optional function to parse the raw xdr.ScVal result to your desired TResult type.
   * If not provided, the raw xdr.ScVal is returned (or tx hash as fallback).
   */
  parseResult?: (scVal: xdr.ScVal) => TResult;
  /**
   * Optional optimistic result value to display immediately while the contract call is processing.
   * Automatically rolled back to previous result if the call fails.
   */
  optimisticResult?: TResult;
}

export interface SorobanSimulationEstimate {
  /** Estimated resource fee from simulation, when provided by Soroban RPC. */
  resourceFee: string | null;
  /** Estimated CPU instruction count from simulation, when provided. */
  instructions: string | number | null;
  /** Raw `cost` payload returned by Soroban RPC for advanced inspection. */
  cost: unknown | null;
}

export interface UseContractCallReturn<TResult = unknown>
  extends TransactionState<TResult> {
  /** Instantiated Stellar SDK Contract instance for this contractId, or null if invalid */
  contract: Contract | null;
  /** Execute a read-only / simulate contract call for a given method */
  read: (
    method: string,
    args?: unknown[],
    overrides?: Partial<Omit<ContractCallOptions<TResult>, "contractId">>
  ) => Promise<TResult | null>;
  /** Execute a write contract call with signing and on-chain submission */
  write: (
    method: string,
    args?: unknown[],
    overrides?: Partial<Omit<ContractCallOptions<TResult>, "contractId">>
  ) => Promise<TResult | null>;
  /** Alias to write method */
  invoke: (
    method: string,
    args?: unknown[],
    overrides?: Partial<Omit<ContractCallOptions<TResult>, "contractId">>
  ) => Promise<TResult | null>;
  /** Most recent raw simulation response captured by the hook, or `null`. */
  simulation: rpc.Api.SimulateTransactionResponse | null;
  /** Normalized fee/instruction estimate derived from the latest simulation. */
  estimatedCost: SorobanSimulationEstimate | null;
  /**
   * Execute the contract call (Simulation -> Signing -> Submission -> Polling).
   */
  call: (
    overrides?: Partial<Omit<ContractCallOptions<TResult>, "contractId">>
  ) => Promise<TResult | null>;
  /**
   * Perform a simulation-only call to read contract state without submitting a transaction.
   * Updates the hook's `result` and `status` upon success.
   */
  query: (
    overrides?: Partial<Omit<ContractCallOptions<TResult>, "contractId">>
  ) => Promise<TResult | null>;
  /**
   * Dry-run / simulate-only façade for `call`. Functionally identical to
   * `query` (both perform a `simulateTransaction` RPC call and parse the
   * retval; neither signs nor submits anything); kept under a separate
   * name so PREVIEW call sites — gas estimation, form validation, and
   * "Confirm" screens showing computed effects — read more clearly.
   *
   * Equivalent to `query`; prefer `dryRun` when the intent is to PREVIEW
   * a transaction and `query` when reading contract state is the
   * everyday path.
   */
  dryRun: (
    overrides?: Partial<Omit<ContractCallOptions<TResult>, "contractId">>
  ) => Promise<TResult | null>;
  /**
   * Perform an isolated simulation of the contract call.
   * Returns the raw RPC simulation response including footprint, resource usage, and results.
   * Does not sign or submit a transaction.
   */
  simulate: (
    overrides?: Partial<Omit<ContractCallOptions<TResult>, "contractId">>
  ) => Promise<rpc.Api.SimulateTransactionResponse>;
  reset: () => void;
}

// ─── Ledger Entry ─────────────────────────────────────────────────────────────

/**
 * State snapshot for ledger entry queries.
 * Used by hooks that fetch Soroban ledger entries via RPC.
 */
export interface LedgerEntryState {
  /** The raw ledger entry result from Soroban RPC, or `null` if not yet fetched or not found. */
  data: rpc.Api.LedgerEntryResult | null;
  /** `true` while the initial ledger entry fetch is in flight. */
  isLoading: boolean;
  /** `true` while a manual refetch (or polling tick) is in flight after the first load. */
  isRefetching: boolean;
  /** Most recent fetch error, or `null`. */
  error: Error | null;
  /** Manually trigger a re-fetch of the ledger entry. */
  refetch: () => Promise<void>;
  /** Timestamp of the most recent successful fetch, or `null` if never fetched. */
  lastFetchedAt: Date | null;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Props for the `StellarProvider` component.
 * Configures the Stellar network context for all child hooks.
 */
export interface StellarProviderProps {
  /** Built-in preset (`testnet`, `mainnet`, `futurenet`) or `"custom"` for a private network. @default "testnet" */
  network?: StellarNetwork;
  /**
   * Required when `network` is `"custom"`. Describes Horizon, Soroban RPC, and the
   * network passphrase for your deployment.
   */
  customConfig?: CustomNetworkConfig;
  children: React.ReactNode;
}

/**
 * Props for the `StellarHooksProvider` component.
 * Alternative provider with flexible network configuration options.
 */
export interface StellarHooksProviderProps {
  /** Built-in preset (`testnet`, `mainnet`, `futurenet`) or `"custom"` for a private network. @default "testnet" */
  network?: StellarNetwork | undefined;
  /** Optional custom Horizon URL to override the network default or define custom. */
  horizonUrl?: string | undefined;
  /** Optional custom Soroban RPC URL to override the network default or define custom. */
  sorobanRpcUrl?: string | undefined;
  /** Optional custom network passphrase to override the network default or define custom. */
  networkPassphrase?: string | undefined;
  /** Backward compatible custom config object. */
  customConfig?: CustomNetworkConfig | undefined;
  children: React.ReactNode;
}

/**
 * Context value provided by the Stellar provider to all child hooks.
 */
export interface StellarContextValue {
  /** Resolved network configuration (Horizon URL, Soroban RPC URL, passphrase). */
  config: NetworkConfig;
  /** Currently active network identifier. */
  network: StellarNetwork;
  /** Provider-scoped in-memory map for deduplicating in-flight requests. */
  requestCache: Map<string, Promise<unknown>>;
  /**
   * Monotonically increasing counter incremented on every network switch.
   * Hooks compare the epoch at fetch-start vs fetch-end to discard stale
   * responses from a previous network.
   */
  networkEpoch: number;
}

export interface HookActivitySnapshot {
  /** Stable internal identifier for a mounted hook instance. */
  id: string;
  /** Hook name shown in the dev overlay. */
  name: string;
  /** Current lifecycle status for the hook instance. */
  status: string;
  /** Most recent error message, if any. */
  lastError: string | null;
  /** Timestamp of the most recent state update. */
  updatedAt: Date;
}

// ─── Stellar Wallets Kit ──────────────────────────────────────────────────────

/**
 * Initialization options for the Stellar Wallets Kit.
 */
export interface WalletsKitOptions {
  /** List of wallet modules to support. Pass `defaultModules()` for all built-in wallets. */
  modules: unknown[];
  /** Pre-select a wallet by its ID (e.g. "freighter"). */
  selectedWalletId?: string;
  /** Stellar network passphrase. Defaults to the StellarProvider network. */
  network?: string;
}

/**
 * State snapshot for the Stellar Wallets Kit integration.
 */
export interface WalletsKitState {
  /** Active wallet public key, or `null` when not connected. */
  publicKey: string | null;
  /** Whether an address is currently connected. */
  isConnected: boolean;
  /** `true` while the connect (authModal) call is in-flight. */
  isConnecting: boolean;
  /** Most recent error from a wallet interaction, or `null`. */
  error: Error | null;
}

/**
 * Return value of the `useWalletsKit` hook.
 * Extends {@link WalletsKitState} with wallet interaction methods.
 */
export interface UseWalletsKitReturn extends WalletsKitState {
  /**
   * Open the Stellar Wallets Kit auth modal so the user can pick a wallet.
   * Resolves with the connected address on success.
   */
  connect: () => Promise<string | null>;
  /** Clear the active address (does not call any wallet SDK disconnect). */
  disconnect: () => void;
  /** Sign a transaction XDR with the active wallet. */
  signTransaction: (
    xdr: string,
    opts?: { networkPassphrase?: string; address?: string }
  ) => Promise<string>;
  /** Sign a Soroban auth entry with the active wallet. */
  signAuthEntry: (
    authEntry: string,
    opts?: { networkPassphrase?: string; address?: string }
  ) => Promise<string>;
  /** Sign a message/blob with the active wallet. */
  signMessage: (
    message: string,
    opts?: { networkPassphrase?: string; address?: string }
  ) => Promise<string>;
}

// ─── WalletConnect v2 ─────────────────────────────────────────────────────────

/**
 * Stellar CAIP-2 chain IDs for WalletConnect namespaces.
 */
export type WalletConnectChain = "stellar:pubnet" | "stellar:testnet";

/**
 * Initialization options for the `useWalletConnect` hook.
 */
export interface WalletConnectOptions {
  /** WalletConnect / Reown project ID from https://cloud.reown.com */
  projectId: string;
  /** App metadata shown in the wallet during connection. */
  metadata: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
  /** Stellar chain to request. Defaults to "stellar:testnet". */
  chain?: WalletConnectChain;
  /** Relay URL. Defaults to wss://relay.walletconnect.com */
  relayUrl?: string;
}

/**
 * State snapshot for the WalletConnect integration.
 */
export interface WalletConnectState {
  /** Connected Stellar public key, or `null` when not connected. */
  publicKey: string | null;
  /** Whether an active WalletConnect session exists. */
  isConnected: boolean;
  /** `true` while `connect()` is in-flight (awaiting wallet approval). */
  isConnecting: boolean;
  /** WalletConnect pairing URI — display as a QR code or deep-link while connecting. */
  uri: string | null;
  /** Most recent error from a WalletConnect interaction, or `null`. */
  error: Error | null;
}

/**
 * Return value of the `useWalletConnect` hook.
 * Extends {@link WalletConnectState} with wallet interaction methods.
 */
export interface UseWalletConnectReturn extends WalletConnectState {
  /**
   * Initiate a WalletConnect session. Resolves once the wallet approves.
   * Use the `uri` state to display the QR code/deep-link while awaiting approval.
   */
  connect: () => Promise<string | null>;
  /** Disconnect and delete the active WalletConnect session. */
  disconnect: () => Promise<void>;
  /** Sign a Stellar transaction XDR via the connected wallet. */
  signTransaction: (
    xdr: string,
    opts?: { networkPassphrase?: string }
  ) => Promise<string>;
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export {
  // Balance schemas
  BalanceLineNativeSchema,
  BalanceLineAssetSchema,
  BalanceLineLiquidityPoolSchema,
  BalanceLineSchema,
  // Account schemas
  AccountThresholdsSchema,
  AccountFlagsSchema,
  AccountSignerSchema,
  AccountResponseSchema,
  // Parsed account schemas
  StellarBalanceSchema,
  StellarAccountDataSchema,
  // Offer schemas
  OfferAssetSchema,
  OfferRecordSchema,
  OfferCollectionSchema,
  // Orderbook schemas
  OrderbookPriceLevelSchema,
  OrderbookRecordSchema,
  // Transaction schemas
  TransactionSubmissionResponseSchema,
  // Claimable balance schemas
  ClaimantPredicateSchema,
  ClaimantSchema,
  ClaimableBalanceRecordSchema,
  ClaimableBalanceCollectionSchema,
  ParsedClaimableBalanceRecordSchema,
  // Soroban RPC schemas
  SendTransactionResponseSchema,
  GetTransactionResponseSchema,
  SimulateTransactionResponseSchema,
  LedgerEntryResultSchema,
  // Network / config schemas
  StellarNetworkSchema,
  NetworkConfigSchema,
  CustomNetworkConfigSchema,
  // Stellar.toml schemas
  StellarTomlCurrencySchema,
  StellarTomlDataSchema,
  // Validation helpers
  validateHorizonResponse,
  safeValidateHorizonResponse,
} from "./schemas";

export type {
  AccountResponseParsed,
  BalanceLineParsed,
  StellarBalanceParsed,
  StellarAccountDataParsed,
  OfferRecordParsed,
  OrderbookRecordParsed,
  ClaimableBalanceRecordParsed,
  TransactionSubmissionParsed,
  SendTransactionParsed,
  GetTransactionParsed,
  NetworkConfigParsed,
} from "./schemas";
