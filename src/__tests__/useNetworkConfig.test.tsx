import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { StellarProvider } from "../context";
import { useNetworkConfig } from "../hooks/useNetworkConfig";
import { NETWORK_CONFIGS } from "../types";

function wrapper(config?: any) {
  return ({ children }: { children: React.ReactNode }) => (
    <StellarProvider network={config?.network ?? "testnet"} customConfig={config?.customConfig}>
      {children}
    </StellarProvider>
  );
}

describe("useNetworkConfig", () => {
  it("returns the configured values for preset networks", () => {
    const { result } = renderHook(() => useNetworkConfig(), {
      wrapper: wrapper({ network: "mainnet" }),
    });

    expect(result.current).toEqual(NETWORK_CONFIGS.mainnet);
  });

  it("returns the configured values for custom networks", () => {
    const customConfig = {
      network: "custom" as const,
      horizonUrl: "https://custom.example",
      sorobanRpcUrl: "https://rpc.example",
      networkPassphrase: "Custom Passphrase",
    };

    const { result } = renderHook(() => useNetworkConfig(), {
      wrapper: wrapper({ network: "custom", customConfig }),
    });

    expect(result.current).toEqual(customConfig);
  });

  it("throws a descriptive error outside the provider", () => {
    expect(() => renderHook(() => useNetworkConfig())).toThrow(
      "[stellar-hooks] useNetworkConfig must be used inside <StellarProvider>."
    );
  });
});
