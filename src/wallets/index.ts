export type { WalletId, WalletAdapter, WalletMeta, WalletInfo } from "./types";
export { createFreighterAdapter, isFreighterInstalled } from "./freighter";
export { createLobstrAdapter, createLobstrWalletConnectAdapter } from "./lobstr";
export { createXBullAdapter, createXBullWalletConnectAdapter, isXBullInstalled } from "./xbull";
export { createAlbedoAdapter, isAlbedoInstalled } from "./albedo";
export { createRabetAdapter } from "./rabet";
export { createLedgerAdapter } from "./ledger";
export {
  supportsTransactionSigning,
  supportsMessageSigning,
  supportsAuthEntrySigning,
  getWalletsWithCapability,
} from "./capabilities";

import type { WalletAdapter } from "./types";
import { createFreighterAdapter } from "./freighter";
import { createLobstrAdapter } from "./lobstr";
import { createLobstrWalletConnectAdapter } from "./lobstr-walletconnect";
import { createXBullAdapter } from "./xbull";
import { createXBullWalletConnectAdapter } from "./xbull-walletconnect";
import { createAlbedoAdapter } from "./albedo";
import { createRabetAdapter } from "./rabet";
import { createLedgerAdapter } from "./ledger";

export function createAllAdapters(): WalletAdapter[] {
  return [
    createFreighterAdapter(),
    createLobstrAdapter(),
    createLobstrWalletConnectAdapter({ projectId: "stub-project-id" }),
    createXBullAdapter(),
    createXBullWalletConnectAdapter({ projectId: "stub-project-id" }),
    createAlbedoAdapter(),
    createRabetAdapter(),
    createLedgerAdapter(),
  ];
}
