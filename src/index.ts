/**
 * @file index.ts
 * @description Main entry point for stellar-hooks library.
 * @package stellar-hooks
 * @license MIT
 */

// Provider & context
export { StellarProvider, StellarHooksProvider, useStellarContext } from "./context";
export { HookActivityOverlay } from "./devtools/HookActivityOverlay";
export type { HookActivityOverlayProps } from "./devtools/HookActivityOverlay";

// Hooks
export { useNetwork } from "./hooks/useNetwork";
export { useStellarNetwork } from "./hooks/useStellarNetwork";
export type { UseStellarNetworkReturn } from "./hooks/useStellarNetwork";
export { useFreighter } from "./hooks/useFreighter";
export { useAlbedo } from "./hooks/useAlbedo";
export type {
  AlbedoState,
  UseAlbedoOptions,
  SignAlbedoTransactionOptions,
  SignAlbedoMessageOptions,
  UseAlbedoReturn,
} from "./hooks/useAlbedo";
export { useWallet } from "./hooks/useWallet";
export type {
  WalletInfo,
  UseWalletOptions,
  UseWalletReturn,
} from "./hooks/useWallet";
export { useXBull } from "./hooks/useXBull";
export type {
  XBullState,
  UseXBullOptions,
  UseXBullReturn,
} from "./hooks/useXBull";
export { useRabet } from "./hooks/useRabet";
export type {
  RabetState,
  UseRabetOptions,
  UseRabetReturn,
} from "./hooks/useRabet";
export { useFreighterAccounts } from "./hooks/useFreighterAccounts";
export type {
  UseFreighterAccountsOptions,
  UseFreighterAccountsReturn,
} from "./hooks/useFreighterAccounts";
export { useStellarAccount, useSuspenseStellarAccount } from "./hooks/useStellarAccount";
export { useStellarAccounts } from "./hooks/useStellarAccounts";
export type {
  UseStellarAccountsOptions,
  UseStellarAccountsReturn,
} from "./hooks/useStellarAccounts";
export { useStellarBalance } from "./hooks/useStellarBalance";
export { useSorobanContract } from "./hooks/useSorobanContract";
export { useSorobanRead } from "./hooks/useSorobanRead";
export type {
  UseSorobanReadOptions,
  UseSorobanReadReturn,
} from "./hooks/useSorobanRead";
export { useTransaction } from "./hooks/useTransaction";
export type {
  UseTransactionOptions,
  UseTransactionReturn,
} from "./hooks/useTransaction";
export { useMultiOperationTransaction } from "./hooks/useMultiOperationTransaction";
export type {
  MultiOperationBuilder,
  MultiOperationInput,
  UseMultiOperationTransactionOptions,
  UseMultiOperationTransactionReturn,
} from "./hooks/useMultiOperationTransaction";
export { useLedgerEntry, useSuspenseLedgerEntry } from "./hooks/useLedgerEntry";
export { useLedgerEntries, useSuspenseLedgerEntries } from "./hooks/useLedgerEntries";
export { useStellarToml } from "./hooks/useStellarToml";
export { useAssetMetadata } from "./hooks/useAssetMetadata";
export { useStellarOffers } from "./hooks/useStellarOffers";
export { useOffers } from "./hooks/useOffers";
export type { UseOffersOptions, UseOffersReturn } from "./hooks/useOffers";
export { useOffer } from "./hooks/useOffer";
export type {
  OfferAsset,
  CreateOfferOptions,
  CancelOfferOptions,
  UseOfferHookOptions,
  UseOfferReturn,
} from "./hooks/useOffer";
export { useNetworkConfig } from "./hooks/useNetworkConfig";
export { useHorizonServer } from "./hooks/useHorizonServer";
export { useEffects } from "./hooks/useEffects";
export { usePayment } from "./hooks/usePayment";
export type {
  PaymentAsset,
  UsePaymentOptions,
  UsePaymentReturn,
} from "./hooks/usePayment";
export { useBumpSequence } from "./hooks/useBumpSequence";
export type {
  UseBumpSequenceOptions,
  UseBumpSequenceReturn,
} from "./hooks/useBumpSequence";
export { usePathPayment } from "./hooks/usePathPayment";
export type {
  PathPaymentAsset,
  UsePathPaymentOptions,
  UsePathPaymentReturn,
} from "./hooks/usePathPayment";
export { useNetworkStatus } from "./hooks/useNetworkStatus";
export type { NetworkStatus, UseNetworkStatusArgs } from "./hooks/useNetworkStatus";
export { useTransactionHistory } from "./hooks/useTransactionHistory";
export type {
  UseTransactionHistoryOptions,
  UseTransactionHistoryReturn,
} from "./hooks/useTransactionHistory";
export { useTransactionLifecycle } from "./hooks/useTransactionLifecycle";
export type {
  TransactionLifecycleStatus,
  TransactionLifecycleState,
  UseTransactionLifecycleOptions,
  UseTransactionLifecycleReturn,
} from "./hooks/useTransactionLifecycle";
export { useAccountSubscription, useSuspenseAccountSubscription } from "./hooks/useAccountSubscription";
export type {
  UseAccountSubscriptionOptions,
  UseAccountSubscriptionReturn,
  AccountSubscriptionData,
} from "./hooks/useAccountSubscription";
export { useInflation } from "./hooks/useInflation";
export type {
  UseInflationOptions,
  UseInflationReturn,
} from "./hooks/useInflation";

export { useAccountFlags } from "./hooks/useAccountFlags";
export type {
  AccountFlag,
  UseAccountFlagsOptions,
  UseAccountFlagsReturn,
} from "./hooks/useAccountFlags";
export { useTrade } from "./hooks/useTrade";
export type {
  TradeAsset,
  PlaceOfferParams,
  ModifyOfferParams,
  CancelOfferParams,
  UseTradeOptions,
  UseTradeReturn,
} from "./hooks/useTrade";

export type { UseAccountMergeOptions, UseAccountMergeReturn } from "./hooks/useAccountMerge";

export {
  useClaimableBalances,
  useClaimableBalance,
  useClaimBalance,
  useClaimableBalanceClaim,
  useCreateClaimableBalance,
  parsePredicate,
  isClaimableNow,
} from "./hooks/useClaimableBalance";
export type {
  ClaimableBalanceRecord,
  ClaimableBalancesState,
  ClaimableBalanceAsset,
  ClaimantInput,
  CreateClaimableBalanceParams,
  UseClaimBalanceOptions,
  UseClaimBalanceReturn,
  UseClaimableBalancesReturn,
  UseCreateClaimableBalanceOptions,
  UseCreateClaimableBalanceReturn,
  PredicateType,
  ParsedPredicate,
} from "./hooks/useClaimableBalance";

export { useSorobanTokenBalance } from "./hooks/useSorobanTokenBalance";
export { useWalletsKit } from "./hooks/useWalletsKit";
export { useWalletKit } from "./hooks/useWalletKit";
export type { UseWalletKitReturn } from "./hooks/useWalletKit";
export { useWalletConnect } from "./hooks/useWalletConnect";
export type {
  SorobanTokenBalanceState,
  UseSorobanTokenBalanceOptions,
} from "./hooks/useSorobanTokenBalance";

export { useMultiSig } from "./hooks/useMultiSig";
export type {
  BuildOptions,
  SignerEntry,
  Thresholds,
  UseMultiSigOptions,
  UseMultiSigReturn,
} from "./hooks/useMultiSig";

export { useMultiSigThreshold } from "./hooks/useMultiSigThreshold";
export type {
  ThresholdLevel,
  UseMultiSigThresholdOptions,
  UseMultiSigThresholdReturn,
} from "./hooks/useMultiSigThreshold";

export { useSorobanSimulate } from "./hooks/useSorobanSimulate";
export type {
  UseSorobanSimulateOptions,
  UseSorobanSimulateReturn,
} from "./hooks/useSorobanSimulate";

export { useSequenceNumber } from "./hooks/useSequenceNumber";
export type {
  UseSequenceNumberOptions,
  UseSequenceNumberReturn,
} from "./hooks/useSequenceNumber";

export { useTrustline } from "./hooks/useTrustline";
export type {
  UseTrustlineOptions,
  UseTrustlineReturn,
} from "./hooks/useTrustline";
export { useCreateAccount } from "./hooks/useCreateAccount";
export type {
  UseCreateAccountOptions,
  UseCreateAccountReturn,
} from "./hooks/useCreateAccount";

export { useAssets } from "./hooks/useAssets";
export type { UseAssetsOptions, UseAssetsReturn } from "./hooks/useAssets";

export { useAssetBalance } from "./hooks/useAssetBalance";
export type { AssetDescriptor, UseAssetBalanceReturn } from "./hooks/useAssetBalance";

export { useTrustlines } from "./hooks/useTrustlines";
export type { TrustlineAsset, UseTrustlinesReturn } from "./hooks/useTrustlines";

export { useAccountMerge } from "./hooks/useAccountMerge";

export { useSorobanServer } from "./hooks/useSorobanServer";

// Types
export type {
  // Network
  StellarNetwork,
  NetworkConfig,
  CustomNetworkConfig,
  // Account
  StellarAccountData,
  StellarBalance,
  // Wallet
  FreighterState,
  UseFreighterOptions,
  UseFreighterReturn,
  SignTransactionOptions,
  // Transactions
  TransactionStatus,
  TransactionState,
  // Contract
  ContractCallOptions,
  SorobanSimulationEstimate,
  UseContractCallReturn,
  // Ledger
  LedgerEntryState,
} from "./types";
export type { UseLedgerEntriesOptions, LedgerEntriesState } from "./hooks/useLedgerEntries";

export type {
  // Provider
  StellarProviderProps,
  StellarHooksProviderProps,
  StellarContextValue,
  HookActivitySnapshot,
  // Wallets Kit
  WalletsKitOptions,
  WalletsKitState,
  UseWalletsKitReturn,
  // WalletConnect
  WalletConnectChain,
  WalletConnectOptions,
  WalletConnectState,
  UseWalletConnectReturn,
} from "./types";

// Hook-specific Types
export type {
  StellarTomlCurrency,
  StellarTomlData,
  StellarTomlDocumentation,
  UseStellarTomlOptions,
  UseStellarTomlReturn,
} from "./hooks/useStellarToml";
export type { AssetMetadata, UseAssetMetadataReturn } from "./hooks/useAssetMetadata";

export type { UseStellarOffersOptions, UseStellarOffersReturn } from "./hooks/useStellarOffers";
export type { UseEffectsOptions, UseEffectsReturn } from "./hooks/useEffects";
export { useOperations } from "./hooks/useOperations";
export type {
  UseOperationsOptions,
  UseOperationsReturn,
} from "./hooks/useOperations";

// Network presets (useful for custom configs)
export { NETWORK_CONFIGS } from "./types";

// Wallet adapters
export type { WalletId, WalletAdapter, WalletMeta, WalletInfo } from "./wallets";
export {
  createFreighterAdapter,
  createLobstrAdapter,
  createXBullAdapter,
  createXBullWalletConnectAdapter,
  createAlbedoAdapter,
  createRabetAdapter,
  createLedgerAdapter,
  createLobstrWalletConnectAdapter,
  createAllAdapters,
  supportsTransactionSigning,
  supportsMessageSigning,
  supportsAuthEntrySigning,
  getWalletsWithCapability,
} from "./wallets";

// Utilities
export { parseAccountResponse, getCache, setCache, clearCache, getSandboxUrls, HOOK_SANDBOXES } from "./utils";
export type { HookSandboxInfo } from "./utils";

// Typed error classes
export {
  StellarHookError,
  UserRejectedError,
  FreighterNotInstalledError,
  SimulationError,
  isUserRejectionMessage,
} from "./utils/errors";

export { decodeXdr, formatXdrResult, detectXdrType } from "./utils/xdr";
export type { XdrDecodeResult } from "./utils/xdr";

export { useOfferBook } from "./hooks/useOfferBook";
export type { UseOfferBookOptions } from "./hooks/useOfferBook";

export { useContractId } from "./hooks/useContractId";
export type {
  AssetDescriptor as ContractAssetDescriptor,
  UseContractIdReturn,
} from "./hooks/useContractId";

export { useFeeStats } from "./hooks/useFeeStats";
export type {
  FeePercentile,
  FeeStats,
  UseFeeStatsOptions,
  UseFeeStatsReturn,
} from "./hooks/useFeeStats";

export { useLiquidityPool } from "./hooks/useLiquidityPool";
export type {
  LiquidityPoolReserve,
  LiquidityPoolRecord,
  PoolPrice,
  LiquidityPoolDepositParams,
  LiquidityPoolWithdrawParams,
  UseLiquidityPoolOptions,
  UseLiquidityPoolReturn,
} from "./hooks/useLiquidityPool";

export { useFeeBumpTransaction } from "./hooks/useFeeBumpTransaction";
export type {
  UseFeeBumpTransactionOptions,
  UseFeeBumpTransactionReturn,
} from "./hooks/useFeeBumpTransaction";

export { useTransactionStatus } from "./hooks/useTransactionStatus";
export type {
  TransactionStatusSnapshot,
  UseTransactionStatusOptions,
  UseTransactionStatusReturn,
} from "./hooks/useTransactionStatus";

export { useSignTransaction } from "./hooks/useSignTransaction";
export type {
  UseSignTransactionOptions,
  UseSignTransactionReturn,
} from "./hooks/useSignTransaction";

export { useAccountLiquidityPositions } from "./hooks/useAccountLiquidityPositions";
export type {
  UseAccountLiquidityPositionsOptions,
  UseAccountLiquidityPositionsReturn,
} from "./hooks/useAccountLiquidityPositions";

export { useContractEvents } from "./hooks/useContractEvents";
export type { UseContractEventsOptions } from "./hooks/useContractEvents";

export { useContractStorageEntry } from "./hooks/useContractStorageEntry";
export type {
  ContractStorageDurability,
  ContractStorageEntry,
  UseContractStorageEntryOptions,
  UseContractStorageEntryReturn,
} from "./hooks/useContractStorageEntry";

export { useSorobanEvents } from "./hooks/useSorobanEvents";
export type {
  SorobanEventsPageInfo,
  UseSorobanEventsOptions,
  UseSorobanEventsReturn,
} from "./hooks/useSorobanEvents";

export { useWasmUpload } from "./hooks/useWasmUpload";
export type {
  UseWasmUploadOptions,
  WasmUploadPhase,
  WasmUploadState,
  UseWasmUploadReturn,
} from "./hooks/useWasmUpload";

export { useContractDeploy, deriveContractId } from "./hooks/useContractDeploy";
export type {
  UseContractDeployOptions,
  ContractDeployPhase,
  ContractDeployOverrides,
  UseContractDeployReturn,
} from "./hooks/useContractDeploy";

export { useTrades } from "./hooks/useTrades";
export type {
  TradeRecord,
  UseTradesOptions,
  UseTradesReturn,
} from "./hooks/useTrades";

export { useOrderBook } from "./hooks/useOrderBook";
export type {
  OrderBookLevel,
  OrderBookRecord,
  UseOrderBookOptions,
  UseOrderBookReturn,
} from "./hooks/useOrderBook";

export { useStrictSendPaths } from "./hooks/useStrictSendPaths";
export type {
  PathRecord,
  UseStrictSendPathsOptions,
  UseStrictSendPathsReturn,
} from "./hooks/useStrictSendPaths";

export { useAssetSearch } from "./hooks/useAssetSearch";
export type {
  StellarAssetInfo,
  StellarAssetRating,
  StellarAssetTomlInfo,
  UseAssetSearchOptions,
  UseAssetSearchReturn,
} from "./hooks/useAssetSearch";

export { useXdrDecoder } from "./hooks/useXdrDecoder";
export type {
  UseXdrDecoderOptions,
  UseXdrDecoderReturn,
} from "./hooks/useXdrDecoder";

export { useWebAuth } from "./hooks/useWebAuth";
export type {
  WebAuthStatus,
  UseWebAuthOptions,
  UseWebAuthReturn,
} from "./hooks/useWebAuth";