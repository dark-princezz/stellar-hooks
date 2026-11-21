/**
 * @file usePaymentLink.test.ts
 * @description Unit tests for usePaymentLink hook.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePaymentLink } from "../hooks/usePaymentLink";

// Mock React hooks to run outside renderHook
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useMemo: (fn: () => unknown) => fn(),
    useCallback: (fn: unknown) => fn,
  };
});

const VALID_G_ADDRESS = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const VALID_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

describe("usePaymentLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a valid SEP-0007 payment URI for native XLM", () => {
    const result = usePaymentLink({
      recipient: VALID_G_ADDRESS,
      amount: "15.5",
      asset: "native",
      memo: "test-payment",
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.uri).toContain("web+stellar:pay?");
    expect(result.uri).toContain(`destination=${VALID_G_ADDRESS}`);
    expect(result.uri).toContain("amount=15.5");
    expect(result.uri).toContain("memo=test-payment");
    expect(result.uri).toContain("memo_type=MEMO_TEXT");
    expect(result.qrValue).toBe(result.uri);
  });

  it("builds a valid payment request for credit asset", () => {
    const result = usePaymentLink({
      destination: VALID_G_ADDRESS,
      amount: "100",
      asset: {
        type: "credit",
        code: "USDC",
        issuer: VALID_ISSUER,
      },
      memo: "12345",
      memoType: "id",
    });

    expect(result.isValid).toBe(true);
    expect(result.uri).toContain("asset_code=USDC");
    expect(result.uri).toContain(`asset_issuer=${VALID_ISSUER}`);
    expect(result.uri).toContain("memo=12345");
    expect(result.uri).toContain("memo_type=MEMO_ID");
    expect(result.albedoUrl).toContain("https://albedo.link/#pay?");
    expect(result.albedoUrl).toContain("asset_code=USDC");
    expect(result.lobstrUrl).toContain("https://lobstr.co/pay?");
  });

  it("detects validation errors for invalid destination or amount", () => {
    const result = usePaymentLink({
      recipient: "INVALID_KEY",
      amount: "-10",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes("Invalid Stellar recipient address"))).toBe(true);
    expect(result.errors.some((e) => e.includes("Amount must be a positive number"))).toBe(true);
  });

  it("detects memo length validation errors", () => {
    const longMemo = "This memo is definitely way longer than 28 bytes in length!";
    const result = usePaymentLink({
      recipient: VALID_G_ADDRESS,
      memo: longMemo,
      memoType: "text",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Text memo cannot exceed 28 bytes"))).toBe(true);
  });

  it("delegates to custom openUri handler", () => {
    const openUriMock = vi.fn();
    const result = usePaymentLink({
      recipient: VALID_G_ADDRESS,
      amount: "10",
      openUri: openUriMock,
    });

    result.openInWallet("sep7");
    expect(openUriMock).toHaveBeenCalledWith(result.uri);

    result.openInWallet("albedo");
    expect(openUriMock).toHaveBeenCalledWith(result.albedoUrl);
  });
});
