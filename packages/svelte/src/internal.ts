import { readable, type Readable } from "svelte/store";

export type MaybeStore<T> = T | Readable<T>;

export function isStore<T>(value: MaybeStore<T>): value is Readable<T> {
  return typeof (value as Readable<T>)?.subscribe === "function";
}

export function toStore<T>(value: MaybeStore<T>): Readable<T> {
  return isStore(value) ? value : readable(value);
}

export function resolveEnabled(enabled: MaybeStore<boolean | undefined> | undefined): Readable<boolean> {
  if (enabled === undefined) return readable(true);
  const source = toStore(enabled);
  return {
    subscribe(run) {
      return source.subscribe((value) => run(value ?? true));
    },
  };
}
