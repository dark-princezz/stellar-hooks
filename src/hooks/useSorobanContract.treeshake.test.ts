import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Static guard for the bundle-size property of `useSorobanContract`.
 *
 * The hook is a leaf of the public API surface. If it imported from the root
 * `@stellar/stellar-sdk` barrel, CJS consumers could not tree-shake it and the
 * entire SDK (Horizon, SEP helpers, axios, eventsource) would be pulled into
 * their bundle. This test fails if the heavy barrel import is ever reintroduced.
 */
describe("useSorobanContract bundle footprint", () => {
  const file = fileURLToPath(
    new URL("./useSorobanContract.ts", import.meta.url)
  );
  const source = readFileSync(file, "utf8");

  it("never imports the root @stellar/stellar-sdk barrel", () => {
    expect(source).not.toMatch(/from\s+["']@stellar\/stellar-sdk["']/);
  });

  it("imports codec/transaction primitives from the lean minimal subpath", () => {
    expect(source).toMatch(/from\s+["']@stellar\/stellar-sdk\/minimal["']/);
  });

  it("keeps RPC usage on the dedicated rpc subpath", () => {
    expect(source).toMatch(/from\s+["']@stellar\/stellar-sdk\/rpc["']/);
  });
});
