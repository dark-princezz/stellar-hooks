/**
 * @file devtoolsBridge.ts
 * @description Global communication bridge between stellar-hooks and DevTools panels / browser extension.
 * @package stellar-hooks
 * @license MIT
 */

import type { HookActivitySnapshot } from "../types";
import { safeJsonStringify } from "../utils/bigIntSerializer";

export type DevToolsSubscriber = (entries: HookActivitySnapshot[]) => void;

export interface StellarHooksDevToolsBridge {
  version: string;
  getHookInstances: () => HookActivitySnapshot[];
  subscribe: (callback: DevToolsSubscriber) => () => void;
  emitHookActivity: (entries: HookActivitySnapshot[]) => void;
  clear: () => void;
}

declare global {
  interface Window {
    __STELLAR_HOOKS_DEVTOOLS__?: StellarHooksDevToolsBridge;
  }
}

let subscribers: DevToolsSubscriber[] = [];
let latestEntries: HookActivitySnapshot[] = [];

/**
 * Dispatches an activity update to all local subscribers and broadcasts
 * a message to the window for browser extension content scripts.
 */
export function emitDevToolsActivity(entries: HookActivitySnapshot[]): void {
  latestEntries = entries;
  for (const subscriber of subscribers) {
    try {
      subscriber(entries);
    } catch {
      // Ignore subscriber errors
    }
  }

  if (typeof window !== "undefined" && typeof window.postMessage === "function") {
    try {
      // Serialize through safeJsonStringify first so BigInt values in hook
      // snapshots are converted to strings before structured-clone transfer.
      const serialized = JSON.parse(safeJsonStringify({ entries }));
      window.postMessage(
        {
          source: "stellar-hooks-devtools",
          type: "HOOK_ACTIVITY_UPDATE",
          payload: serialized.entries,
        },
        "*"
      );
    } catch {
      // Ignore serialization or window message errors
    }
  }
}

/**
 * Returns the current cached hook activity snapshots.
 */
export function getDevToolsHookInstances(): HookActivitySnapshot[] {
  return [...latestEntries];
}

/**
 * Subscribes to hook activity changes.
 * @param callback - Invoked whenever hook activities update.
 * @returns Unsubscribe cleanup function.
 */
export function subscribeToDevToolsActivity(
  callback: DevToolsSubscriber
): () => void {
  subscribers.push(callback);
  // Immediately notify with latest entries
  callback(latestEntries);

  return () => {
    subscribers = subscribers.filter((sub) => sub !== callback);
  };
}

/**
 * Clears cached devtools entries and notifies subscribers.
 */
export function clearDevToolsActivity(): void {
  latestEntries = [];
  emitDevToolsActivity([]);
}

/**
 * Initializes the global window.__STELLAR_HOOKS_DEVTOOLS__ bridge if running in a browser environment.
 */
export function initDevToolsBridge(): StellarHooksDevToolsBridge | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  if (!window.__STELLAR_HOOKS_DEVTOOLS__) {
    const bridge: StellarHooksDevToolsBridge = {
      version: "1.0.0",
      getHookInstances: getDevToolsHookInstances,
      subscribe: subscribeToDevToolsActivity,
      emitHookActivity: emitDevToolsActivity,
      clear: clearDevToolsActivity,
    };

    window.__STELLAR_HOOKS_DEVTOOLS__ = bridge;
  }

  return window.__STELLAR_HOOKS_DEVTOOLS__;
}

// Auto-initialize if in browser
if (typeof window !== "undefined") {
  initDevToolsBridge();
}
