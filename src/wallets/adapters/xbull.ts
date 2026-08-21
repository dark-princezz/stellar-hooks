/**
 * @file xbull.ts
 * @description Wallet adapter for xBull integration with useWalletKit.
 * @package stellar-hooks
 * @license MIT
 */

import type { WalletAdapter, WalletId } from "../types";

interface XBullSDK {
  connect(): Promise<string>;
  sign(opts: { xdr: string; network?: string }): Promise<string | { signedXdr: string }>;
}

function getXBullSDK(): XBullSDK | undefined {
  return typeof window !== "undefined"
    ? (window as unknown as { xBullSDK?: XBullSDK }).xBullSDK
    : undefined;
}

export class XBullWalletAdapter implements WalletAdapter {
  id: WalletId = "xbull";
  name = "xBull";

  isInstalled(): boolean {
    return getXBullSDK() !== undefined;
  }

  async connect(): Promise<string> {
    const xbull = getXBullSDK();
    if (!xbull) {
      throw new Error("xBull extension is not installed.");
    }
    return await xbull.connect();
  }

  disconnect(): void {
    // Stateless disconnect
  }

  async signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string> {
    const xbull = getXBullSDK();
    if (!xbull) {
      throw new Error("xBull extension is not installed.");
    }
    const signed = await xbull.sign({
      xdr,
      ...(opts?.networkPassphrase && { network: opts.networkPassphrase }),
    });
    return typeof signed === "string" ? signed : signed.signedXdr;
  }
}
