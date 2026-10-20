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
export { DevToolsPanel } from "./devtools/DevToolsPanel";
export type { DevToolsPanelProps } from "./devtools/DevToolsPanel";

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
export type { UseStellarBalanceReturn } from "./hooks/useStellarBalance";
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

export { useProposeTransaction } from "./hooks/useProposeTransaction";
export type {
  ProposeOptions,
  TransactionProposal,
  UseProposeTransactionReturn,
} from "./hooks/useProposeTransaction";
export { exportPartialXdr, importPartialXdr, mergeSignatures, toShareLink } from "./utils/partialXdr";
export { decodeInvocationArgs } from "./utils/decodeInvocationArgs";
export type { DecodedArgument } from "./utils/decodeInvocationArgs";
export type {
  BuildOptions,
  SignerEntry,
  Thresholds,
  UseMultiSigOptions,
  UseMultiSigReturn,
} from "./hooks/useMultiSig";

export { useMultiSigThreshold } from "./hooks/useMultiSigThreshold";

export { useCollectSignatures } from "./hooks/useCollectSignatures";
export type { UseCollectSignaturesReturn } from "./hooks/useCollectSignatures";
export { getSignatureStatus, requiredThresholdLevel } from "./utils/signatureStatus";
export type { SignatureStatus, ThresholdInfo, ThresholdLevel as SignatureThresholdLevel } from "./utils/signatureStatus";
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
export { useBatchTrustline } from "./hooks/useBatchTrustline";
export type {
  BatchTrustlineAsset,
  UseBatchTrustlineOptions,
  UseBatchTrustlineReturn,
} from "./hooks/useBatchTrustline";
export { useCreateAccount } from "./hooks/useCreateAccount";
export type {
  UseCreateAccountOptions,
  UseCreateAccountReturn,
} from "./hooks/useCreateAccount";

export { useAssets } from "./hooks/useAssets";
export type { UseAssetsOptions, UseAssetsReturn } from "./hooks/useAssets";

export { useAssetBalance } from "./hooks/useAssetBalance";
export type { AssetDescriptor, UseAssetBalanceOptions, UseAssetBalanceReturn } from "./hooks/useAssetBalance";

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
  // Amounts (branded — issue #829)
  WholeUnitAmount,
  StroopAmount,
  Amount,
  // Hook state discriminated unions (issue #830)
  HookState,
  HookStateWithRefetch,
  // Wallet
  FreighterState,
  UseFreighterOptions,
  UseFreighterReturn,
  SignTransactionOptions,
  // Transactions
  TransactionStatus,
  TransactionState,
  // Lifecycle Callbacks
  BeforeSubmitContext,
  AfterSubmitContext,
  OnBeforeSubmitCallback,
  OnAfterSubmitCallback,
  WriteHookLifecycleOptions,
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

// NFT hooks (issues #987–#990)
export { useNftBalance } from "./hooks/useNftBalance";
export type {
  UseNftBalanceOptions,
  UseNftBalanceData,
  UseNftBalanceReturn,
} from "./hooks/useNftBalance";

export { useIpfsGateway, DEFAULT_IPFS_GATEWAYS } from "./hooks/useIpfsGateway";
export type {
  UseIpfsGatewayOptions,
  UseIpfsGatewayReturn,
} from "./hooks/useIpfsGateway";

export { useNftMetadata } from "./hooks/useNftMetadata";
export type {
  NftMetadata,
  UseNftMetadataOptions,
  UseNftMetadataReturn,
} from "./hooks/useNftMetadata";

export { useNftTransfer } from "./hooks/useNftTransfer";
export type {
  UseNftTransferOptions,
  NftTransferParams,
  UseNftTransferReturn,
} from "./hooks/useNftTransfer";

// Network presets (useful for custom configs)
export { NETWORK_CONFIGS } from "./types";

// Wallet adapters & plugins
export type {
  BuiltinWalletId,
  WalletId,
  WalletAdapter,
  WalletMeta,
  WalletInfo,
  WalletAdapterPlugin,
  CustomWalletAdapterInput,
  // Strict-null disconnected-state types (issue #832)
  WalletConnectionState,
  ConnectedWalletState,
  DisconnectedWalletState,
} from "./wallets";
export {
  defineWalletAdapter,
  defineWalletPlugin,
  registerWalletAdapter,
  unregisterWalletAdapter,
  getRegisteredWalletAdapters,
  clearWalletAdapterRegistry,
  resolveWalletAdapter,
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

// Outgoing transaction middleware pipeline
export {
  TransactionPipeline,
  registerTransactionMiddleware,
  unregisterTransactionMiddleware,
  getRegisteredTransactionMiddleware,
  clearTransactionMiddlewareRegistry,
  createLoggingMiddleware,
  createValidationMiddleware,
} from "./middleware";
export type {
  TransactionMiddleware,
  TransactionMiddlewareContext,
  TransactionMiddlewareNext,
  LoggingMiddlewareOptions,
} from "./middleware";

// Utilities
export {
  parseAccountResponse,
  getCache,
  setCache,
  clearCache,
  getSandboxUrls,
  HOOK_SANDBOXES,
  createMemoryCacheAdapter,
  defaultCacheAdapter,
  formatAssetAmount,
  useFormatAmount,
} from "./utils";
export type { HookSandboxInfo, CacheAdapter, FormatAssetAmountOptions } from "./utils";

// Branded type factory functions (issue #829)
export {
  asPublicKey,
  asContractId,
  asXdrString,
  asTxHash,
  asAssetIssuer,
  asWholeUnitAmount,
  asStroopAmount,
  unsafeAsPublicKey,
  unsafeAsContractId,
  unsafeAsXdrString,
  unsafeAsTxHash,
  unsafeAsAssetIssuer,
  unsafeAsWholeUnitAmount,
  unsafeAsStroopAmount,
} from "./types";

// Debug logger
export {
  DEBUG_STORAGE_KEY,
  isDebugLoggingEnabled,
  setDebugLogging,
  enableDebugLogging,
  disableDebugLogging,
  logger,
  debugLogger,
} from "./utils/logger";

// Typed error classes and error code enum
export {
  ErrorCode,
  StellarHookError,
  UserRejectedError,
  FreighterNotInstalledError,
  WalletNotConnectedError,
  WalletNotInstalledError,
  TransactionFailedError,
  TransactionTimeoutError,
  NetworkError,
  SimulationError,
  isUserRejectionMessage,
} from "./utils/errors";
export type { ErrorCodeType } from "./utils/errors";

// Internationalized (i18n) error strings
export {
  DEFAULT_ERROR_STRINGS,
  getErrorString,
  setErrorStrings,
  getErrorStrings,
  resetErrorStrings,
  formatErrorTemplate,
} from "./utils/errorStrings";
export type { ErrorStrings, ErrorStringKey } from "./utils/errorStrings";

export { decodeXdr, formatXdrResult, detectXdrType } from "./utils/xdr";
export type { XdrDecodeResult } from "./utils/xdr";

export {
  filterHistory,
  historyToCsv,
  historyToJson,
  normalizeOperation,
  HISTORY_CSV_COLUMNS,
  HISTORY_JSON_SCHEMA,
  HISTORY_JSON_SCHEMA_VERSION,
} from "./utils/historyExport";
export type { HistoryFilter, NormalizedHistoryEntry } from "./utils/historyExport";

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

export { useLedgerInfo } from "./hooks/useLedgerInfo";
export type {
  LedgerInfo,
  UseLedgerInfoOptions,
  UseLedgerInfoReturn,
} from "./hooks/useLedgerInfo";

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

export { useSorobanEventFilter } from "./hooks/useSorobanEventFilter";
export type {
  SorobanEventFilterPreset,
  UseSorobanEventFilterOptions,
  UseSorobanEventFilterReturn,
} from "./hooks/useSorobanEventFilter";

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

export { useCurrencyDisplay } from "./hooks/useCurrencyDisplay";
export type {
  UseCurrencyDisplayOptions,
  UseCurrencyDisplayReturn,
} from "./hooks/useCurrencyDisplay";

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

export {
  useAnchorTransactionStatus,
  isTerminalAnchorStatus,
  TERMINAL_ANCHOR_STATUSES,
} from "./hooks/useAnchorTransactionStatus";
export type {
  AnchorTransaction,
  AnchorTransactionStatus,
  UseAnchorTransactionStatusOptions,
  UseAnchorTransactionStatusReturn,
} from "./hooks/useAnchorTransactionStatus";

export { useKycStatus, extractMissingKycFields } from "./hooks/useKycStatus";
export type {
  KycStatus,
  KycField,
  KycProvidedField,
  KycMissingField,
  KycCustomerResponse,
  UseKycStatusOptions,
  UseKycStatusReturn,
} from "./hooks/useKycStatus";

export { useProposals } from "./hooks/useProposals";
export type {
  Proposal,
  ProposalStatus,
  VoteTallies,
  UseProposalsOptions,
  UseProposalsReturn,
} from "./hooks/useProposals";

export { useVote } from "./hooks/useVote";
export type {
  VoteSupport,
  CastVoteParams,
  UseVoteOptions,
  UseVoteReturn,
} from "./hooks/useVote";

// Storage adapter utilities (#840)
export {
  createLocalStorageAdapter,
  createNullStorageAdapter,
  createAsyncStorageAdapter,
  resolveStorageItem,
} from "./utils/storageAdapter";
export type { StorageAdapter } from "./utils/storageAdapter";

// Wallet utilities
export {
  registerWalletAdapter,
  unregisterWalletAdapter,
  getRegisteredWalletAdapters,
  clearWalletAdapterRegistry,
  resolveWalletAdapter,
  defineWalletAdapter,
  defineWalletPlugin,
  createAllAdapters,
  // Deep-link / mobile wallet adapter (#839)
  createDeepLinkWalletAdapter,
  buildSep7TxUri,
  buildSep7PayUri,
} from "./wallets";
export type {
  WalletId,
  WalletAdapter,
  WalletMeta,
  WalletInfo,
  WalletAdapterPlugin,
  DeepLinkWalletConfig,
} from "./wallets";

// Governance hooks
export { useVotingPower } from "./hooks/useVotingPower";
export type {
  VotingPowerState,
  UseVotingPowerOptions,
} from "./hooks/useVotingPower";


// UI Components (#995, #996, #997)
export { FormattedBalance } from "./components/FormattedBalance";
export type { FormattedBalanceProps } from "./components/FormattedBalance";

export { TransactionStatusBadge } from "./components/TransactionStatusBadge";
export type { TransactionStatusBadgeProps } from "./components/TransactionStatusBadge";

export { StellarThemeProvider, applyStellarTheme, CSS_VARIABLE_REFERENCE } from "./components/theme";
export type {
  StellarThemeColors,
  StellarThemeTokens,
  StellarThemeProviderProps,
} from "./components/theme";

// Passkey smart accounts (#974, #975, #978)
export { usePasskeyRegister } from "./hooks/usePasskeyRegister";
export type {
  PasskeyCredential,
  PasskeyRegisterParams,
  PasskeyRegisterResult,
  UsePasskeyRegisterOptions,
  UsePasskeyRegisterReturn,
} from "./hooks/usePasskeyRegister";

export { usePasskeySign } from "./hooks/usePasskeySign";
export type { UsePasskeySignOptions, UsePasskeySignReturn } from "./hooks/usePasskeySign";

export {
  useRecoverySigners,
  totalRecoveryWeight,
  previewRecoverySignerRemoval,
} from "./hooks/useRecoverySigners";
export type {
  RecoverySigner,
  RecoveryWarning,
  RecoveryRemovalPreview,
  RemoveRecoverySignerResult,
  UseRecoverySignersOptions,
  UseRecoverySignersReturn,
} from "./hooks/useRecoverySigners";

export {
  signAuthEntry,
  hashAuthEntry,
  verifyClientDataChallenge,
  formatPasskeySignature,
  derToCompactSignature,
  extractP256PublicKey,
  deriveSmartAccountSalt,
  deriveSmartAccountAddress,
  prepareAndSubmit,
  buildInvokeTransaction,
  authEntriesFor,
} from "./utils/passkey";
export type {
  PasskeyAssertion,
  SignAuthEntryOptions,
  PasskeyFeePayer,
  InvokeContractParams,
  SubmitSorobanResult,
} from "./utils/passkey";
// Anchor (SEP-1 / SEP-24) hooks (#979, #980, #981)
export { useAnchorInfo, stellarTomlUrl } from "./hooks/useAnchorInfo";
export type { UseAnchorInfoOptions, UseAnchorInfoReturn } from "./hooks/useAnchorInfo";

export { useAnchorDeposit } from "./hooks/useAnchorDeposit";
export type {
  AnchorDepositParams,
  UseAnchorDepositOptions,
  UseAnchorDepositReturn,
} from "./hooks/useAnchorDeposit";

export { useAnchorWithdraw, parseSep38Asset, sep24Memo } from "./hooks/useAnchorWithdraw";
export type {
  AnchorWithdrawParams,
  AnchorWithdrawTransaction,
  BuildWithdrawalPaymentParams,
  WithdrawalPayment,
  UseAnchorWithdrawOptions,
  UseAnchorWithdrawReturn,
} from "./hooks/useAnchorWithdraw";

export type { Sep24InteractiveParams, Sep24InteractiveResponse } from "./utils/sep24";
export { parseStellarToml } from "./utils/parseStellarToml";

export { useTokenBalance } from "./hooks/useTokenBalance";
export type {
  UseTokenBalanceOptions,
  UseTokenBalanceReturn,
} from "./hooks/useTokenBalance";

export { useTokenTransfer } from "./hooks/useTokenTransfer";
export type {
  UseTokenTransferOptions,
  UseTokenTransferReturn,
  TokenTransferParams,
} from "./hooks/useTokenTransfer";

export { useTokenAllowance } from "./hooks/useTokenAllowance";
export type {
  UseTokenAllowanceOptions,
  UseTokenAllowanceReturn,
} from "./hooks/useTokenAllowance";

export { useNotificationPermission } from "./hooks/useNotificationPermission";
export type {
  NotificationPermissionState,
  UseNotificationPermissionOptions,
  UseNotificationPermissionReturn,
} from "./hooks/useNotificationPermission";

export { formatTokenAmount, parseTokenAmount, DEFAULT_TOKEN_DECIMALS } from "./utils/tokenAmount";

export { useFederationLookup } from "./hooks/useFederationLookup";
export type { UseFederationLookupReturn } from "./hooks/useFederationLookup";
export { resolveFederationAddress, reverseFederationLookup, isFederationAddress } from "./utils/federation";
export type { FederationRecord, FederationOptions } from "./utils/federation";

export { useMuxedAccount } from "./hooks/useMuxedAccount";
export type { UseMuxedAccountReturn } from "./hooks/useMuxedAccount";
export { createMuxedAddress, parseMuxedAddress, isMuxedAddress } from "./utils/muxedAccount";
export type { ParsedMuxedAddress } from "./utils/muxedAccount";

export { useAddressBook } from "./hooks/useAddressBook";
export type { UseAddressBookOptions, UseAddressBookReturn } from "./hooks/useAddressBook";
export { AddressBookStore } from "./utils/addressBook";
export type { AddressBookEntry } from "./utils/addressBook";
export {
  initialWalletState,
  walletActions,
  walletReducer,
  walletSelectors,
} from "./integrations/walletState";
export type { WalletState, WalletStatus, WalletBalance, WalletAction } from "./integrations/walletState";
export { createWalletStore } from "./integrations/zustand";
export type { WalletStore } from "./integrations/zustand";
export { createWalletAtoms } from "./integrations/jotai";
export { walletSlice, walletRootSelectors } from "./integrations/redux";
export { useSyncWalletState } from "./hooks/useSyncWalletState";
export type { UseSyncWalletStateOptions } from "./hooks/useSyncWalletState";
