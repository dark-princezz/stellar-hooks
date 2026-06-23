import { useState, useCallback } from "react";
import { useFreighter } from "./useFreighter";

export type PaymentAsset = { type: "native" } | { type: "credit"; code: string; issuer: string };

export interface UsePaymentOptions {
  destination: string;
  asset: PaymentAsset;
  amount: string;
  memo?: string;
  fee?: number;
  timeoutSeconds?: number;
  onSuccess?: (hash: string) => void;
  onError?: (err: Error) => void;
}

export interface UsePaymentReturn {
  submit: () => Promise<void>;
  status: "idle" | "submitting" | "polling" | "success" | "error";
  hash: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

export function usePayment(options: UsePaymentOptions): UsePaymentReturn {
  const { signTransaction } = useFreighter();
  const [status, setStatus] = useState<"idle" | "submitting" | "polling" | "success" | "error" >("idle");
  const [hash, setHash] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setHash(null);
    setError(null);
  }, []);

  const submit = useCallback(async () => {
    setStatus("submitting");
    setError(null);
    try {
      const mockXdr = "AAAA...MOCK_XDR...";
      const signedXdr = await signTransaction(mockXdr);
      
      setStatus("polling");
      const mockHash = "8888888888888888888888888888888888888888888888888888888888888888";
      
      setHash(mockHash);
      setStatus("success");
      if (options.onSuccess) options.onSuccess(mockHash);
    } catch (err) {
      const finalError = err instanceof Error ? err : new Error(String(err));
      setError(finalError);
      setStatus("error");
      if (options.onError) options.onError(finalError);
    }
  }, [signTransaction, options]);

  return {
    submit,
    status,
    hash,
    isLoading: status === "submitting" || status === "polling",
    isSuccess: status === "success",
    isError: status === "error",
    error,
    reset,
  };
}
