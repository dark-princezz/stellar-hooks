import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { Federation, Keypair } from "@stellar/stellar-sdk";
import { useFederationLookup } from "./useFederationLookup";
import { useMuxedAccount } from "./useMuxedAccount";
import { useAddressBook } from "./useAddressBook";
import type { StorageAdapter } from "../utils/storageAdapter";

const account = Keypair.random().publicKey();

describe("useFederationLookup", () => {
  it("exposes loading, data and errors", async () => {
    vi.spyOn(Federation.Server, "resolve").mockResolvedValueOnce({ account_id: account });
    const { result } = renderHook(() => useFederationLookup());
    await act(async () => {
      await result.current.resolve("alice*example.com");
    });
    expect(result.current.data?.accountId).toBe(account);
    await act(async () => {
      await result.current.resolve("bad");
    });
    expect(result.current.data).toBeNull();
    expect(result.current.error?.message).toMatch(/Invalid federation address/);
  });
});

describe("useMuxedAccount", () => {
  it("creates and parses", () => {
    const { result } = renderHook(() => useMuxedAccount());
    const m = result.current.create(account, 42);
    expect(result.current.isMuxed(m)).toBe(true);
    expect(result.current.parse(m)).toEqual({ baseAccount: account, id: "42" });
  });
});

describe("useAddressBook", () => {
  const storage = (): StorageAdapter => {
    const data = new Map<string, string>();
    return {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: (k) => void data.delete(k),
    };
  };

  it("loads, saves and removes contacts via the supplied storage", async () => {
    const adapter = storage();
    const { result } = renderHook(() => useAddressBook({ storage: adapter, storageKey: "book" }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.save(account, "Alice");
    });
    expect(result.current.find(account)?.label).toBe("Alice");

    const second = renderHook(() => useAddressBook({ storage: adapter, storageKey: "book" }));
    await waitFor(() => expect(second.result.current.contacts).toHaveLength(1));

    await act(async () => {
      await result.current.remove(account);
    });
    expect(result.current.contacts).toEqual([]);
  });

  it("reports validation errors", async () => {
    const adapter = storage();
    const { result } = renderHook(() => useAddressBook({ storage: adapter }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await expect(result.current.save("bad", "x")).rejects.toThrow();
    });
    expect(result.current.error?.message).toMatch(/Invalid Stellar address/);
  });
});
