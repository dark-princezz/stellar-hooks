/**
 * @file useWebAuth.ts
 * @description Hook for SEP-10 Web Authentication — challenge/response JWT flow.
 * @see https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md
 * @package stellar-hooks
 * @license MIT
 */

import { useCallback, useState } from "react";
import { WebAuth } from "@stellar/stellar-sdk";
import { useFreighter } from "./useFreighter";
import { useOptionalStellarContext } from "../context";
import { UserRejectedError, isUserRejectionMessage } from "../utils/errors";
import type { StellarPublicKey } from "../types";
import { unsafeAsXdrString } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Status of the SEP-10 authentication flow.
 *
 * - `"idle"` — no authentication has been attempted yet (or has been reset).
 * - `"fetching_challenge"` — requesting the challenge transaction from the server.
 * - `"signing"` — waiting for the user to sign the challenge in their wallet.
 * - `"submitting"` — posting the signed transaction to the server for a JWT.
 * - `"success"` — JWT received and stored in `token`.
 * - `"error"` — the flow failed; inspect `error`.
 */
export type WebAuthStatus =
  | "idle"
  | "fetching_challenge"
  | "signing"
  | "submitting"
  | "success"
  | "error";

export interface UseWebAuthOptions {
  /**
   * The SEP-10 `WEB_AUTH_ENDPOINT` URL (e.g. `https://testanchor.stellar.org/auth`).
   * Typically sourced from `useStellarToml().webAuthEndpoint`.
   */
  webAuthEndpoint: string;

  /**
   * The home domain expected in the challenge — the anchor's FQDN without a
   * trailing slash (e.g. `"testanchor.stellar.org"`). Required by SEP-10 to
   * validate that the challenge originated from the correct server.
   */
  homeDomain: string;

  /**
   * Override the public key used for authentication. Defaults to the currently
   * connected Freighter public key.
   */
  publicKey?: StellarPublicKey;

  /**
   * Stellar network passphrase used to validate and sign the challenge.
   * Falls back to the active `<StellarProvider>` network passphrase, then to
   * the testnet passphrase.
   */
  networkPassphrase?: string;

  /**
   * Called when the JWT is successfully obtained.
   * @param token - The JWT returned by the anchor's auth endpoint.
   */
  onSuccess?: (token: string) => void;

  /**
   * Called when any step in the auth flow fails.
   * @param error - The error that caused the failure.
   */
  onError?: (error: Error) => void;
}

export interface UseWebAuthReturn {
  /**
   * Call this to start (or retry) the full SEP-10 authentication flow:
   * fetch challenge → sign → submit → store JWT.
   */
  authenticate: () => Promise<void>;

  /** Current status of the authentication flow. */
  status: WebAuthStatus;

  /** The JWT returned by the server on success. `null` until `status === "success"`. */
  token: string | null;

  /** `true` while any step is in flight (`fetching_challenge | signing | submitting`). */
  isLoading: boolean;

  /** `true` when `status === "success"`. */
  isSuccess: boolean;

  /** `true` when `status === "error"`. */
  isError: boolean;

  /** The error that caused the last failure, or `null`. */
  error: Error | null;

  /**
   * Reset the hook back to `"idle"` state, clearing `token`, `error`, and
   * status so the user can retry.
   */
  reset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Implements the full SEP-10 Web Authentication challenge/response flow.
 *
 * Steps:
 * 1. `GET {webAuthEndpoint}?account={publicKey}` — fetch challenge transaction.
 * 2. Validate the challenge with the Stellar SDK (`WebAuth.readChallengeTx`).
 * 3. Sign the challenge via Freighter.
 * 4. `POST {webAuthEndpoint}` with the signed XDR — exchange for a JWT.
 *
 * The resulting JWT can be passed as a `Bearer` token to SEP-6 / SEP-12 / SEP-24
 * anchor endpoints.
 *
 * @example
 * ```tsx
 * import { useWebAuth, useStellarToml } from "stellar-hooks";
 *
 * function AnchorLogin() {
 *   const { webAuthEndpoint, signingKey } = useStellarToml("testanchor.stellar.org");
 *   const { authenticate, token, status, isLoading, error } = useWebAuth({
 *     webAuthEndpoint: webAuthEndpoint ?? "",
 *     homeDomain: "testanchor.stellar.org",
 *   });
 *
 *   if (token) return <p>Authenticated! Token: {token.slice(0, 20)}…</p>;
 *
 *   return (
 *     <button onClick={authenticate} disabled={isLoading || !webAuthEndpoint}>
 *       {isLoading ? "Authenticating…" : "Sign In with Stellar"}
 *     </button>
 *   );
 * }
 * ```
 */
export function useWebAuth(options: UseWebAuthOptions): UseWebAuthReturn {
  const {
    webAuthEndpoint,
    homeDomain,
    publicKey: overridePublicKey,
    networkPassphrase: overridePassphrase,
    onSuccess,
    onError,
  } = options;

  const stellarContext = useOptionalStellarContext();
  const { publicKey: freighterPublicKey, signTransaction } = useFreighter();

  const [status, setStatus] = useState<WebAuthStatus>("idle");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const effectivePublicKey = overridePublicKey ?? freighterPublicKey;
  const effectivePassphrase =
    overridePassphrase ??
    stellarContext?.config.networkPassphrase ??
    "Test SDF Network ; September 2015";

  const reset = useCallback(() => {
    setStatus("idle");
    setToken(null);
    setError(null);
  }, []);

  const authenticate = useCallback(async () => {
    if (!effectivePublicKey) {
      const err = new Error(
        "No wallet connected. Connect Freighter before calling authenticate()."
      );
      setError(err);
      setStatus("error");
      onError?.(err);
      return;
    }

    if (!webAuthEndpoint) {
      const err = new Error(
        "webAuthEndpoint is required. Fetch it from the anchor's stellar.toml."
      );
      setError(err);
      setStatus("error");
      onError?.(err);
      return;
    }

    setError(null);
    setToken(null);

    try {
      // ── Step 1: Fetch the challenge transaction ─────────────────────────
      setStatus("fetching_challenge");

      const challengeUrl = new URL(webAuthEndpoint);
      challengeUrl.searchParams.set("account", effectivePublicKey);

      const challengeRes = await fetch(challengeUrl.toString());
      if (!challengeRes.ok) {
        throw new Error(
          `SEP-10 challenge request failed: ${challengeRes.status} ${challengeRes.statusText}`
        );
      }

      const challengeJson = (await challengeRes.json()) as {
        transaction?: string;
        network_passphrase?: string;
        error?: string;
      };

      if (challengeJson.error) {
        throw new Error(`SEP-10 server error: ${challengeJson.error}`);
      }

      if (!challengeJson.transaction) {
        throw new Error(
          "SEP-10 challenge response missing required `transaction` field."
        );
      }

      // Use the server-returned passphrase if present, otherwise fall back to
      // our configured one. This handles cases where the anchor's toml
      // passphrase differs from what was configured.
      const challengePassphrase =
        challengeJson.network_passphrase ?? effectivePassphrase;

      // ── Step 2: Validate the challenge ──────────────────────────────────
      // readChallengeTx verifies the server signing key, home domain, and
      // transaction structure to prevent replay and spoofing attacks.
      const serverSigningKey = await fetchServerSigningKey(webAuthEndpoint);

      WebAuth.readChallengeTx(
        challengeJson.transaction,
        serverSigningKey,
        challengePassphrase,
        homeDomain,
        webAuthEndpoint
      );

      // ── Step 3: Sign the challenge via Freighter ─────────────────────────
      setStatus("signing");

      let signedXdr: string;
      try {
        signedXdr = await signTransaction(
          unsafeAsXdrString(challengeJson.transaction),
          { networkPassphrase: challengePassphrase }
        );
      } catch (sigErr) {
        const message =
          sigErr instanceof Error ? sigErr.message : String(sigErr);
        throw isUserRejectionMessage(message)
          ? new UserRejectedError(message, {
              cause: sigErr,
              walletId: "freighter",
              operation: "signTransaction",
            })
          : sigErr instanceof Error
          ? sigErr
          : new Error(message);
      }

      // ── Step 4: Submit signed transaction, receive JWT ───────────────────
      setStatus("submitting");

      const tokenRes = await fetch(webAuthEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction: signedXdr }),
      });

      if (!tokenRes.ok) {
        throw new Error(
          `SEP-10 token request failed: ${tokenRes.status} ${tokenRes.statusText}`
        );
      }

      const tokenJson = (await tokenRes.json()) as {
        token?: string;
        error?: string;
      };

      if (tokenJson.error) {
        throw new Error(`SEP-10 server error: ${tokenJson.error}`);
      }

      if (!tokenJson.token) {
        throw new Error(
          "SEP-10 token response missing required `token` field."
        );
      }

      // ── Success ──────────────────────────────────────────────────────────
      setToken(tokenJson.token);
      setStatus("success");
      onSuccess?.(tokenJson.token);
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err));
      setError(wrapped);
      setStatus("error");
      onError?.(wrapped);
    }
  }, [
    effectivePublicKey,
    webAuthEndpoint,
    homeDomain,
    effectivePassphrase,
    signTransaction,
    onSuccess,
    onError,
  ]);

  return {
    authenticate,
    status,
    token,
    isLoading:
      status === "fetching_challenge" ||
      status === "signing" ||
      status === "submitting",
    isSuccess: status === "success",
    isError: status === "error",
    error,
    reset,
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Fetch the server's signing key from the SEP-10 endpoint's `GET /` response.
 * The SEP-10 spec requires the challenge to be signed by a key that can be
 * verified; the server must publish its signing key at the same endpoint.
 *
 * Many anchors also publish it in their stellar.toml as `SIGNING_KEY`, but
 * fetching it directly from the auth endpoint allows us to work without
 * requiring callers to provide it separately.
 */
async function fetchServerSigningKey(webAuthEndpoint: string): Promise<string> {
  const infoRes = await fetch(webAuthEndpoint);
  if (!infoRes.ok) {
    throw new Error(
      `SEP-10: failed to fetch server info from ${webAuthEndpoint}: ` +
        `${infoRes.status} ${infoRes.statusText}`
    );
  }

  const infoJson = (await infoRes.json()) as {
    signing_key?: string;
    signingKey?: string;
    error?: string;
  };

  // Some anchors use camelCase, some use snake_case
  const signingKey = infoJson.signing_key ?? infoJson.signingKey;
  if (!signingKey) {
    throw new Error(
      "SEP-10: server did not return a `signing_key` in its auth endpoint info response."
    );
  }

  return signingKey;
}
