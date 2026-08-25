/**
 * @file xbull.ts
 * @description Wallet adapter for xBull integration with useWalletKit.
 * @package stellar-hooks
 * @license MIT
 */

import type { WalletAdapter, WalletId } from "../types";
import { createXBullAdapter } from "../xbull";

export class XBullWalletAdapter implements WalletAdapter {
  id: WalletId = "xbull";
  name = "xBull";
  private adapter: WalletAdapter;

  constructor() {
    this.adapter = createXBullAdapter();
  }

  isInstalled(): boolean {
    return this.adapter.isInstalled();
  }

  async connect(): Promise<string> {
    return this.adapter.connect();
  }

  disconnect(): void {
    this.adapter.disconnect();
  }

  async signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string> {
    return this.adapter.signTransaction(xdr, opts);
  }

  async signMessage(message: string, opts?: { accountToSign?: string }): Promise<string> {
    if (!this.adapter.signMessage) throw new Error("signMessage is not supported by xBull adapter");
    return this.adapter.signMessage(message, opts);
  }

  async signAuthEntry(entryPreimageXdr: string): Promise<string> {
    if (!this.adapter.signAuthEntry) throw new Error("signAuthEntry is not supported by xBull adapter");
    return this.adapter.signAuthEntry(entryPreimageXdr);
  }
}

