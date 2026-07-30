import { useEffect, useRef } from "react";
import { useOptionalStellarHookDebugContext } from "../context";

export interface HookActivityDebugOptions {
  name: string;
  status: string;
  error: unknown;
}

function isDevEnvironment(): boolean {
  return typeof process === "undefined" || process.env.NODE_ENV !== "production";
}

function normalizeError(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    return typeof maybeMessage === "string" ? maybeMessage : String(error);
  }

  return String(error);
}

export function useHookActivityDebug({
  name,
  status,
  error,
}: HookActivityDebugOptions): void {
  const debugContext = useOptionalStellarHookDebugContext();
  const idRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isDevEnvironment() || !debugContext) {
      return;
    }

    const entry = {
      name,
      status,
      lastError: normalizeError(error),
    };

    if (!idRef.current) {
      idRef.current = debugContext.register(entry);
      return;
    }

    debugContext.update(idRef.current, entry);
  }, [debugContext, error, name, status]);

  useEffect(
    () => () => {
      if (!debugContext || !idRef.current) {
        return;
      }

      debugContext.unregister(idRef.current);
      idRef.current = null;
    },
    [debugContext],
  );
}
