/**
 * @file xbull.ts
 * @description Wallet adapter for xBull integration with useWalletKit.
 * @package stellar-hooks
 * @license MIT
 */

import type { WalletAdapter, WalletId } from "../types";

export class XBullWalletAdapter implements WalletAdapter {
  id: WalletId = "xbull";
  name = "xBull";

  isInstalled(): boolean {
    return typeof window !== "undefined" && (window as any).xBullSDK !== undefined;
  }

  async connect(): Promise<string> {
    const xbull = (window as any).xBullSDK;
    if (!xbull) {
      throw new Error("xBull extension is not installed.");
    }
    return await xbull.connect();
  }

  disconnect(): void {
    // Stateless disconnect
  }

  async signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string> {
    const xbull = (window as any).xBullSDK;
    if (!xbull) {
      throw new Error("xBull extension is not installed.");
    }
    const signed = await xbull.sign({
      xdr,
      network: opts?.networkPassphrase,
    });
    return typeof signed === "string" ? signed : signed?.signedXdr ?? signed;
  }
}
