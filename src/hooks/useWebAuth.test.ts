/**
 * @file useWebAuth.test.ts
 * @description Unit tests for the useWebAuth hook (SEP-10 Web Authentication).
 * @package stellar-hooks
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ─── Constants ────────────────────────────────────────────────────────────────
// NOTE: these must be defined before vi.mock() calls that reference them,
// because vi.mock() is hoisted to the top of the file by the transformer.
// Values used *inside* vi.hoisted() factories must be literals, not references
// to file-level constants.

const MOCK_PUBLIC_KEY = "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ";
const MOCK_PASSPHRASE = "Test SDF Network ; September 2015";
const MOCK_CHALLENGE_XDR = "AAAAAQAAAAA...challenge-xdr";
const MOCK_SIGNED_XDR = "AAAAAQAAAAA...signed-xdr";
const MOCK_JWT = "eyJhbGciOiJIUzI1NiJ9.test.token";
const MOCK_SIGNING_KEY = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGWKX2ZBDTUMDC2VDHEAB7";
const WEB_AUTH_ENDPOINT = "https://testanchor.stellar.org/auth";
const HOME_DOMAIN = "testanchor.stellar.org";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// signTransaction mock — default resolves to a literal, not a constant reference
const mockSignTransaction = vi.hoisted(() =>
  vi.fn().mockResolvedValue("AAAAAQAAAAA...signed-xdr")
);

// Track which public key Freighter "has" in each test
let mockFreighterPublicKey: string | null = "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ";

vi.mock("./useFreighter", () => ({
  useFreighter: () => ({
    get publicKey() {
      return mockFreighterPublicKey;
    },
    signTransaction: mockSignTransaction,
  }),
}));

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useOptionalStellarContext: () => ({
    config: { networkPassphrase: "Test SDF Network ; September 2015" },
  }),
}));

// Mock WebAuth.readChallengeTx — unit-test the hook, not the SDK
const mockReadChallengeTx = vi.hoisted(() =>
  vi.fn().mockReturnValue({
    tx: {},
    clientAccountID: "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ",
    matchedHomeDomain: "testanchor.stellar.org",
    memo: null,
  })
);

vi.mock("@stellar/stellar-sdk", () => ({
  WebAuth: {
    readChallengeTx: (...args: unknown[]) => mockReadChallengeTx(...args),
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Import after mocks ───────────────────────────────────────────────────────

import { useWebAuth } from "./useWebAuth";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeJsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    statusText: ok ? "OK" : "Bad Request",
    json: () => Promise.resolve(body),
  } as Response);
}

/**
 * Sets up a full happy-path fetch sequence:
 * 1. GET /auth        → signing key info
 * 2. GET /auth?account=… → challenge transaction
 * 3. POST /auth       → JWT
 */
function setupHappyPathFetch() {
  mockFetch
    .mockResolvedValueOnce(
      makeJsonResponse({
        transaction: MOCK_CHALLENGE_XDR,
        network_passphrase: MOCK_PASSPHRASE,
      })
    )
    .mockResolvedValueOnce(makeJsonResponse({ signing_key: MOCK_SIGNING_KEY }))
    .mockResolvedValueOnce(makeJsonResponse({ token: MOCK_JWT }));
}

function renderWebAuth(overrides: Partial<Parameters<typeof useWebAuth>[0]> = {}) {
  return renderHook(() =>
    useWebAuth({
      webAuthEndpoint: WEB_AUTH_ENDPOINT,
      homeDomain: HOME_DOMAIN,
      ...overrides,
    })
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useWebAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    mockFreighterPublicKey = MOCK_PUBLIC_KEY;
    // Restore default signTransaction behaviour after each test
    mockSignTransaction.mockResolvedValue(MOCK_SIGNED_XDR);
    mockReadChallengeTx.mockReturnValue({
      tx: {},
      clientAccountID: MOCK_PUBLIC_KEY,
      matchedHomeDomain: HOME_DOMAIN,
      memo: null,
    });
  });

  // ── Initial state ─────────────────────────────────────────────────────────

  it("returns idle initial state", () => {
    const { result } = renderWebAuth();

    expect(result.current.status).toBe("idle");
    expect(result.current.token).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(typeof result.current.authenticate).toBe("function");
    expect(typeof result.current.reset).toBe("function");
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it("completes the full SEP-10 flow and returns a JWT token", async () => {
    setupHappyPathFetch();

    const onSuccess = vi.fn();
    const { result } = renderWebAuth({ onSuccess });

    await act(async () => {
      await result.current.authenticate();
    });

    expect(result.current.status).toBe("success");
    expect(result.current.token).toBe(MOCK_JWT);
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(onSuccess).toHaveBeenCalledWith(MOCK_JWT);
  });

  it("calls WebAuth.readChallengeTx with the correct arguments", async () => {
    setupHappyPathFetch();
    const { result } = renderWebAuth();

    await act(async () => {
      await result.current.authenticate();
    });

    expect(mockReadChallengeTx).toHaveBeenCalledWith(
      MOCK_CHALLENGE_XDR,
      MOCK_SIGNING_KEY,
      MOCK_PASSPHRASE,
      HOME_DOMAIN,
      WEB_AUTH_ENDPOINT
    );
  });

  it("signs the challenge with the correct network passphrase", async () => {
    setupHappyPathFetch();
    const { result } = renderWebAuth();

    await act(async () => {
      await result.current.authenticate();
    });

    expect(mockSignTransaction).toHaveBeenCalledWith(
      MOCK_CHALLENGE_XDR,
      { networkPassphrase: MOCK_PASSPHRASE }
    );
  });

  it("POSTs the signed XDR to the web auth endpoint", async () => {
    setupHappyPathFetch();
    const { result } = renderWebAuth();

    await act(async () => {
      await result.current.authenticate();
    });

    const postCall = mockFetch.mock.calls.find(
      ([url, opts]: [string, RequestInit]) =>
        url === WEB_AUTH_ENDPOINT && opts?.method === "POST"
    );
    expect(postCall).toBeTruthy();
    const body = JSON.parse(postCall![1].body as string) as { transaction: string };
    expect(body.transaction).toBe(MOCK_SIGNED_XDR);
  });

  it("uses server-returned network_passphrase when present", async () => {
    const serverPassphrase = "Public Global Stellar Network ; September 2015";
    mockFetch
      .mockResolvedValueOnce(
        makeJsonResponse({
          transaction: MOCK_CHALLENGE_XDR,
          network_passphrase: serverPassphrase,
        })
      )
      .mockResolvedValueOnce(makeJsonResponse({ signing_key: MOCK_SIGNING_KEY }))
      .mockResolvedValueOnce(makeJsonResponse({ token: MOCK_JWT }));

    const { result } = renderWebAuth();

    await act(async () => {
      await result.current.authenticate();
    });

    expect(mockSignTransaction).toHaveBeenCalledWith(
      MOCK_CHALLENGE_XDR,
      { networkPassphrase: serverPassphrase }
    );
  });

  it("accepts a publicKey override instead of the Freighter key", async () => {
    const customKey = "GBZVR2QOAB4BKUQM5BLPGPWTFP47LKQKNS46NTBFK5DCVFJ7SFWFCL7";
    setupHappyPathFetch();

    const { result } = renderWebAuth({
      publicKey: customKey as Parameters<typeof useWebAuth>[0]["publicKey"],
    });

    await act(async () => {
      await result.current.authenticate();
    });

    const challengeCall = mockFetch.mock.calls.find(
      ([url]: [string]) => url.includes(`account=${customKey}`)
    );
    expect(challengeCall).toBeTruthy();
  });

  // ── Error cases ───────────────────────────────────────────────────────────

  it("sets error state when no wallet is connected", async () => {
    mockFreighterPublicKey = null;
    const onError = vi.fn();
    const { result } = renderWebAuth({ onError });

    await act(async () => {
      await result.current.authenticate();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toMatch(/no wallet connected/i);
    expect(onError).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sets error state when webAuthEndpoint is empty", async () => {
    const onError = vi.fn();
    const { result } = renderWebAuth({ webAuthEndpoint: "", onError });

    await act(async () => {
      await result.current.authenticate();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error?.message).toMatch(/webAuthEndpoint is required/i);
    expect(onError).toHaveBeenCalled();
  });

  it("sets error state when the signing-key fetch returns non-OK status", async () => {
    const onError = vi.fn();
    mockFetch
      .mockResolvedValueOnce(
        makeJsonResponse({
          transaction: MOCK_CHALLENGE_XDR,
          network_passphrase: MOCK_PASSPHRASE,
        })
      )
      .mockResolvedValueOnce(
        makeJsonResponse({ error: "server error" }, false, 500)
      );

    const { result } = renderWebAuth({ onError });

    await act(async () => {
      await result.current.authenticate();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toMatch(/500/);
    expect(onError).toHaveBeenCalled();
  });

  it("sets error state when the signing key is missing from server info", async () => {
    mockFetch
      .mockResolvedValueOnce(
        makeJsonResponse({
          transaction: MOCK_CHALLENGE_XDR,
          network_passphrase: MOCK_PASSPHRASE,
        })
      )
      .mockResolvedValueOnce(makeJsonResponse({ version: "1.0" })); // no signing_key

    const { result } = renderWebAuth();

    await act(async () => {
      await result.current.authenticate();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error?.message).toMatch(/signing_key/i);
  });

  it("sets error state when the challenge fetch fails with a non-OK status", async () => {
    const onError = vi.fn();
    mockFetch.mockResolvedValueOnce(
      makeJsonResponse({ error: "account not found" }, false, 404)
    );

    const { result } = renderWebAuth({ onError });

    await act(async () => {
      await result.current.authenticate();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toMatch(/404/);
    expect(onError).toHaveBeenCalled();
  });

  it("sets error state when the challenge response is missing the transaction field", async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ network_passphrase: MOCK_PASSPHRASE }));

    const { result } = renderWebAuth();

    await act(async () => {
      await result.current.authenticate();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error?.message).toMatch(/missing required `transaction`/i);
  });

  it("sets error state when the server returns an error in the challenge body", async () => {
    mockFetch.mockResolvedValueOnce(makeJsonResponse({ error: "invalid account" }));

    const { result } = renderWebAuth();

    await act(async () => {
      await result.current.authenticate();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error?.message).toMatch(/invalid account/i);
  });

  it("sets error state when WebAuth.readChallengeTx throws", async () => {
    mockFetch
      .mockResolvedValueOnce(
        makeJsonResponse({
          transaction: MOCK_CHALLENGE_XDR,
          network_passphrase: MOCK_PASSPHRASE,
        })
      )
      .mockResolvedValueOnce(makeJsonResponse({ signing_key: MOCK_SIGNING_KEY }));
    mockReadChallengeTx.mockImplementationOnce(() => {
      throw new Error("Invalid challenge: home domain mismatch");
    });

    const { result } = renderWebAuth();

    await act(async () => {
      await result.current.authenticate();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error?.message).toBe("Invalid challenge: home domain mismatch");
    expect(mockSignTransaction).not.toHaveBeenCalled();
  });

  it("sets error state when the user rejects signing in Freighter", async () => {
    mockFetch
      .mockResolvedValueOnce(
        makeJsonResponse({
          transaction: MOCK_CHALLENGE_XDR,
          network_passphrase: MOCK_PASSPHRASE,
        })
      )
      .mockResolvedValueOnce(makeJsonResponse({ signing_key: MOCK_SIGNING_KEY }));
    mockSignTransaction.mockRejectedValueOnce(new Error("User rejected the request"));

    const { result } = renderWebAuth();

    await act(async () => {
      await result.current.authenticate();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error?.message).toMatch(/user rejected/i);
  });

  it("sets error state when the token POST returns a non-OK status", async () => {
    mockFetch
      .mockResolvedValueOnce(
        makeJsonResponse({
          transaction: MOCK_CHALLENGE_XDR,
          network_passphrase: MOCK_PASSPHRASE,
        })
      )
      .mockResolvedValueOnce(makeJsonResponse({ signing_key: MOCK_SIGNING_KEY }))
      .mockResolvedValueOnce(
        makeJsonResponse({ error: "signature invalid" }, false, 400)
      );

    const { result } = renderWebAuth();

    await act(async () => {
      await result.current.authenticate();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error?.message).toMatch(/400/);
  });

  it("sets error state when the token response is missing the token field", async () => {
    mockFetch
      .mockResolvedValueOnce(
        makeJsonResponse({
          transaction: MOCK_CHALLENGE_XDR,
          network_passphrase: MOCK_PASSPHRASE,
        })
      )
      .mockResolvedValueOnce(makeJsonResponse({ signing_key: MOCK_SIGNING_KEY }))
      .mockResolvedValueOnce(makeJsonResponse({ other_field: "unexpected" }));

    const { result } = renderWebAuth();

    await act(async () => {
      await result.current.authenticate();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error?.message).toMatch(/missing required `token`/i);
  });

  it("sets error state when the server returns an error in the token body", async () => {
    mockFetch
      .mockResolvedValueOnce(
        makeJsonResponse({
          transaction: MOCK_CHALLENGE_XDR,
          network_passphrase: MOCK_PASSPHRASE,
        })
      )
      .mockResolvedValueOnce(makeJsonResponse({ signing_key: MOCK_SIGNING_KEY }))
      .mockResolvedValueOnce(makeJsonResponse({ error: "signature_verification_failed" }));

    const { result } = renderWebAuth();

    await act(async () => {
      await result.current.authenticate();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error?.message).toMatch(/signature_verification_failed/i);
  });

  // ── reset ─────────────────────────────────────────────────────────────────

  it("reset() clears token, error, and status back to idle after success", async () => {
    setupHappyPathFetch();
    const { result } = renderWebAuth();

    await act(async () => {
      await result.current.authenticate();
    });

    expect(result.current.status).toBe("success");

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.token).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("reset() clears error state after a failed authentication", async () => {
    mockFreighterPublicKey = null;
    const { result } = renderWebAuth();

    await act(async () => {
      await result.current.authenticate();
    });

    expect(result.current.status).toBe("error");

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  // ── camelCase signing key alias ───────────────────────────────────────────

  it("accepts camelCase `signingKey` in addition to snake_case `signing_key`", async () => {
    mockFetch
      .mockResolvedValueOnce(
        makeJsonResponse({
          transaction: MOCK_CHALLENGE_XDR,
          network_passphrase: MOCK_PASSPHRASE,
        })
      )
      .mockResolvedValueOnce(makeJsonResponse({ signingKey: MOCK_SIGNING_KEY }))
      .mockResolvedValueOnce(makeJsonResponse({ token: MOCK_JWT }));

    const { result } = renderWebAuth();

    await act(async () => {
      await result.current.authenticate();
    });

    expect(result.current.status).toBe("success");
    expect(result.current.token).toBe(MOCK_JWT);
  });
});
