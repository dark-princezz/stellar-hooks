// ─── SWR-powered read hooks ──────────────────────────────────────────────────
/**
 * @file index.ts
 * @description Entry point for the @stellar-hooks/swr package.
 * @package @stellar-hooks/swr
 * @license MIT
 */

export { useStellarAccount } from "./hooks/useStellarAccount";
export type { UseStellarAccountSWROptions } from "./hooks/useStellarAccount";

export { useStellarBalance } from "./hooks/useStellarBalance";

export { useStellarOffers } from "./hooks/useStellarOffers";
export type { UseStellarOffersSWROptions } from "./hooks/useStellarOffers";

export { useStellarToml } from "./hooks/useStellarToml";
export type {
  StellarTomlData,
  UseStellarTomlSWROptions,
} from "./hooks/useStellarToml";

export { useLedgerEntry } from "./hooks/useLedgerEntry";
export type { UseLedgerEntrySWROptions } from "./hooks/useLedgerEntry";

export { useContractEvents } from "./hooks/useContractEvents";
export type {
  ContractEvent,
  UseContractEventsSWROptions,
} from "./hooks/useContractEvents";

export { useClaimableBalances } from "./hooks/useClaimableBalances";
export type {
  ClaimableBalanceRecord,
  UseClaimableBalancesSWROptions,
} from "./hooks/useClaimableBalances";

export { useAssetMetadata } from "./hooks/useAssetMetadata";
export type { AssetMetadata } from "./hooks/useAssetMetadata";

// ─── Re-exports from stellar-hooks (convenience) ────────────────────────────
// Mutation hooks don't benefit from SWR — re-export them directly so users
// don't need to install the core package separately for these.
export {
  StellarProvider,
  StellarHooksProvider,
  useFreighter,
  useSorobanContract,
  useTransaction,
  usePayment,
  usePathPayment,
} from "stellar-hooks";

// Re-export commonly used types
export type {
  StellarNetwork,
  NetworkConfig,
  StellarAccountData,
  StellarBalance,
  FreighterState,
  UseFreighterReturn,
  TransactionStatus,
  TransactionState,
  ContractCallOptions,
  UseContractCallReturn,
  StellarContextValue,
  StellarHooksProviderProps,
} from "stellar-hooks";

export const packageName = "@stellar-hooks/swr";
