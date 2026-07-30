/**
 * Shared helpers for live Futurenet integration tests.
 */
import React from "react";
import { Keypair } from "@stellar/stellar-sdk";
import { StellarProvider } from "../../../src/context";
import { NETWORK_CONFIGS } from "../../../src/types";
import { clearMemoizedServers } from "../../../src/utils/memoizedServers";

export const FUTURENET = NETWORK_CONFIGS.futurenet;
export const FRIENDBOT_URL = "https://friendbot-futurenet.stellar.org";

export function withFuturenetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return React.createElement(
    StellarProvider,
    { network: "futurenet" },
    children,
  );
}

/** Reset memoized Horizon/RPC clients between tests. */
export function resetServers(): void {
  clearMemoizedServers();
}

/**
 * Create a fresh keypair and fund it via Futurenet Friendbot.
 * Returns the funded public key.
 */
export async function fundFreshAccount(): Promise<string> {
  const keypair = Keypair.random();
  const publicKey = keypair.publicKey();
  const url = `${FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`;
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Friendbot funding failed (${response.status}): ${body.slice(0, 200)}`,
    );
  }
  return publicKey;
}

/** Soft connectivity probe — skips the suite when Futurenet is unreachable. */
export async function assertFuturenetReachable(): Promise<void> {
  const timeoutMs = 15_000;
  const response = await Promise.race([
    fetch(FUTURENET.horizonUrl),
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Futurenet Horizon timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
    }),
  ]);
  if (!response.ok) {
    throw new Error(`Horizon responded with ${response.status}`);
  }
}
