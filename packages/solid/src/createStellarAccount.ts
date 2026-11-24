import { createEffect, createMemo, createSignal, onCleanup, type Accessor } from "solid-js";
import { fetchAccount, NETWORK_CONFIGS, type NetworkConfig, type StellarAccountData } from "@stellar-hooks/core";
import { resolveValue, toError, type MaybeAccessor } from "./internal";

export interface CreateStellarAccountOptions {
  config?: NetworkConfig;
  horizonUrl?: string;
  enabled?: MaybeAccessor<boolean | undefined>;
  refetchInterval?: number;
}

export interface CreateStellarAccountReturn {
  data: Accessor<StellarAccountData | null>;
  error: Accessor<Error | null>;
  isLoading: Accessor<boolean>;
  lastFetchedAt: Accessor<Date | null>;
  balances: Accessor<StellarAccountData["balances"]>;
  xlmBalance: Accessor<string | null>;
  refetch: () => Promise<void>;
}

export function createStellarAccount(
  publicKey: MaybeAccessor<string | null | undefined>,
  options: CreateStellarAccountOptions = {}
): CreateStellarAccountReturn {
  const [data, setData] = createSignal<StellarAccountData | null>(null);
  const [error, setError] = createSignal<Error | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [lastFetchedAt, setLastFetchedAt] = createSignal<Date | null>(null);
  const [revision, setRevision] = createSignal(0);

  const netConfig = options.config ?? NETWORK_CONFIGS.testnet;
  const horizonUrl = options.horizonUrl ?? netConfig.horizonUrl;
  const enabled = () => resolveValue(options.enabled) ?? true;

  const refetch = async () => {
    const key = resolveValue(publicKey);
    if (!enabled() || !key) {
      setData(null);
      setError(null);
      setIsLoading(false);
      setLastFetchedAt(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setData(await fetchAccount(horizonUrl, key));
      setLastFetchedAt(new Date());
    } catch (cause) {
      setData(null);
      setError(toError(cause));
    } finally {
      setIsLoading(false);
    }
  };

  createEffect(() => {
    revision();
    resolveValue(publicKey);
    enabled();
    void refetch();
  });

  if (options.refetchInterval && options.refetchInterval > 0) {
    const timer = setInterval(() => {
      setRevision((value) => value + 1);
    }, options.refetchInterval);
    onCleanup(() => clearInterval(timer));
  }

  return {
    data,
    error,
    isLoading,
    lastFetchedAt,
    balances: createMemo(() => data()?.balances ?? []),
    xlmBalance: createMemo(() => {
      const native = data()?.balances.find((balance) => balance.isNative);
      return native ? native.balance : null;
    }),
    refetch,
  };
}
