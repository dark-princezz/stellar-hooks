/**
 * @file useFreighterAccounts.ts
 * @description Hook for tracking and switching between Freighter wallet accounts.
 *              Records each address Freighter has connected with (most-recent
 *              first, capped) and exposes a `switchAccount(target)` helper
 *              that drives Freighter's `requestAccess()` permission dialog.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { requestAccess } from "@stellar/freighter-api";
import { useFreighter } from "./useFreighter";
import { asPublicKey } from "../types";
import type { StellarPublicKey } from "../types";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_STORAGE_KEY = "stellar-hooks:freighter-accounts";
const DEFAULT_MAX_HISTORY = 20;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseFreighterAccountsOptions {
  /**
   * Maximum number of previously-seen addresses to remember. Oldest entries
   * drop off once the cap is exceeded. Default: `20`.
   */
  maxHistory?: number;
  /**
   * `localStorage` key. Override for SSR, multi-tenant tests, or to avoid
   * collisions with a sibling app. Default: `"stellar-hooks:freighter-accounts"`.
   */
  storageKey?: string;
}

export interface UseFreighterAccountsReturn {
  /**
   * The currently-active Freighter address. Mirrors `useFreighter().publicKey`,
   * typed through the branded `StellarPublicKey` for safety.
   */
  active: StellarPublicKey | null;
  /**
   * All previously-seen addresses, most-recent-first, deduped and capped at
   * `maxHistory`. Persisted to `localStorage` so it survives reloads and
   * stays in sync across tabs (StorageEvent).
   */
  known: StellarPublicKey[];
  /**
   * Manually remember an address in the known list (e.g. one imported from
   * cross-device sync or a wallet-recovery flow). Moves it to the front.
   */
  remember: (pk: StellarPublicKey) => void;
  /** Forget a specific address. The active session is unaffected. */
  forget: (pk: StellarPublicKey) => void;
  /** Empty the known list. The active session is unaffected. */
  clear: () => void;
  /** `true` while a `switchAccount()` call is in flight. */
  isSwitching: boolean;
  /**
   * Trigger Freighter's permission dialog. On success, the resolved address
   * is added to the front of `known` and returned. On user rejection or
   * missing extension, `null` is returned.
   *
   * The optional `target` argument is accepted for forward-compatibility —
   * Freighter's `requestAccess()` does not currently let the dApp pick an
   * account directly; the user selects in the extension. The caller should
   * compare the returned address against their `target` and surface a
   *"wrong account selected"* warning when they differ.
   *
   * @example
   * ```tsx
   * const switched = await switchAccount(targetAddress);
   * if (switched && switched !== targetAddress) {
   *   showWarning(`Freighter landed on ${switched}, not ${targetAddress}`);
   * }
   * ```
   */
  switchAccount: (target?: StellarPublicKey) => Promise<StellarPublicKey | null>;
  /**
   * Convenience: returns `target` iff it is in `known`, else `null`. Useful
   * for "have I seen this address before?" validation.
   */
  find: (target: StellarPublicKey | null | undefined) => StellarPublicKey | null;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function readStored(storageKey: string, maxHistory: number): StellarPublicKey[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((k): k is string => typeof k === "string" && k.length > 0)
      .slice(0, maxHistory) as StellarPublicKey[];
  } catch {
    // Malformed JSON, storage disabled, etc. Treat as empty.
    return [];
  }
}

function writeStored(storageKey: string, list: StellarPublicKey[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(list));
  } catch {
    // localStorage may be full or disabled (Safari private mode). Silent.
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Track and switch between multiple Freighter wallet accounts.
 *
 * This hook records each address Freighter has connected with (most-recent first,
 * capped at maxHistory) and exposes a `switchAccount(target)` helper that drives
 * Freighter's `requestAccess()` permission dialog. It's useful for dApps that
 * support multiple accounts or need to remember user's previous wallets.
 *
 * The known addresses list is persisted to localStorage so it survives reloads
 * and stays in sync across tabs via StorageEvent.
 *
 * @param options - Configuration options for account tracking
 * @param options.maxHistory - Maximum number of previously-seen addresses to remember (default: 20)
 * @param options.storageKey - localStorage key for persistence (default: "stellar-hooks:freighter-accounts")
 *
 * @returns Object containing account management functions and state
 * @returns {string|null} returns.active - Currently-active Freighter address (mirrors useFreighter().publicKey)
 * @returns {string[]} returns.known - All previously-seen addresses, most-recent-first, deduped and capped
 * @returns {function} returns.remember - Manually remember an address in the known list
 * @returns {function} returns.forget - Forget a specific address from the known list
 * @returns {function} returns.clear - Empty the known list
 * @returns {boolean} returns.isSwitching - True while a switchAccount() call is in flight
 * @returns {function} returns.switchAccount - Trigger Freighter's permission dialog to switch accounts
 * @returns {function} returns.find - Check if a target address is in the known list
 *
 * @example
 * ```tsx
 * const { active, known, switchAccount, isSwitching } = useFreighterAccounts();
 *
 * return (
 *   <div>
 *     <p>Current: {active}</p>
 *     <p>Previous accounts:</p>
 *     <ul>
 *       {known.map((account) => (
 *         <li key={account}>
 *           <button onClick={() => switchAccount(account)} disabled={isSwitching}>
 *             {account.slice(0, 8)}...{account.slice(-4)}
 *           </button>
 *         </li>
 *       ))}
 *     </ul>
 *   </div>
 * );
 * ```
 *
 * @example
 * ```tsx
 * // Check if user has connected before
 * const { find, known } = useFreighterAccounts();
 * const isNewUser = known.length === 0;
 * ```
 */

export function useFreighterAccounts(
  options: UseFreighterAccountsOptions = {},
): UseFreighterAccountsReturn {
  const { maxHistory = DEFAULT_MAX_HISTORY, storageKey = DEFAULT_STORAGE_KEY } = options;
  const { publicKey: activeFromFreighter } = useFreighter();

  const [known, setKnown] = useState<StellarPublicKey[]>(() =>
    readStored(storageKey, maxHistory),
  );
  const [isSwitching, setIsSwitching] = useState(false);

  // Active-address tracking — when Freighter reports a new publicKey, prepend
  // it to the known list (dedup, cap). Does nothing on null (extension not
  // detected / not connected).
  useEffect(() => {
    if (!activeFromFreighter) return;
    setKnown((prev) => {
      if (prev[0] === activeFromFreighter) return prev;
      const filtered = prev.filter((k) => k !== activeFromFreighter);
      const next = [activeFromFreighter, ...filtered].slice(0, maxHistory);
      writeStored(storageKey, next);
      return next;
    });
  }, [activeFromFreighter, maxHistory, storageKey]);

  // Multi-tab sync — react to other tabs updating the storage.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== storageKey) return;
      setKnown(readStored(storageKey, maxHistory));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storageKey, maxHistory]);

  const remember = useCallback(
    (pk: StellarPublicKey) => {
      setKnown((prev) => {
        const filtered = prev.filter((k) => k !== pk);
        const next = [pk, ...filtered].slice(0, maxHistory);
        writeStored(storageKey, next);
        return next;
      });
    },
    [maxHistory, storageKey],
  );

  const forget = useCallback(
    (pk: StellarPublicKey) => {
      setKnown((prev) => {
        const next = prev.filter((k) => k !== pk);
        writeStored(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const clear = useCallback(() => {
    setKnown([]);
    writeStored(storageKey, []);
  }, [storageKey]);

  const switchAccount = useCallback(
    async (_target?: StellarPublicKey): Promise<StellarPublicKey | null> => {
      setIsSwitching(true);
      try {
        const result = await requestAccess();
        if (result.error || !result.address) return null;
        const pk = asPublicKey(result.address);
        // Ensure the active-after-switch address lands at the front of `known`.
        remember(pk);
        return pk;
      } finally {
        setIsSwitching(false);
      }
    },
    [remember],
  );

  const find = useCallback(
    (target: StellarPublicKey | null | undefined): StellarPublicKey | null => {
      if (!target) return null;
      return known.includes(target) ? target : null;
    },
    [known],
  );

  return useMemo(
    () => ({
      active: activeFromFreighter,
      known,
      remember,
      forget,
      clear,
      isSwitching,
      switchAccount,
      find,
    }),
    [activeFromFreighter, known, remember, forget, clear, isSwitching, switchAccount, find],
  );
}
