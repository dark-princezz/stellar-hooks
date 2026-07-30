export type WalletId = "freighter" | "lobstr" | "xbull" | "albedo" | "rabet";

export interface WalletAdapter {
  id: WalletId;
  name: string;
  isInstalled(): boolean;
  connect(): Promise<string>;
  disconnect(): void;
  signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string>;
  signMessage?(message: string, opts?: { accountToSign?: string }): Promise<string>;
  signAuthEntry?(entryPreimageXdr: string): Promise<string>;
}
