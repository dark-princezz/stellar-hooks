/**
 * @file addressBook.ts
 * @description Labeled address storage on top of the pluggable StorageAdapter.
 * @package stellar-hooks
 */

import { StrKey } from "@stellar/stellar-sdk";
import type { StorageAdapter } from "./storageAdapter";

export interface AddressBookEntry {
  address: string;
  label: string;
  createdAt: number;
}

export const DEFAULT_ADDRESS_BOOK_KEY = "stellar-hooks:address-book";

const isValidAddress = (a: string): boolean =>
  StrKey.isValidEd25519PublicKey(a) || StrKey.isValidMed25519PublicKey(a) || StrKey.isValidContract(a);

/** Persists contacts as JSON through any StorageAdapter (localStorage, AsyncStorage, custom). */
export class AddressBookStore {
  constructor(
    private readonly storage: StorageAdapter,
    private readonly key: string = DEFAULT_ADDRESS_BOOK_KEY,
    private readonly now: () => number = Date.now,
  ) {}

  async list(): Promise<AddressBookEntry[]> {
    const raw = await this.storage.getItem(this.key);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (e): e is AddressBookEntry =>
          !!e && typeof e.address === "string" && typeof e.label === "string" && typeof e.createdAt === "number",
      );
    } catch {
      return []; // corrupt data is treated as empty rather than crashing the app
    }
  }

  /** Adds a contact, or updates the label of an existing address. */
  async save(address: string, label: string): Promise<AddressBookEntry[]> {
    const trimmed = label.trim();
    if (!trimmed) throw new Error("Label is required");
    if (!isValidAddress(address)) throw new Error("Invalid Stellar address");
    const entries = await this.list();
    const existing = entries.find((e) => e.address === address);
    const next = existing
      ? entries.map((e) => (e.address === address ? { ...e, label: trimmed } : e))
      : [...entries, { address, label: trimmed, createdAt: this.now() }];
    await this.storage.setItem(this.key, JSON.stringify(next));
    return next;
  }

  async remove(address: string): Promise<AddressBookEntry[]> {
    const next = (await this.list()).filter((e) => e.address !== address);
    await this.storage.setItem(this.key, JSON.stringify(next));
    return next;
  }
}
