/**
 * @file useAddressBook.ts
 * @description Saved, labeled contacts persisted through a pluggable storage adapter.
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AddressBookStore, DEFAULT_ADDRESS_BOOK_KEY } from "../utils/addressBook";
import type { AddressBookEntry } from "../utils/addressBook";
import { createLocalStorageAdapter } from "../utils/storageAdapter";
import type { StorageAdapter } from "../utils/storageAdapter";

export interface UseAddressBookOptions {
  /** Storage backend; defaults to localStorage. Pass an AsyncStorage adapter on React Native. */
  storage?: StorageAdapter;
  /** Storage key; defaults to `stellar-hooks:address-book`. */
  storageKey?: string;
}

export interface UseAddressBookReturn {
  contacts: AddressBookEntry[];
  isLoading: boolean;
  error: Error | null;
  /** Add a contact or rename an existing one. */
  save: (address: string, label: string) => Promise<void>;
  remove: (address: string) => Promise<void>;
  /** Contact for `address`, if saved. */
  find: (address: string) => AddressBookEntry | undefined;
}

export function useAddressBook(options: UseAddressBookOptions = {}): UseAddressBookReturn {
  const { storage, storageKey = DEFAULT_ADDRESS_BOOK_KEY } = options;
  const store = useMemo(
    () => new AddressBookStore(storage ?? createLocalStorageAdapter(), storageKey),
    [storage, storageKey],
  );
  const [contacts, setContacts] = useState<AddressBookEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    store
      .list()
      .then((entries) => !cancelled && setContacts(entries))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [store]);

  const apply = useCallback(async (action: () => Promise<AddressBookEntry[]>) => {
    try {
      setError(null);
      setContacts(await action());
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    }
  }, []);

  const save = useCallback((address: string, label: string) => apply(() => store.save(address, label)), [apply, store]);
  const remove = useCallback((address: string) => apply(() => store.remove(address)), [apply, store]);
  const find = useCallback((address: string) => contacts.find((c) => c.address === address), [contacts]);

  return { contacts, isLoading, error, save, remove, find };
}
