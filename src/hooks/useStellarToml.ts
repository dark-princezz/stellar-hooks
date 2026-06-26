import { useCallback, useEffect, useState } from "react";
import { StellarToml } from "@stellar/stellar-sdk";

export interface StellarTomlData {
  CURRENCIES?: Array<Record<string, unknown>>;
  VALIDATORS?: Array<Record<string, unknown>>;
  DOCUMENTATION?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface UseStellarTomlReturn {
  data: StellarTomlData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useStellarToml(
  domain: string | null | undefined
): UseStellarTomlReturn {
  const [data, setData] = useState<StellarTomlData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!domain) return;
    setIsLoading(true);
    setError(null);
    try {
      const toml = await StellarToml.Resolver.resolve(domain);
      setData(toml as unknown as StellarTomlData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    if (domain) {
      refetch();
    }
  }, [domain, refetch]);

  return { data, isLoading, error, refetch };
}
