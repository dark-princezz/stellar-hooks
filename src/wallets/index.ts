export type { WalletId, WalletAdapter } from "./types";
export { createFreighterAdapter, isFreighterInstalled } from "./freighter";
export { createLobstrAdapter } from "./lobstr";
export { createXBullAdapter } from "./xbull";
export { createAlbedoAdapter } from "./albedo";
export { createRabetAdapter } from "./rabet";

import type { WalletAdapter } from "./types";
import { createFreighterAdapter } from "./freighter";
import { createLobstrAdapter } from "./lobstr";
import { createXBullAdapter } from "./xbull";
import { createAlbedoAdapter } from "./albedo";
import { createRabetAdapter } from "./rabet";

export function createAllAdapters(): WalletAdapter[] {
  return [
    createFreighterAdapter(),
    createLobstrAdapter(),
    createXBullAdapter(),
    createAlbedoAdapter(),
    createRabetAdapter(),
  ];
}
