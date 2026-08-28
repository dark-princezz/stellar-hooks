/**
 * Snapshot tests for hook return shapes (#643).
 *
 * Guards against accidental breaking changes to a hook's public return object
 * by snapshotting the initial (loading) and settled states.
 *
 * Run: npm test -- --update-snapshots  (to regenerate after intentional changes)
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useWallet } from "../../hooks/useWallet";
import { useFreighter } from "../../hooks/useFreighter";

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn().mockResolvedValue({ isConnected: false }),
  requestAccess: vi.fn(),
  signTransaction: vi.fn(),
  getAddress: vi.fn().mockResolvedValue({ address: "" }),
  getNetwork: vi.fn().mockResolvedValue({ network: "TESTNET", networkPassphrase: "" }),
}));

describe("hook return shape snapshots (#643)", () => {
  it("useWallet initial shape", () => {
    const { result } = renderHook(() => useWallet());
    expect({
      keys: Object.keys(result.current).sort(),
      booleans: {
        isConnected: result.current.isConnected,
        isLoading: result.current.isLoading,
        isConnecting: result.current.isConnecting,
      },
      nulls: {
        activeWallet: result.current.activeWallet,
        publicKey: result.current.publicKey,
        error: result.current.error,
      },
    }).toMatchSnapshot();
  });

  it("useFreighter initial shape", async () => {
    const { result } = renderHook(() => useFreighter());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect({
      keys: Object.keys(result.current).sort(),
      connected: result.current.isConnected,
    }).toMatchSnapshot();
  });
});
