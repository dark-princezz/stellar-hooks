import { createEffect, createMemo, createSignal, onCleanup, type Accessor } from "solid-js";
import { fetchSorobanTokenBalance, NETWORK_CONFIGS, type NetworkConfig } from "@stellar-hooks/core";
import { resolveValue, toError, type MaybeAccessor } from "./internal";

export interface CreateSorobanTokenBalanceOptions {
  config?: NetworkConfig;
  sorobanRpcUrl?: string;
  networkPassphrase?: string;
  decimals?: number;
  enabled?: MaybeAccessor<boolean | undefined>;
  refetchInterval?: number;
}

export interface CreateSorobanTokenBalanceReturn {
  balance: Accessor<bigint | null>;
  formatted: Accessor<string | null>;
  error: Accessor<Error | null>;
  isLoading: Accessor<boolean>;
  lastFetchedAt: Accessor<Date | null>;
  refetch: () => Promise<void>;
}

function formatBalance(raw: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = raw / divisor;
  const fraction = raw % divisor;
  return `${whole}.${fraction.toString().padStart(decimals, "0")}`;
}

export function createSorobanTokenBalance(
  contractId: MaybeAccessor<string | null | undefined>,
  accountAddress: MaybeAccessor<string | null | undefined>,
  options: CreateSorobanTokenBalanceOptions = {}
): CreateSorobanTokenBalanceReturn {
  const [balance, setBalance] = createSignal<bigint | null>(null);
  const [error, setError] = createSignal<Error | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [lastFetchedAt, setLastFetchedAt] = createSignal<Date | null>(null);
  const [revision, setRevision] = createSignal(0);

  const netConfig = options.config ?? NETWORK_CONFIGS.testnet;
  const rpcUrl = options.sorobanRpcUrl ?? netConfig.sorobanRpcUrl;
  const passphrase = options.networkPassphrase ?? netConfig.networkPassphrase;
  const decimals = options.decimals ?? 7;
  const enabled = () => resolveValue(options.enabled) ?? true;

  const refetch = async () => {
    const contract = resolveValue(contractId);
    const address = resolveValue(accountAddress);
    if (!enabled() || !contract || !address) {
      setBalance(null);
      setError(null);
      setIsLoading(false);
      setLastFetchedAt(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setBalance(await fetchSorobanTokenBalance(rpcUrl, passphrase, contract, address));
      setLastFetchedAt(new Date());
    } catch (cause) {
      setBalance(null);
      setError(toError(cause));
    } finally {
      setIsLoading(false);
    }
  };

  createEffect(() => {
    revision();
    resolveValue(contractId);
    resolveValue(accountAddress);
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
    balance,
    formatted: createMemo(() => {
      const raw = balance();
      return raw !== null ? formatBalance(raw, decimals) : null;
    }),
    error,
    isLoading,
    lastFetchedAt,
    refetch,
  };
}
