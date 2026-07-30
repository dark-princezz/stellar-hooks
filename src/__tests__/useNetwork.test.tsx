import { beforeEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { StellarProvider } from "../context";
import { useNetwork } from "../hooks/useNetwork";
import { NETWORK_CONFIGS } from "../types";

describe("useNetwork", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
        clear: () => {
          storage.clear();
        },
      },
    });
  });

  it("returns the active network and config values from context", () => {
    const { result } = renderHook(() => useNetwork(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <StellarProvider network="mainnet">{children}</StellarProvider>
      ),
    });

    expect(result.current.network).toBe("mainnet");
    expect(result.current.networkPassphrase).toBe(
      NETWORK_CONFIGS.mainnet.networkPassphrase,
    );
    expect(result.current.horizonUrl).toBe(NETWORK_CONFIGS.mainnet.horizonUrl);
    expect(result.current.sorobanRpcUrl).toBe(
      NETWORK_CONFIGS.mainnet.sorobanRpcUrl,
    );
    expect(result.current.config).toEqual(NETWORK_CONFIGS.mainnet);
    expect(typeof result.current.switchNetwork).toBe("function");
  });

  it("throws a descriptive error outside the provider", () => {
    expect(() => renderHook(() => useNetwork())).toThrow(
      "[stellar-hooks] useStellarContext must be used inside <StellarProvider>.",
    );
  });
});
