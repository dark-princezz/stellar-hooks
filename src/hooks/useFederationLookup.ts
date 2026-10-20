/**
 * @file useFederationLookup.ts
 * @description Resolve SEP-2 federation addresses to accounts and back.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useRef, useState } from "react";
import {
  resolveFederationAddress,
  reverseFederationLookup,
} from "../utils/federation";
import type { FederationOptions, FederationRecord } from "../utils/federation";

export interface UseFederationLookupReturn {
  /** Result of the latest successful lookup. */
  data: FederationRecord | null;
  error: Error | null;
  isLoading: boolean;
  /** Resolve `name*domain` to an account ID and optional memo. */
  resolve: (address: string) => Promise<FederationRecord | null>;
  /** Find the federation address of `accountId` on `domain`, when the server supports it. */
  reverse: (accountId: string, domain: string) => Promise<FederationRecord | null>;
  reset: () => void;
}

/**
 * Federation lookups with loading/error state. Only the most recent lookup updates state, so a slow
 * earlier request can never overwrite a newer result.
 */
export function useFederationLookup(options: FederationOptions = {}): UseFederationLookupReturn {
  const [data, setData] = useState<FederationRecord | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const latest = useRef(0);

  const run = useCallback(
    async (lookup: () => Promise<FederationRecord>): Promise<FederationRecord | null> => {
      const id = ++latest.current;
      setIsLoading(true);
      setError(null);
      try {
        const record = await lookup();
        if (id === latest.current) setData(record);
        return record;
      } catch (err) {
        if (id === latest.current) {
          setData(null);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
        return null;
      } finally {
        if (id === latest.current) setIsLoading(false);
      }
    },
    [],
  );

  const { allowHttp, timeout } = options;
  const resolve = useCallback(
    (address: string) =>
      run(() => resolveFederationAddress(address, { ...(allowHttp !== undefined && { allowHttp }), ...(timeout !== undefined && { timeout }) })),
    [run, allowHttp, timeout],
  );
  const reverse = useCallback(
    (accountId: string, domain: string) =>
      run(() => reverseFederationLookup(accountId, domain, { ...(allowHttp !== undefined && { allowHttp }), ...(timeout !== undefined && { timeout }) })),
    [run, allowHttp, timeout],
  );
  const reset = useCallback(() => {
    latest.current++;
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { data, error, isLoading, resolve, reverse, reset };
}
