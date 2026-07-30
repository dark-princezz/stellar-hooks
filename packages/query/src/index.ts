/**
 * @file index.ts
 * @description Entry point for the @stellar-hooks/query package.
 * @package @stellar-hooks/query
 * @license MIT
 */

// Hooks
export { useFreighterQuery } from "./hooks/useFreighterQuery";
export { useStellarAccountQuery } from "./hooks/useStellarAccountQuery";
export { useStellarBalanceQuery } from "./hooks/useStellarBalanceQuery";
export { useLedgerEntryQuery } from "./hooks/useLedgerEntryQuery";

// Types
export type {
  UseFreighterQueryOptions,
  UseFreighterQueryReturn,
  UseStellarAccountQueryOptions,
  UseStellarBalanceQueryOptions,
  StellarBalanceQueryData,
  UseLedgerEntryQueryOptions,
} from "./types";

// Package metadata helpers
export const packageName = "@stellar-hooks/query";
