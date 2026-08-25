/**
 * @file useSorobanRead.test.ts
 * @description Unit tests for the useSorobanRead hook.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useCallback: (fn: unknown) => fn,
    useReducer: (_reducer: unknown, initial: unknown) => [initial, vi.fn()],
    useEffect: (fn: () => void) => {
      try {
        fn();
      } catch {
        // ignore async errors in mock effect
      }
    },
    useRef: (initial: unknown) => ({ current: initial }),
  };
});

vi.mock("@stellar/stellar-sdk", () => ({
  Account: vi.fn().mockImplementation((id: string, sequence: string) => ({ id, sequence })),
  Contract: vi.fn().mockImplementation((id: string) => ({
    call: vi.fn().mockReturnValue({ type: "scval" }),
  })),
  nativeToScVal: vi.fn().mockImplementation((val: unknown) => val),
  scValToNative: vi.fn().mockImplementation((val: unknown) => val),
  TransactionBuilder: vi.fn().mockImplementation(() => ({
    addOperation: vi.fn().mockReturnThis(),
    setTimeout: vi.fn().mockReturnThis(),
    build: vi.fn().mockReturnValue({ type: "built-tx" }),
  })),
  xdr: {
    ScVal: vi.fn(),
  },
}));

vi.mock("@stellar/stellar-sdk/rpc", () => ({
  Server: vi.fn().mockImplementation(() => ({
    getAccount: vi.fn().mockResolvedValue({ id: "GACCOUNT", sequence: "1" }),
    simulateTransaction: vi.fn().mockResolvedValue({
      result: {
        retval: "mock-result-scval",
      },
    }),
  })),
  Api: {
    isSimulationError: vi.fn().mockReturnValue(false),
  },
}));

vi.mock("../context", () => ({
  useStellarContext: () => ({
    config: {
      sorobanRpcUrl: "https://soroban-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
      network: "testnet",
    },
  }),
}));

import { useSorobanRead } from "../hooks/useSorobanRead";

describe("useSorobanRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns initial state structure correctly", () => {
    const CONTRACT_ID = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";
    const hook = useSorobanRead(CONTRACT_ID, "balance", ["GACCOUNT"]);

    expect(hook).toHaveProperty("data");
    expect(hook).toHaveProperty("result");
    expect(hook).toHaveProperty("simulation");
    expect(hook).toHaveProperty("isLoading");
    expect(hook).toHaveProperty("isRefetching");
    expect(hook).toHaveProperty("error");
    expect(typeof hook.refetch).toBe("function");
  });
});
