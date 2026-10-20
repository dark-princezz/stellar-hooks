import { afterEach, describe, expect, it, vi } from "vitest";
import { Federation, Keypair } from "@stellar/stellar-sdk";
import { isFederationAddress, resolveFederationAddress, reverseFederationLookup } from "./federation";
import { createMuxedAddress, isMuxedAddress, parseMuxedAddress } from "./muxedAccount";
import { AddressBookStore } from "./addressBook";
import type { StorageAdapter } from "./storageAdapter";

const account = Keypair.random().publicKey();

afterEach(() => vi.restoreAllMocks());

describe("federation", () => {
  it("recognises name*domain addresses", () => {
    expect(isFederationAddress("alice*example.com")).toBe(true);
    for (const bad of ["alice", "*example.com", "alice*", "a b*example.com", "alice*exa mple.com"]) {
      expect(isFederationAddress(bad)).toBe(false);
    }
  });

  it("resolves an address to an account and memo", async () => {
    const resolve = vi.spyOn(Federation.Server, "resolve").mockResolvedValue({
      account_id: account,
      memo_type: "text",
      memo: "hello",
    });
    await expect(resolveFederationAddress("alice*example.com")).resolves.toEqual({
      accountId: account,
      memoType: "text",
      memo: "hello",
      address: null,
    });
    expect(resolve).toHaveBeenCalledWith("alice*example.com", {});
  });

  it("rejects malformed addresses and bogus server answers", async () => {
    await expect(resolveFederationAddress("nope")).rejects.toThrow("Invalid federation address");
    vi.spyOn(Federation.Server, "resolve").mockResolvedValue({ account_id: "GBAD" });
    await expect(resolveFederationAddress("alice*example.com")).rejects.toThrow("invalid account ID");
  });

  it("reverses an account ID through the domain's server", async () => {
    const server = { resolveAccountId: vi.fn().mockResolvedValue({ account_id: account, stellar_address: "alice*example.com" }) };
    vi.spyOn(Federation.Server, "createForDomain").mockResolvedValue(server as never);
    await expect(reverseFederationLookup(account, "example.com")).resolves.toMatchObject({ address: "alice*example.com" });
    expect(server.resolveAccountId).toHaveBeenCalledWith(account);
  });

  it("errors when reverse lookup is unsupported or inputs are invalid", async () => {
    vi.spyOn(Federation.Server, "createForDomain").mockResolvedValue({
      resolveAccountId: vi.fn().mockResolvedValue({ account_id: account }),
    } as never);
    await expect(reverseFederationLookup(account, "example.com")).rejects.toThrow("no address");
    await expect(reverseFederationLookup("GBAD", "example.com")).rejects.toThrow("Invalid account ID");
    await expect(reverseFederationLookup(account, "bad domain")).rejects.toThrow("Invalid federation domain");
  });
});

describe("muxed addresses", () => {
  it("round-trips base account and 64-bit ID", () => {
    const muxed = createMuxedAddress(account, "9007199254740993");
    expect(muxed.startsWith("M")).toBe(true);
    expect(isMuxedAddress(muxed)).toBe(true);
    expect(parseMuxedAddress(muxed)).toEqual({ baseAccount: account, id: "9007199254740993" });
    expect(createMuxedAddress(account, 0)).not.toBe(muxed);
  });

  it("accepts the 64-bit boundaries and rejects everything else", () => {
    expect(() => createMuxedAddress(account, (1n << 64n) - 1n)).not.toThrow();
    expect(() => createMuxedAddress(account, 1n << 64n)).toThrow("64-bit");
    expect(() => createMuxedAddress(account, -1)).toThrow("64-bit");
    expect(() => createMuxedAddress(account, "abc")).toThrow("integer");
    expect(() => createMuxedAddress("GBAD", 1)).toThrow("G...");
    expect(() => parseMuxedAddress(account)).toThrow("muxed");
    expect(isMuxedAddress(account)).toBe(false);
  });
});

describe("AddressBookStore", () => {
  const memory = (): StorageAdapter & { data: Map<string, string> } => {
    const data = new Map<string, string>();
    return {
      data,
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: (k) => void data.delete(k),
    };
  };

  it("saves, updates, lists and removes contacts through the adapter", async () => {
    const storage = memory();
    const book = new AddressBookStore(storage, "k", () => 5);
    await book.save(account, " Alice ");
    expect(await book.list()).toEqual([{ address: account, label: "Alice", createdAt: 5 }]);
    await book.save(account, "Alice B");
    expect((await book.list()).map((e) => e.label)).toEqual(["Alice B"]);
    expect(JSON.parse(storage.data.get("k") as string)).toHaveLength(1);
    await book.remove(account);
    expect(await book.list()).toEqual([]);
  });

  it("works with an async adapter and validates input", async () => {
    const data = new Map<string, string>();
    const asyncStorage: StorageAdapter = {
      getItem: async (k) => data.get(k) ?? null,
      setItem: async (k, v) => void data.set(k, v),
      removeItem: async (k) => void data.delete(k),
    };
    const book = new AddressBookStore(asyncStorage);
    await book.save(createMuxedAddress(account, 7), "Exchange deposit");
    expect(await book.list()).toHaveLength(1);
    await expect(book.save("nope", "x")).rejects.toThrow("Invalid Stellar address");
    await expect(book.save(account, "  ")).rejects.toThrow("Label");
  });

  it("treats corrupt storage as empty", async () => {
    const storage = memory();
    storage.data.set("k", "{not json");
    expect(await new AddressBookStore(storage, "k").list()).toEqual([]);
    storage.data.set("k", JSON.stringify([{ address: 1 }, "x"]));
    expect(await new AddressBookStore(storage, "k").list()).toEqual([]);
  });
});
