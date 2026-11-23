import type { Accessor } from "solid-js";

export type MaybeAccessor<T> = T | Accessor<T>;

export function isAccessor<T>(value: MaybeAccessor<T>): value is Accessor<T> {
  return typeof value === "function";
}

export function resolveValue<T>(value: MaybeAccessor<T>): T {
  return isAccessor(value) ? value() : value;
}

export function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}
