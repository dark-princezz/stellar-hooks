import { derived, readable, writable, type Readable } from "svelte/store";
import {
  fetchAccount,
  NETWORK_CONFIGS,
  type NetworkConfig,
  type StellarAccountData,
} from "@stellar-hooks/core";
import { resolveEnabled, toStore, type MaybeStore } from "./internal";

export interface UseStellarAccountOptions {
  config?: NetworkConfig;
  horizonUrl?: string;
  enabled?: MaybeStore<boolean | undefined>;
  refetchInterval?: number;
}

export interface UseStellarAccountReturn {
  data: Readable<StellarAccountData | null>;
  error: Readable<Error | null>;
  isLoading: Readable<boolean>;
  lastFetchedAt: Readable<Date | null>;
  balances: Readable<StellarAccountData["balances"]>;
  xlmBalance: Readable<string | null>;
  refetch: () => Promise<void>;
}

interface AccountState {
  data: StellarAccountData | null;
  error: Error | null;
  isLoading: boolean;
  lastFetchedAt: Date | null;
}

export function useStellarAccount(
  publicKey: MaybeStore<string | null | undefined>,
  options: UseStellarAccountOptions = {}
): UseStellarAccountReturn {
  const state = writable<AccountState>({
    data: null,
    error: null,
    isLoading: false,
    lastFetchedAt: null,
  });

  const netConfig = options.config ?? NETWORK_CONFIGS.testnet;
  const horizonUrl = options.horizonUrl ?? netConfig.horizonUrl;
  const publicKeyStore = toStore(publicKey);
  const enabledStore = resolveEnabled(options.enabled);

  let currentKey: string | null | undefined;
  let enabled = true;
  let timer: ReturnType<typeof setInterval> | null = null;

  const executeFetch = async () => {
    if (!enabled || !currentKey) {
      state.set({ data: null, error: null, isLoading: false, lastFetchedAt: null });
      return;
    }

    state.update((value) => ({ ...value, isLoading: true, error: null }));

    try {
      const data = await fetchAccount(horizonUrl, currentKey);
      state.set({ data, error: null, isLoading: false, lastFetchedAt: new Date() });
    } catch (cause) {
      state.set({
        data: null,
        error: cause instanceof Error ? cause : new Error(String(cause)),
        isLoading: false,
        lastFetchedAt: null,
      });
    }
  };

  const store = readable<AccountState>(
    { data: null, error: null, isLoading: false, lastFetchedAt: null },
    (set) => {
      const unsubscribeState = state.subscribe(set);
      const unsubscribeKey = publicKeyStore.subscribe((value) => {
        currentKey = value;
        void executeFetch();
      });
      const unsubscribeEnabled = enabledStore.subscribe((value) => {
        enabled = value;
        void executeFetch();
      });

      if (options.refetchInterval && options.refetchInterval > 0) {
        timer = setInterval(() => {
          void executeFetch();
        }, options.refetchInterval);
      }

      return () => {
        if (timer) clearInterval(timer);
        timer = null;
        unsubscribeEnabled();
        unsubscribeKey();
        unsubscribeState();
      };
    }
  );

  return {
    data: derived(store, (value) => value.data),
    error: derived(store, (value) => value.error),
    isLoading: derived(store, (value) => value.isLoading),
    lastFetchedAt: derived(store, (value) => value.lastFetchedAt),
    balances: derived(store, (value) => value.data?.balances ?? []),
    xlmBalance: derived(store, (value) => {
      const native = value.data?.balances.find((balance) => balance.isNative);
      return native ? native.balance : null;
    }),
    refetch: executeFetch,
  };
}
