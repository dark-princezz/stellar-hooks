/**
 * @file lobstr.ts
 * @description Wallet adapter for LOBSTR integration with useWalletKit.
 * @package stellar-hooks
 * @license MIT
 */

import type { WalletAdapter, WalletId } from "../types";

export class LobstrWalletAdapter implements WalletAdapter {
  id: WalletId = "lobstr";
  name = "LOBSTR";

  isInstalled(): boolean {
    return typeof window !== "undefined" && (window as any).lobstr !== undefined;
  }

  async connect(): Promise<string> {
    const lobstrProvider = (window as any).lobstr;
    if (!lobstrProvider) {
      throw new Error("LOBSTR extension is not installed.");
    }
    const res = await lobstrProvider.getPublicKey();
    return typeof res === "string" ? res : res?.publicKey;
  }

  disconnect(): void {
    // Stateless disconnect for extension
  }

  async signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string> {
    const lobstrProvider = (window as any).lobstr;
    if (!lobstrProvider) {
      throw new Error("LOBSTR extension is not installed.");
    }
    const signed = await lobstrProvider.signTransaction(xdr, opts);
    return typeof signed === "string" ? signed : signed?.signedTxXdr;
  }
}
