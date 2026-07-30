/**
 * Normalization utilities for Freighter API version differences.
 *
 * Some Freighter extension versions return different shapes for getNetwork()/getAddress().
 * This module detects the version and normalizes responses to a consistent shape.
 */

import type { AddressResponse, NetworkDetailsResponse } from "@stellar/freighter-api";

// ─── Version Detection ─────────────────────────────────────────────────────────

let cachedApiVersion: "legacy" | "modern" | null = null;

/**
 * Detects the Freighter API version by calling getAddress and checking the response shape.
 * Legacy versions return a string directly; modern versions return { address, error }.
 */
async function detectApiVersion(): Promise<"legacy" | "modern"> {
  if (cachedApiVersion) return cachedApiVersion;

  try {
    // Dynamically import to avoid issues with mocking
    const { getAddress } = await import("@stellar/freighter-api");
    const result = await getAddress();

    // Check if result is an object with address/error fields (modern) or a string (legacy)
    if (typeof result === "object" && result !== null && ("address" in result || "error" in result)) {
      cachedApiVersion = "modern";
    } else if (typeof result === "string") {
      cachedApiVersion = "legacy";
    } else {
      // Default to modern if we can't determine
      cachedApiVersion = "modern";
    }
  } catch (error) {
    // If detection fails, assume modern API
    cachedApiVersion = "modern";
  }

  return cachedApiVersion;
}

/**
 * Resets the cached API version (useful for testing).
 */
export function resetApiVersionCache(): void {
  cachedApiVersion = null;
}

// ─── Address Normalization ───────────────────────────────────────────────────────

/**
 * Normalizes getAddress response to always return { address: string | null, error: Error | null }.
 *
 * Legacy API: returns string directly (empty string if not connected)
 * Modern API: returns { address: string | null, error: Error | null }
 */
export async function normalizeGetAddress(): Promise<{
  address: string | null;
  error: Error | null;
}> {
  const { getAddress } = await import("@stellar/freighter-api");
  const result = await getAddress();

  // Modern API shape
  if (typeof result === "object" && result !== null) {
    const response = result as AddressResponse;
    return {
      address: response.address ?? null,
      error: response.error ? new Error(response.error.message || String(response.error)) : null,
    };
  }

  // Legacy API shape (string)
  if (typeof result === "string") {
    return {
      address: result || null, // Empty string means not connected
      error: null,
    };
  }

  // Fallback
  return {
    address: null,
    error: new Error("Unexpected response shape from getAddress"),
  };
}

// ─── Network Normalization ───────────────────────────────────────────────────────

/**
 * Normalizes getNetworkDetails response to always return a consistent object shape.
 *
 * Legacy API: may return different field names or missing fields
 * Modern API: returns { network, networkPassphrase, networkUrl, sorobanRpcUrl? }
 */
export async function normalizeGetNetworkDetails(): Promise<{
  network: string | null;
  networkPassphrase: string | null;
  networkUrl: string | null;
  sorobanRpcUrl: string | null;
}> {
  const { getNetworkDetails } = await import("@stellar/freighter-api");
  const result = await getNetworkDetails();

  // Handle different possible shapes
  if (typeof result === "object" && result !== null) {
    // Modern API shape
    if ("network" in result || "networkPassphrase" in result) {
      return {
        network: result.network ?? null,
        networkPassphrase: result.networkPassphrase ?? null,
        networkUrl: result.networkUrl ?? null,
        sorobanRpcUrl: result.sorobanRpcUrl ?? null,
      };
    }

    // Legacy API shape with different field names
    if ("networkDetails" in result) {
      const details = result.networkDetails as any;
      return {
        network: details.network ?? null,
        networkPassphrase: details.networkPassphrase ?? null,
        networkUrl: details.networkUrl ?? null,
        sorobanRpcUrl: details.sorobanRpcUrl ?? null,
      };
    }
  }

  // Fallback
  return {
    network: null,
    networkPassphrase: null,
    networkUrl: null,
    sorobanRpcUrl: null,
  };
}

/**
 * Normalizes getNetwork response (shorthand for getNetworkDetails).
 */
export async function normalizeGetNetwork(): Promise<{
  network: string | null;
  networkPassphrase: string | null;
  networkUrl: string | null;
  sorobanRpcUrl: string | null;
}> {
  return normalizeGetNetworkDetails();
}

// ─── isConnected Normalization ────────────────────────────────────────────────────

/**
 * Normalizes isConnected response to always return { isConnected: boolean, error: Error | null }.
 *
 * Legacy API: returns boolean directly
 * Modern API: returns { isConnected: boolean, error: Error | null }
 */
export async function normalizeIsConnected(): Promise<{
  isConnected: boolean;
  error: Error | null;
}> {
  const { isConnected } = await import("@stellar/freighter-api");
  const result = await isConnected();

  // Modern API shape
  if (typeof result === "object" && result !== null) {
    const response = result as { isConnected: boolean; error?: Error };
    return {
      isConnected: response.isConnected ?? false,
      error: response.error ?? null,
    };
  }

  // Legacy API shape (boolean)
  if (typeof result === "boolean") {
    return {
      isConnected: result,
      error: null,
    };
  }

  // Fallback
  return {
    isConnected: false,
    error: new Error("Unexpected response shape from isConnected"),
  };
}

// ─── requestAccess Normalization ───────────────────────────────────────────────────

/**
 * Normalizes requestAccess response to always return { address: string | null, error: Error | null }.
 *
 * Legacy API: returns string directly (throws on deny)
 * Modern API: returns { address: string | null, error: Error | null }
 */
export async function normalizeRequestAccess(): Promise<{
  address: string | null;
  error: Error | null;
}> {
  const { requestAccess } = await import("@stellar/freighter-api");
  const result = await requestAccess();

  // Modern API shape
  if (typeof result === "object" && result !== null) {
    const response = result as AddressResponse;
    return {
      address: response.address ?? null,
      error: response.error ? new Error(response.error.message || String(response.error)) : null,
    };
  }

  // Legacy API shape (string)
  if (typeof result === "string") {
    return {
      address: result || null,
      error: null,
    };
  }

  // Fallback
  return {
    address: null,
    error: new Error("Unexpected response shape from requestAccess"),
  };
}
