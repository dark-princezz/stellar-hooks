/**
 * Ledger hardware wallet adapter for useWallet (#638).
 *
 * Signs Stellar transactions via @ledgerhq/hw-app-str over WebUSB/WebHID.
 * Unlike software wallets, Ledger requires a physical device — the user must
 * have the Stellar app open on the device before calling connect().
 *
 * SIGNING FLOW DIFFERENCES FROM SOFTWARE WALLETS:
 * - No "isInstalled" check beyond WebUSB/WebHID availability.
 * - connect() opens a transport and reads the public key at the default path.
 * - signTransaction() sends the full XDR to the device for on-screen review.
 * - signMessage() and signAuthEntry() are NOT supported by the Stellar Ledger app.
 *
 * PREREQUISITE:
 *   npm install @ledgerhq/hw-transport-webusb @ledgerhq/hw-app-str
 */
import type { WalletAdapter } from "./types";

export function createLedgerAdapter(): WalletAdapter {
  return {
    id: "ledger",
    name: "Ledger",
    meta: {
      name: "Ledger",
      description: "Sign transactions with your Ledger hardware wallet via WebUSB. Requires the Stellar app to be open on the device.",
      iconUrl: "https://cdn.ledger.com/ledger-live/images/ledger-live.png",
      installUrl: "https://www.ledger.com/ledger-live",
      supportsSignMessage: false,
      supportsSignAuthEntry: false,
    },

    isInstalled(): boolean {
      // WebUSB is the transport; available in Chrome/Edge but not Firefox/Safari.
      return typeof navigator !== "undefined" && "usb" in navigator;
    },

    async connect(): Promise<string> {
      // Dynamic import keeps @ledgerhq packages fully optional.
      const TransportWebUSB = await import(
        "@ledgerhq/hw-transport-webusb"
      ).then((m) => m.default);
      const Str = await import("@ledgerhq/hw-app-str").then((m) => m.default);

      const transport = await TransportWebUSB.create();
      const str = new Str(transport);
      const { publicKey } = await str.getPublicKey("44'/148'/0'");
      return publicKey;
    },

    disconnect(): void {
      // Transport is opened per-operation; nothing to persist.
    },

    async signTransaction(xdr: string): Promise<string> {
      const TransportWebUSB = await import(
        "@ledgerhq/hw-transport-webusb"
      ).then((m) => m.default);
      const Str = await import("@ledgerhq/hw-app-str").then((m) => m.default);

      const transport = await TransportWebUSB.create();
      const str = new Str(transport);
      const { signature } = await str.signTransaction("44'/148'/0'", Buffer.from(xdr, "base64"));
      return Buffer.from(signature).toString("base64");
    },
  };
}
