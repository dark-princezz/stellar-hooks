import { derived, readable, writable, type Readable } from "svelte/store";
import { fetchSorobanTokenBalance, NETWORK_CONFIGS, type NetworkConfig } from "@stellar-hooks/core";
import { resolveEnabled, toStore, type MaybeStore } from "./internal";

export interface UseSorobanTokenBalanceOptions {
  config?: NetworkConfig;
  sorobanRpcUrl?: string;
  networkPassphrase?: string;
  decimals?: number;
  enabled?: MaybeStore<boolean | undefined>;
  refetchInterval?: number;
}

export interface UseSorobanTokenBalanceReturn {
  balance: Readable<bigint | null>;
  formatted: Readable<string | null>;
  error: Readable<Error | null>;
  isLoading: Readable<boolean>;
  lastFetchedAt: Readable<Date | null>;
  refetch: () => Promise<void>;
}

interface BalanceState {
  balance: bigint | null;
  error: Error | null;
  isLoading: boolean;
  lastFetchedAt: Date | null;
}

function formatBalance(raw: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = raw / divisor;
  const fraction = raw % divisor;
  return `${whole}.${fraction.toString().padStart(decimals, "0")}`;
}

export function useSorobanTokenBalance(
  contractId: MaybeStore<string | null | undefined>,
  accountAddress: MaybeStore<string | null | undefined>,
  options: UseSorobanTokenBalanceOptions = {}
): UseSorobanTokenBalanceReturn {
  const state = writable<BalanceState>({
    balance: null,
    error: null,
    isLoading: false,
    lastFetchedAt: null,
  });

  const netConfig = options.config ?? NETWORK_CONFIGS.testnet;
  const rpcUrl = options.sorobanRpcUrl ?? netConfig.sorobanRpcUrl;
  const passphrase = options.networkPassphrase ?? netConfig.networkPassphrase;
  const decimals = options.decimals ?? 7;
  const contractStore = toStore(contractId);
  const addressStore = toStore(accountAddress);
  const enabledStore = resolveEnabled(options.enabled);

  let currentContract: string | null | undefined;
  let currentAddress: string | null | undefined;
  let enabled = true;
  let timer: ReturnType<typeof setInterval> | null = null;

  const executeFetch = async () => {
    if (!enabled || !currentContract || !currentAddress) {
      state.set({ balance: null, error: null, isLoading: false, lastFetchedAt: null });
      return;
    }

    state.update((value) => ({ ...value, isLoading: true, error: null }));

    try {
      const balance = await fetchSorobanTokenBalance(rpcUrl, passphrase, currentContract, currentAddress);
      state.set({ balance, error: null, isLoading: false, lastFetchedAt: new Date() });
    } catch (cause) {
      state.set({
        balance: null,
        error: cause instanceof Error ? cause : new Error(String(cause)),
        isLoading: false,
        lastFetchedAt: null,
      });
    }
  };

  const store = readable<BalanceState>(
    { balance: null, error: null, isLoading: false, lastFetchedAt: null },
    (set) => {
      const unsubscribeState = state.subscribe(set);
      const unsubscribeContract = contractStore.subscribe((value) => {
        currentContract = value;
        void executeFetch();
      });
      const unsubscribeAddress = addressStore.subscribe((value) => {
        currentAddress = value;
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
        unsubscribeAddress();
        unsubscribeContract();
        unsubscribeState();
      };
    }
  );

  return {
    balance: derived(store, (value) => value.balance),
    formatted: derived(store, (value) => (value.balance !== null ? formatBalance(value.balance, decimals) : null)),
    error: derived(store, (value) => value.error),
    isLoading: derived(store, (value) => value.isLoading),
    lastFetchedAt: derived(store, (value) => value.lastFetchedAt),
    refetch: executeFetch,
  };
}
