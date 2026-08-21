/**
 * @file useStellarToml.test.ts
 * @description Unit tests for the useStellarToml hook.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const mockResolve = vi.fn();

vi.mock("@stellar/stellar-sdk", () => ({
  StellarToml: {
    Resolver: {
      resolve: (...args: unknown[]) => mockResolve(...args),
    },
  },
}));

import { useStellarToml } from "../hooks/useStellarToml";
import { setCache } from "../utils";

const SAMPLE_TOML = {
  CURRENCIES: [{ code: "USD", issuer: "GABC..." }],
  DOCUMENTATION: { ORG_NAME: "Stellar Development Foundation" },
};

describe("useStellarToml", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns idle state for a null domain without fetching", async () => {
    const { result } = renderHook(() => useStellarToml(null));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockResolve).not.toHaveBeenCalled();
  });

  it("fetches and parses a domain stellar.toml on mount", async () => {
    mockResolve.mockResolvedValueOnce(SAMPLE_TOML);

    const { result } = renderHook(() => useStellarToml("stellar.org"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockResolve).toHaveBeenCalledWith("stellar.org", {});
    expect(result.current.data).toEqual(SAMPLE_TOML);
    expect(result.current.error).toBeNull();
  });

  it("serves cached data without refetching when cache is warm", async () => {
    setCache("stellar-toml-stellar.org", SAMPLE_TOML, 300000);

    const { result } = renderHook(() => useStellarToml("stellar.org"));

    await waitFor(() => expect(result.current.data).toEqual(SAMPLE_TOML));

    expect(mockResolve).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it("refetch bypasses cache and reloads the domain toml", async () => {
    setCache("stellar-toml-stellar.org", SAMPLE_TOML, 300000);
    const refreshed = {
      ...SAMPLE_TOML,
      DOCUMENTATION: { ORG_NAME: "Updated Org" },
    };
    mockResolve.mockResolvedValueOnce(refreshed);

    const { result } = renderHook(() => useStellarToml("stellar.org"));

    await waitFor(() => expect(result.current.data).toEqual(SAMPLE_TOML));
    expect(mockResolve).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockResolve).toHaveBeenCalledWith("stellar.org", {});
    expect(result.current.data).toEqual(refreshed);
    expect(result.current.error).toBeNull();
  });

  it("surfaces resolver errors", async () => {
    const error = new Error("TOML not found");
    mockResolve.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useStellarToml("missing.example"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toEqual(error);
    expect(result.current.data).toBeNull();
  });

  it("clears state when the domain becomes null", async () => {
    mockResolve.mockResolvedValueOnce(SAMPLE_TOML);

    const { result, rerender } = renderHook(
      ({ domain }: { domain: string | null }) => useStellarToml(domain),
      { initialProps: { domain: "clear-state.example" } },
    );

    await waitFor(() => expect(result.current.data).toEqual(SAMPLE_TOML));

    rerender({ domain: null });

    await waitFor(() => {
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("respects a custom cacheTTL when storing resolved data", async () => {
    mockResolve.mockResolvedValueOnce(SAMPLE_TOML);

    const { result } = renderHook(() =>
      useStellarToml("custom.example", { cacheTTL: 60000 }),
    );

    await waitFor(() => expect(result.current.data).toEqual(SAMPLE_TOML));

    mockResolve.mockClear();
    const { result: cached } = renderHook(() =>
      useStellarToml("custom.example", { cacheTTL: 60000 }),
    );

    await waitFor(() => expect(cached.current.data).toEqual(SAMPLE_TOML));
    expect(mockResolve).not.toHaveBeenCalled();
    expect(cached.current.error).toBeNull();
  });
});
