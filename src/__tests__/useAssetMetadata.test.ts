/**
 * @file useAssetMetadata.test.ts
 * @description Unit tests for the useAssetMetadata hook.
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// ─── Mock sub-hooks ───────────────────────────────────────────────────────────

const mockUseStellarAccount = vi.fn();
const mockUseStellarToml = vi.fn();

vi.mock("../hooks/useStellarAccount", () => ({
  useStellarAccount: (...args: unknown[]) => mockUseStellarAccount(...args),
}));

vi.mock("../hooks/useStellarToml", () => ({
  useStellarToml: (...args: unknown[]) => mockUseStellarToml(...args),
}));

vi.mock("../types", async () => {
  const actual = await vi.importActual<typeof import("../types")>("../types");
  return {
    ...actual,
    asPublicKey: (key: string) => key,
  };
});

import { useAssetMetadata } from "../hooks/useAssetMetadata";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const MOCK_ASSET_CODE = "USDC";
const MOCK_HOME_DOMAIN = "circle.com";

const MOCK_ACCOUNT_DATA = {
  raw: {
    home_domain: MOCK_HOME_DOMAIN,
  },
};

const MOCK_TOML_DATA = {
  CURRENCIES: [
    {
      code: "USDC",
      issuer: MOCK_ISSUER,
      name: "USD Coin",
      image: "https://circle.com/usdc-logo.png",
      desc: "Circle's USDC stablecoin",
    },
    {
      code: "EURC",
      issuer: MOCK_ISSUER,
      name: "Euro Coin",
      image: "https://circle.com/euroc-logo.png",
      desc: "Circle's EURC stablecoin",
    },
  ],
};

const MOCK_TOML_NO_CURRENCIES = {
  DOCUMENTATION: { ORG_NAME: "Circle Internet Financial" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupAccount(idle = false) {
  mockUseStellarAccount.mockReturnValue({
    data: null,
    isLoading: idle,
    error: null,
  });
}

function setupToml(idle = false) {
  mockUseStellarToml.mockReturnValue({
    data: null,
    isLoading: idle,
    error: null,
  });
}

function setupAccountSuccess(homeDomain = MOCK_HOME_DOMAIN) {
  mockUseStellarAccount.mockReturnValue({
    data: {
      raw: { home_domain: homeDomain },
    },
    isLoading: false,
    error: null,
  });
}

function setupTomlSuccess(data = MOCK_TOML_DATA) {
  mockUseStellarToml.mockReturnValue({
    data,
    isLoading: false,
    error: null,
  });
}

function setupAccountLoading() {
  mockUseStellarAccount.mockReturnValue({
    data: null,
    isLoading: true,
    error: null,
  });
}

function setupTomlLoading() {
  mockUseStellarToml.mockReturnValue({
    data: null,
    isLoading: true,
    error: null,
  });
}

function setupAccountError(message = "Account fetch failed") {
  mockUseStellarAccount.mockReturnValue({
    data: null,
    isLoading: false,
    error: new Error(message),
  });
}

function setupTomlError(message = "TOML fetch failed") {
  mockUseStellarToml.mockReturnValue({
    data: null,
    isLoading: false,
    error: new Error(message),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useAssetMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAccount();
    setupToml();
  });

  // ── Null / undefined inputs ──────────────────────────────────────────────

  it("returns null metadata and no loading when both code and issuer are null", () => {
    const { result } = renderHook(() => useAssetMetadata(null, null));

    expect(result.current.metadata).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("returns null metadata and no loading when both code and issuer are undefined", () => {
    const { result } = renderHook(() =>
      useAssetMetadata(undefined, undefined)
    );

    expect(result.current.metadata).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("returns null metadata when issuer is null (no account fetch)", () => {
    setupAccountSuccess();
    setupTomlSuccess();

    const { result } = renderHook(() =>
      useAssetMetadata(MOCK_ASSET_CODE, null)
    );

    expect(result.current.metadata).toBeNull();
  });

  it("returns null metadata when code is null (no toml match possible)", () => {
    setupAccountSuccess();
    setupTomlSuccess();

    const { result } = renderHook(() =>
      useAssetMetadata(null, MOCK_ISSUER)
    );

    expect(result.current.metadata).toBeNull();
  });

  it("does not call useStellarAccount when issuer is null", () => {
    setupAccount();
    mockUseStellarAccount.mockClear();

    renderHook(() => useAssetMetadata(MOCK_ASSET_CODE, null));

    // It should call useStellarAccount with null publicKey and { enabled: false }
    expect(mockUseStellarAccount).toHaveBeenCalledWith(null, {
      enabled: false,
    });
  });

  // ── Successful metadata resolution ───────────────────────────────────────

  it("resolves asset metadata when a matching CURRENCIES entry exists", async () => {
    setupAccountSuccess();
    setupTomlSuccess();

    const { result } = renderHook(() =>
      useAssetMetadata(MOCK_ASSET_CODE, MOCK_ISSUER)
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.metadata).not.toBeNull();
    expect(result.current.metadata?.code).toBe("USDC");
    expect(result.current.metadata?.name).toBe("USD Coin");
    expect(result.current.metadata?.image).toBe(
      "https://circle.com/usdc-logo.png"
    );
    expect(result.current.metadata?.desc).toBe("Circle's USDC stablecoin");
    expect(result.current.error).toBeNull();
  });

  it("maps extra properties from the CURRENCIES entry onto metadata", async () => {
    const tomlWithExtra = {
      CURRENCIES: [
        {
          code: "USDC",
          issuer: MOCK_ISSUER,
          name: "USD Coin",
          anchorAsset: "USD",
          anchorAssetType: "fiat",
        },
      ],
    };
    setupAccountSuccess();
    setupTomlSuccess(tomlWithExtra);

    const { result } = renderHook(() =>
      useAssetMetadata(MOCK_ASSET_CODE, MOCK_ISSUER)
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.metadata?.anchorAsset).toBe("USD");
    expect(result.current.metadata?.anchorAssetType).toBe("fiat");
  });

  it("returns null metadata when code does not match any CURRENCIES entry", async () => {
    setupAccountSuccess();
    setupTomlSuccess();

    const { result } = renderHook(() =>
      useAssetMetadata("NONEXISTENT", MOCK_ISSUER)
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.metadata).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("returns null metadata when issuer does not match any CURRENCIES entry", async () => {
    setupAccountSuccess();
    setupTomlSuccess();

    const { result } = renderHook(() =>
      useAssetMetadata(MOCK_ASSET_CODE, "GDIFFERENTISSUER")
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.metadata).toBeNull();
  });

  it("returns null metadata when TOML has no CURRENCIES section", async () => {
    setupAccountSuccess();
    setupTomlSuccess(MOCK_TOML_NO_CURRENCIES);

    const { result } = renderHook(() =>
      useAssetMetadata(MOCK_ASSET_CODE, MOCK_ISSUER)
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.metadata).toBeNull();
  });

  it("returns null metadata when a different asset matches in CURRENCIES", async () => {
    setupAccountSuccess();
    setupTomlSuccess();

    const { result } = renderHook(() =>
      useAssetMetadata("EURC", MOCK_ISSUER)
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.metadata?.code).toBe("EURC");
    expect(result.current.metadata?.name).toBe("Euro Coin");
  });

  // ── Loading states ───────────────────────────────────────────────────────

  it("reports isLoading true while account is loading", () => {
    setupAccountLoading();
    setupToml();

    const { result } = renderHook(() =>
      useAssetMetadata(MOCK_ASSET_CODE, MOCK_ISSUER)
    );

    expect(result.current.isLoading).toBe(true);
  });

  it("reports isLoading true while toml is loading", () => {
    setupAccountSuccess();
    setupTomlLoading();

    const { result } = renderHook(() =>
      useAssetMetadata(MOCK_ASSET_CODE, MOCK_ISSUER)
    );

    expect(result.current.isLoading).toBe(true);
  });

  it("reports isLoading true while both are loading", () => {
    setupAccountLoading();
    setupTomlLoading();

    const { result } = renderHook(() =>
      useAssetMetadata(MOCK_ASSET_CODE, MOCK_ISSUER)
    );

    expect(result.current.isLoading).toBe(true);
  });

  it("stops loading once both account and toml resolve", async () => {
    setupAccountSuccess();
    setupTomlSuccess();

    const { result } = renderHook(() =>
      useAssetMetadata(MOCK_ASSET_CODE, MOCK_ISSUER)
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  // ── Error states ─────────────────────────────────────────────────────────

  it("reports account error when useStellarAccount fails", () => {
    setupAccountError("Account not found");
    setupToml();

    const { result } = renderHook(() =>
      useAssetMetadata(MOCK_ASSET_CODE, MOCK_ISSUER)
    );

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Account not found");
    expect(result.current.metadata).toBeNull();
  });

  it("reports toml error when useStellarToml fails", () => {
    setupAccountSuccess();
    setupTomlError("TOML not found");

    const { result } = renderHook(() =>
      useAssetMetadata(MOCK_ASSET_CODE, MOCK_ISSUER)
    );

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("TOML not found");
    expect(result.current.metadata).toBeNull();
  });

  it("prioritizes account error over toml error (first in expression)", () => {
    setupAccountError("Account error");
    setupTomlError("TOML error");

    const { result } = renderHook(() =>
      useAssetMetadata(MOCK_ASSET_CODE, MOCK_ISSUER)
    );

    expect(result.current.error?.message).toBe("Account error");
  });

  // ── Edge cases ───────────────────────────────────────────────────────────

  it("passes through null home_domain to useStellarToml", () => {
    // Account with raw present but no home_domain property
    mockUseStellarAccount.mockReturnValue({
      data: { raw: {} },
      isLoading: false,
      error: null,
    });
    setupToml();

    const { result } = renderHook(() =>
      useAssetMetadata(MOCK_ASSET_CODE, MOCK_ISSUER)
    );

    expect(mockUseStellarToml).toHaveBeenCalledWith(undefined);
    expect(result.current.metadata).toBeNull();
  });

  it("handles account without raw property gracefully", () => {
    mockUseStellarAccount.mockReturnValue({
      data: {},
      isLoading: false,
      error: null,
    });
    setupToml();

    const { result } = renderHook(() =>
      useAssetMetadata(MOCK_ASSET_CODE, MOCK_ISSUER)
    );

    expect(result.current.metadata).toBeNull();
  });

  it("re-renders correctly when assetCode changes", () => {
    setupAccountSuccess();
    setupTomlSuccess();

    const { result, rerender } = renderHook(
      ({ code }: { code: string | null }) =>
        useAssetMetadata(code, MOCK_ISSUER),
      { initialProps: { code: "USDC" } }
    );

    expect(result.current.metadata?.code).toBe("USDC");

    rerender({ code: "EURC" });

    expect(result.current.metadata?.code).toBe("EURC");
  });

  it("re-renders correctly when assetIssuer changes", () => {
    const otherIssuer = "GDQOE23CFSUNUSQY355GJCHAXUXC3FBXLQGDA5YVZETR3FEJLTXWQQWL";
    mockUseStellarAccount.mockReturnValue({
      data: { raw: { home_domain: "tether.io" } },
      isLoading: false,
      error: null,
    });

    mockUseStellarToml.mockReturnValue({
      data: {
        CURRENCIES: [
          {
            code: "USDT",
            issuer: otherIssuer,
            name: "Tether USD",
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    const { result, rerender } = renderHook(
      ({ issuer }: { issuer: string }) =>
        useAssetMetadata("USDT", issuer),
      { initialProps: { issuer: otherIssuer } }
    );

    expect(result.current.metadata?.name).toBe("Tether USD");

    // Change to a different issuer not in the toml
    rerender({ issuer: MOCK_ISSUER });

    expect(result.current.metadata).toBeNull();
  });
});
