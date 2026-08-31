/**
 * @file capabilities.ts
 * @description Wallet capability utilities for stellar-hooks.
 *
 * Provides helper functions to check wallet capabilities without
 * requiring the full WalletAdapter interface.
 */

import type { WalletInfo } from "./types";

/**
 * Checks if a wallet supports transaction signing.
 *
 * @param wallet - Wallet info object
 * @returns `true` if the wallet supports `signTransaction`
 *
 * @example
 * ```ts
 * const wallet = useWallet().wallets.find(w => w.id === "freighter");
 * if (wallet && supportsTransactionSigning(wallet)) {
 *   // Safe to call signTransaction
 * }
 * ```
 */
export function supportsTransactionSigning(wallet: WalletInfo): boolean {
  return true; // All wallets in stellar-hooks support signTransaction
}

/**
 * Checks if a wallet supports message signing.
 *
 * @param wallet - Wallet info object
 * @returns `true` if the wallet supports `signMessage`
 *
 * @example
 * ```ts
 * const { wallets, signMessage } = useWallet();
 * const freighter = wallets.find(w => w.id === "freighter");
 *
 * if (freighter && supportsMessageSigning(freighter)) {
 *   await signMessage("Hello Stellar");
 * }
 * ```
 */
export function supportsMessageSigning(wallet: WalletInfo): boolean {
  return wallet.meta.supportsSignMessage;
}

/**
 * Checks if a wallet supports Soroban authorization entry signing.
 *
 * @param wallet - Wallet info object
 * @returns `true` if the wallet supports `signAuthEntry`
 *
 * @example
 * ```ts
 * const { wallets, signAuthEntry } = useWallet();
 * const albedo = wallets.find(w => w.id === "albedo");
 *
 * if (albedo && supportsAuthEntrySigning(albedo)) {
 *   await signAuthEntry(entryXdr);
 * }
 * ```
 */
export function supportsAuthEntrySigning(wallet: WalletInfo): boolean {
  return wallet.meta.supportsSignAuthEntry;
}

/**
 * Returns an array of wallet IDs that support a specific capability.
 *
 * @param wallets - Array of wallet info objects
 * @param capability - The capability to filter by
 * @returns Array of wallet IDs supporting the capability
 *
 * @example
 * ```ts
 * const { wallets } = useWallet();
 * const signers = getWalletsWithCapability(wallets, "signMessage");
 * // Returns wallet IDs that support message signing
 * ```
 */
export function getWalletsWithCapability(
  wallets: WalletInfo[],
  capability: "signTransaction" | "signMessage" | "signAuthEntry",
): WalletInfo[] {
  switch (capability) {
    case "signTransaction":
      return wallets.filter(supportsTransactionSigning);
    case "signMessage":
      return wallets.filter(supportsMessageSigning);
    case "signAuthEntry":
      return wallets.filter(supportsAuthEntrySigning);
    default:
      return [];
  }
}
