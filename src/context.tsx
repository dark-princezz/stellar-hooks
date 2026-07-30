/**
 * @file context.tsx
 * @description React Context and Provider for Stellar configuration with network switch race condition guards.
 * @package stellar-hooks
 * @license MIT
 */

import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";
import type {
  HookActivitySnapshot,
  StellarContextValue,
  StellarProviderProps,
  StellarHooksProviderProps,
  StellarNetwork,
  CustomNetworkConfig,
  NetworkConfig,
} from "./types";
import { NETWORK_CONFIGS } from "./types";

const NETWORK_STORAGE_KEY = "stellar-hooks:network";
const CUSTOM_CONFIG_STORAGE_KEY = "stellar-hooks:custom-config";

interface StellarContextInternalValue extends StellarContextValue {
  switchNetwork: (newNetwork: StellarNetwork, newCustomConfig?: CustomNetworkConfig) => void;
  /** Monotonically increasing version counter incremented on every network switch to guard against race conditions */
  networkVersion: number;
}

interface HookActivityRegistration {
  id?: string;
  name: string;
  status: string;
  lastError: string | null;
}

interface StellarHookDebugContextValue {
  entries: HookActivitySnapshot[];
  register: (entry: HookActivityRegistration) => string;
  update: (id: string, entry: Omit<HookActivityRegistration, "id">) => void;
  unregister: (id: string) => void;
}

const StellarContext = createContext<StellarContextInternalValue | null>(null);
const StellarHookDebugContext = createContext<StellarHookDebugContextValue | null>(
  null,
);
let hookActivityCounter = 0;

/**
 * Wrap your app (or the portion that needs Stellar) with this provider.
 */
export function StellarHooksProvider({
  network: initialNetwork,
  horizonUrl: initialHorizonUrl,
  sorobanRpcUrl: initialSorobanRpcUrl,
  networkPassphrase: initialNetworkPassphrase,
  customConfig: initialCustomConfig,
  children,
}: StellarHooksProviderProps) {
  const defaultNetwork = initialNetwork || 
    (initialHorizonUrl || initialSorobanRpcUrl || initialNetworkPassphrase || initialCustomConfig ? "custom" : "testnet");
  const [network, setNetwork] = useState<StellarNetwork>(defaultNetwork);
  
  // Monotonically increasing version counter for network switch race condition protection
  const [networkVersion, setNetworkVersion] = useState<number>(0);
  
  const [customHorizonUrl, setCustomHorizonUrl] = useState<string | undefined>(
    initialHorizonUrl || initialCustomConfig?.horizonUrl
  );
  const [customSorobanRpcUrl, setCustomSorobanRpcUrl] = useState<string | undefined>(
    initialSorobanRpcUrl || initialCustomConfig?.sorobanRpcUrl
  );
  const [customPassphrase, setCustomPassphrase] = useState<string | undefined>(
    initialNetworkPassphrase || initialCustomConfig?.networkPassphrase
  );

  const requestCache = useMemo(() => new Map<string, Promise<unknown>>(), []);
  const [networkEpoch, setNetworkEpoch] = useState(0);
  const [hookEntries, setHookEntries] = useState<HookActivitySnapshot[]>([]);

  useEffect(() => {
    const savedNetwork = localStorage.getItem(NETWORK_STORAGE_KEY) as StellarNetwork;
    if (savedNetwork) setNetwork(savedNetwork);

    const savedCustomConfig = localStorage.getItem(CUSTOM_CONFIG_STORAGE_KEY);
    if (savedCustomConfig) {
      try {
        const parsed = JSON.parse(savedCustomConfig) as CustomNetworkConfig;
        setCustomHorizonUrl(parsed.horizonUrl);
        setCustomSorobanRpcUrl(parsed.sorobanRpcUrl);
        setCustomPassphrase(parsed.networkPassphrase);
      } catch { /* ignore invalid JSON in localStorage */ }
    }
  }, []);

  const switchNetwork = useCallback((newNetwork: StellarNetwork, newCustomConfig?: CustomNetworkConfig) => {
    setNetwork(newNetwork);
    setNetworkVersion((v) => v + 1); // Increment version to invalidate in-flight requests
    localStorage.setItem(NETWORK_STORAGE_KEY, newNetwork);

    if (newNetwork === "custom" && newCustomConfig) {
      setCustomHorizonUrl(newCustomConfig.horizonUrl);
      setCustomSorobanRpcUrl(newCustomConfig.sorobanRpcUrl);
      setCustomPassphrase(newCustomConfig.networkPassphrase);
      localStorage.setItem(CUSTOM_CONFIG_STORAGE_KEY, JSON.stringify(newCustomConfig));
    }
  }, []);

  const config = useMemo<NetworkConfig>(() => {
    const presetConfig = network !== "custom" ? NETWORK_CONFIGS[network as keyof typeof NETWORK_CONFIGS] : undefined;

    if (network === "custom") {
      if (customHorizonUrl || customSorobanRpcUrl || customPassphrase) {
        return {
          network: "custom",
          horizonUrl: customHorizonUrl || "",
          sorobanRpcUrl: customSorobanRpcUrl || "",
          networkPassphrase: customPassphrase || "",
        };
      }
      return NETWORK_CONFIGS.testnet;
    }

    const base = presetConfig || NETWORK_CONFIGS.testnet;
    return {
      ...base,
      horizonUrl: customHorizonUrl ?? base.horizonUrl,
      sorobanRpcUrl: customSorobanRpcUrl ?? base.sorobanRpcUrl,
      networkPassphrase: customPassphrase ?? base.networkPassphrase,
    };
  }, [network, customHorizonUrl, customSorobanRpcUrl, customPassphrase]);

  const value = useMemo<StellarContextInternalValue>(
    () => ({ config, network, switchNetwork, networkVersion, requestCache }),
    [config, network, switchNetwork, networkVersion, requestCache]
  );

  const registerHookActivity = useCallback(
    (entry: HookActivityRegistration) => {
      const id = entry.id ?? `hook-${++hookActivityCounter}`;
      const snapshot: HookActivitySnapshot = {
        id,
        name: entry.name,
        status: entry.status,
        lastError: entry.lastError,
        updatedAt: new Date(),
      };

      setHookEntries((previous) => {
        const filtered = previous.filter((item) => item.id !== id);
        return [snapshot, ...filtered].sort(
          (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
        );
      });

      return id;
    },
    [],
  );

  const updateHookActivity = useCallback(
    (id: string, entry: Omit<HookActivityRegistration, "id">) => {
      setHookEntries((previous) => {
        const nextEntry: HookActivitySnapshot = {
          id,
          name: entry.name,
          status: entry.status,
          lastError: entry.lastError,
          updatedAt: new Date(),
        };

        const filtered = previous.filter((item) => item.id !== id);
        return [nextEntry, ...filtered].sort(
          (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
        );
      });
    },
    [],
  );

  const unregisterHookActivity = useCallback((id: string) => {
    setHookEntries((previous) => previous.filter((entry) => entry.id !== id));
  }, []);

  const debugValue = useMemo<StellarHookDebugContextValue>(
    () => ({
      entries: hookEntries,
      register: registerHookActivity,
      update: updateHookActivity,
      unregister: unregisterHookActivity,
    }),
    [hookEntries, registerHookActivity, unregisterHookActivity, updateHookActivity],
  );

  return (
    <StellarContext.Provider value={value}>
      <StellarHookDebugContext.Provider value={debugValue}>
        {children}
      </StellarHookDebugContext.Provider>
    </StellarContext.Provider>
  );
}

export function StellarProvider({
  network = "testnet",
  customConfig,
  children,
}: StellarProviderProps) {
  return (
    <StellarHooksProvider
      network={network}
      customConfig={customConfig}
    >
      {children}
    </StellarHooksProvider>
  );
}

export function useOptionalStellarContext(): StellarContextInternalValue | null {
  return useContext(StellarContext);
}

export function useOptionalStellarHookDebugContext(): StellarHookDebugContextValue | null {
  return useContext(StellarHookDebugContext);
}

export function useStellarContext(): StellarContextInternalValue {
  const ctx = useContext(StellarContext);
  if (!ctx) {
    throw new Error(
      "[stellar-hooks] useStellarContext must be used inside <StellarProvider>."
    );
  }
  return ctx;
}
