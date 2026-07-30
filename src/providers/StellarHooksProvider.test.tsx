import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { StellarHooksProvider, useStellarContext, useOptionalStellarContext } from "../context";
import { NETWORK_CONFIGS } from "../types";
import type { CustomNetworkConfig, StellarNetwork } from "../types";

const TEST_CUSTOM_CONFIG: CustomNetworkConfig = {
  network: "custom",
  horizonUrl: "https://my-horizon.example.com",
  sorobanRpcUrl: "https://my-rpc.example.com",
  networkPassphrase: "My Custom Network ; 2024",
};

function renderWithHooksProvider(providerProps: Record<string, unknown> = {}) {
  return renderHook(() => useStellarContext(), {
    wrapper: ({ children }) => (
      <StellarHooksProvider {...providerProps}>{children}</StellarHooksProvider>
    ),
  });
}

describe("StellarHooksProvider — network variants", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it.each([
    ["testnet", NETWORK_CONFIGS.testnet],
    ["mainnet", NETWORK_CONFIGS.mainnet],
    ["futurenet", NETWORK_CONFIGS.futurenet],
  ] as const)(
    "sets correct horizonUrl, sorobanRpcUrl, and passphrase for %s",
    (network, expected) => {
      const { result } = renderWithHooksProvider({ network });

      expect(result.current.network).toBe(network);
      expect(result.current.config.horizonUrl).toBe(expected.horizonUrl);
      expect(result.current.config.sorobanRpcUrl).toBe(expected.sorobanRpcUrl);
      expect(result.current.config.networkPassphrase).toBe(
        expected.networkPassphrase,
      );
    },
  );
});

describe("StellarHooksProvider — configurable RPC and network overrides", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("allows setting individual custom config parameters directly", () => {
    const { result } = renderWithHooksProvider({
      network: "custom",
      horizonUrl: "https://my-horizon.example.com",
      sorobanRpcUrl: "https://my-rpc.example.com",
      networkPassphrase: "My Custom Network ; 2024",
    });

    expect(result.current.network).toBe("custom");
    expect(result.current.config.horizonUrl).toBe("https://my-horizon.example.com");
    expect(result.current.config.sorobanRpcUrl).toBe("https://my-rpc.example.com");
    expect(result.current.config.networkPassphrase).toBe("My Custom Network ; 2024");
  });

  it("overrides a preset network's horizonUrl when provided", () => {
    const { result } = renderWithHooksProvider({
      network: "mainnet",
      horizonUrl: "https://custom-mainnet-horizon.com",
    });

    expect(result.current.network).toBe("mainnet");
    expect(result.current.config.horizonUrl).toBe("https://custom-mainnet-horizon.com");
    // Should preserve other preset values
    expect(result.current.config.sorobanRpcUrl).toBe(NETWORK_CONFIGS.mainnet.sorobanRpcUrl);
    expect(result.current.config.networkPassphrase).toBe(NETWORK_CONFIGS.mainnet.networkPassphrase);
  });

  it("behaves as custom network when only individual properties are provided without network='custom'", () => {
    const { result } = renderWithHooksProvider({
      horizonUrl: "https://my-horizon.example.com",
      sorobanRpcUrl: "https://my-rpc.example.com",
      networkPassphrase: "My Custom Network ; 2024",
    });

    expect(result.current.network).toBe("custom");
    expect(result.current.config.horizonUrl).toBe("https://my-horizon.example.com");
    expect(result.current.config.sorobanRpcUrl).toBe("https://my-rpc.example.com");
    expect(result.current.config.networkPassphrase).toBe("My Custom Network ; 2024");
  });
});

describe("StellarHooksProvider — customConfig compatibility", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("supports fallback to customConfig prop object", () => {
    const { result } = renderWithHooksProvider({
      network: "custom",
      customConfig: TEST_CUSTOM_CONFIG,
    });

    expect(result.current.network).toBe("custom");
    expect(result.current.config).toEqual(TEST_CUSTOM_CONFIG);
  });
});

describe("StellarHooksProvider — switchNetwork", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("switchNetwork replaces config and network values", () => {
    const { result } = renderWithHooksProvider({ network: "testnet" });

    expect(result.current.network).toBe("testnet");

    act(() => {
      result.current.switchNetwork("custom", TEST_CUSTOM_CONFIG);
    });

    expect(result.current.network).toBe("custom");
    expect(result.current.config.horizonUrl).toBe(TEST_CUSTOM_CONFIG.horizonUrl);
    expect(result.current.config.sorobanRpcUrl).toBe(TEST_CUSTOM_CONFIG.sorobanRpcUrl);
  });
});

describe("StellarHooksProvider — error when used outside provider", () => {
  it("useStellarContext throws with a clear error message", () => {
    expect(() => renderHook(() => useStellarContext())).toThrow(
      "[stellar-hooks] useStellarContext must be used inside <StellarProvider>.",
    );
  });

  it("useOptionalStellarContext returns null outside the provider", () => {
    const { result } = renderHook(() => useOptionalStellarContext());

    expect(result.current).toBeNull();
  });
});
