/**
 * Futurenet integration tests — run with `npm run test:futurenet` (#641).
 *
 * These tests hit live Futurenet endpoints and are excluded from the default
 * `npm test` suite. They catch protocol drift that mocked unit tests miss.
 *
 * Prerequisites:
 *   RUN_FUTURENET_TESTS=1 npm run test:futurenet
 *   FUTURENET_PUBLIC_KEY=G... (funded Futurenet account)
 */
import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useStellarAccount } from "../../hooks/useStellarAccount";

const PUBLIC_KEY = process.env["FUTURENET_PUBLIC_KEY"] ?? "";

describe.skipIf(!PUBLIC_KEY)("Futurenet integration (#641)", () => {
  it("fetches a real account from Futurenet", async () => {
    const { result } = renderHook(() =>
      useStellarAccount(PUBLIC_KEY, {
        network: "futurenet",
      }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false), {
      timeout: 15_000,
    });

    expect(result.current.error).toBeNull();
    expect(result.current.account?.account_id).toBe(PUBLIC_KEY);
  }, 20_000);
});
