import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNotificationPermission } from "./useNotificationPermission";

export interface UseTransactionNotificationsOptions {
  enabled?: boolean;
  title?: string;
  body?: (tx: { hash?: string; status?: string; [k: string]: unknown }) => string;
  icon?: string;
  tag?: string;
  onNotified?: (tx: { hash?: string; status?: string; [k: string]: unknown }) => void;
}

/**
 * Standalone helper for issue #916: trigger a browser Notification API alert
 * when a watched transaction confirms, with permission-request helper.
 */
export function useTransactionNotifications(options: UseTransactionNotificationsOptions = {}) {
  const { enabled = true, title = "Transaction confirmed", body, icon, tag, onNotified } = options;
  const permission = useNotificationPermission();
  const seen = useRef<Set<string>>(new Set());
  const [lastNotifiedHash, setLastNotifiedHash] = useState<string | null>(null);

  const notify = useCallback(
    async (tx: { hash?: string; status?: string; successful?: boolean; [k: string]: unknown }) => {
      if (!enabled) return false;
      const hash = tx.hash ?? JSON.stringify(tx);
      if (seen.current.has(hash)) return false;
      const confirmed = tx.status === "confirmed" || tx.status === "success" || tx.successful === true;
      if (!confirmed) return false;

      let state = permission.permission;
      if (state === "default") {
        state = await permission.request();
      }
      if (state !== "granted" || typeof Notification === "undefined") return false;

      seen.current.add(hash);
      const notification = new Notification(title, {
        body: body ? body(tx) : `Transaction ${hash.slice(0, 10)}... confirmed`,
        icon,
        tag: tag ?? hash,
      });
      void notification;
      setLastNotifiedHash(hash);
      onNotified?.(tx);
      return true;
    },
    [enabled, permission, title, body, icon, tag, onNotified],
  );

  useEffect(() => {
    if (!enabled) return;
    // no-op: hook consumer calls notify(tx) when tx state changes
  }, [enabled]);

  return useMemo(
    () => ({
      ...permission,
      notify,
      lastNotifiedHash,
      reset: () => {
        seen.current.clear();
        setLastNotifiedHash(null);
      },
    }),
    [permission, notify, lastNotifiedHash],
  );
}
