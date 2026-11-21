/**
 * @file useInvoice.test.ts
 * @description Unit tests for useInvoice hook.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { useInvoice } from "../hooks/useInvoice";

// Mock React hooks to run outside renderHook
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useState: (initial: unknown) => {
      const val = typeof initial === "function" ? (initial as () => unknown)() : initial;
      return [val, vi.fn()];
    },
    useEffect: vi.fn(),
    useCallback: (fn: unknown) => fn,
    useMemo: (fn: () => unknown) => fn(),
    useRef: (initial: unknown) => ({ current: initial }),
  };
});

const RECIPIENT = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

describe("useInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with pending status and expected memo", () => {
    const result = useInvoice({
      recipient: RECIPIENT,
      expectedAmount: "50",
      memo: "INV-1001",
      enabled: false,
    });

    expect(result.recipient).toBe(RECIPIENT);
    expect(result.expectedAmount).toBe("50");
    expect(result.memo).toBe("INV-1001");
    expect(result.status).toBe("pending");
    expect(result.isPaid).toBe(false);
    expect(result.isPartial).toBe(false);
  });

  it("auto-generates unique memo when none is provided", () => {
    const result = useInvoice({
      recipient: RECIPIENT,
      expectedAmount: "10",
      enabled: false,
    });

    expect(result.memo).toBeDefined();
    expect(result.memo.length).toBeGreaterThan(0);
    expect(result.status).toBe("pending");
  });
});
