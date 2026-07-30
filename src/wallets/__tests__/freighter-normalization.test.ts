import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  normalizeGetAddress,
  normalizeGetNetworkDetails,
  normalizeIsConnected,
  normalizeRequestAccess,
  resetApiVersionCache,
} from "../freighter-normalization";

// Mock @stellar/freighter-api
vi.mock("@stellar/freighter-api", () => ({
  getAddress: vi.fn(),
  getNetworkDetails: vi.fn(),
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
}));

import { getAddress, getNetworkDetails, isConnected, requestAccess } from "@stellar/freighter-api";

describe("freighter-normalization", () => {
  beforeEach(() => {
    resetApiVersionCache();
    vi.clearAllMocks();
  });

  describe("normalizeGetAddress", () => {
    it("normalizes modern API response with address", async () => {
      vi.mocked(getAddress).mockResolvedValue({
        address: "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ",
        error: null,
      });

      const result = await normalizeGetAddress();

      expect(result).toEqual({
        address: "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ",
        error: null,
      });
    });

    it("normalizes modern API response with null address", async () => {
      vi.mocked(getAddress).mockResolvedValue({
        address: null,
        error: null,
      });

      const result = await normalizeGetAddress();

      expect(result).toEqual({
        address: null,
        error: null,
      });
    });

    it("normalizes modern API response with error", async () => {
      vi.mocked(getAddress).mockResolvedValue({
        address: null,
        error: { message: "Not connected" },
      });

      const result = await normalizeGetAddress();

      expect(result.address).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("Not connected");
    });

    it("normalizes legacy API response (string)", async () => {
      vi.mocked(getAddress).mockResolvedValue(
        "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ"
      );

      const result = await normalizeGetAddress();

      expect(result).toEqual({
        address: "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ",
        error: null,
      });
    });

    it("normalizes legacy API response with empty string", async () => {
      vi.mocked(getAddress).mockResolvedValue("");

      const result = await normalizeGetAddress();

      expect(result).toEqual({
        address: null,
        error: null,
      });
    });

    it("handles unexpected response shape", async () => {
      vi.mocked(getAddress).mockResolvedValue(null);

      const result = await normalizeGetAddress();

      expect(result.address).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain("Unexpected response shape");
    });
  });

  describe("normalizeGetNetworkDetails", () => {
    it("normalizes modern API response", async () => {
      vi.mocked(getNetworkDetails).mockResolvedValue({
        network: "TESTNET",
        networkPassphrase: "Test SDF Network ; September 2015",
        networkUrl: "https://horizon-testnet.stellar.org",
        sorobanRpcUrl: "https://soroban-testnet.stellar.org",
      });

      const result = await normalizeGetNetworkDetails();

      expect(result).toEqual({
        network: "TESTNET",
        networkPassphrase: "Test SDF Network ; September 2015",
        networkUrl: "https://horizon-testnet.stellar.org",
        sorobanRpcUrl: "https://soroban-testnet.stellar.org",
      });
    });

    it("normalizes modern API response with null fields", async () => {
      vi.mocked(getNetworkDetails).mockResolvedValue({
        network: null,
        networkPassphrase: null,
        networkUrl: null,
        sorobanRpcUrl: null,
      });

      const result = await normalizeGetNetworkDetails();

      expect(result).toEqual({
        network: null,
        networkPassphrase: null,
        networkUrl: null,
        sorobanRpcUrl: null,
      });
    });

    it("normalizes legacy API response with nested networkDetails", async () => {
      vi.mocked(getNetworkDetails).mockResolvedValue({
        networkDetails: {
          network: "TESTNET",
          networkPassphrase: "Test SDF Network ; September 2015",
          networkUrl: "https://horizon-testnet.stellar.org",
        },
      });

      const result = await normalizeGetNetworkDetails();

      expect(result).toEqual({
        network: "TESTNET",
        networkPassphrase: "Test SDF Network ; September 2015",
        networkUrl: "https://horizon-testnet.stellar.org",
        sorobanRpcUrl: null,
      });
    });

    it("handles unexpected response shape", async () => {
      vi.mocked(getNetworkDetails).mockResolvedValue(null);

      const result = await normalizeGetNetworkDetails();

      expect(result).toEqual({
        network: null,
        networkPassphrase: null,
        networkUrl: null,
        sorobanRpcUrl: null,
      });
    });
  });

  describe("normalizeIsConnected", () => {
    it("normalizes modern API response with true", async () => {
      vi.mocked(isConnected).mockResolvedValue({
        isConnected: true,
        error: null,
      });

      const result = await normalizeIsConnected();

      expect(result).toEqual({
        isConnected: true,
        error: null,
      });
    });

    it("normalizes modern API response with false", async () => {
      vi.mocked(isConnected).mockResolvedValue({
        isConnected: false,
        error: null,
      });

      const result = await normalizeIsConnected();

      expect(result).toEqual({
        isConnected: false,
        error: null,
      });
    });

    it("normalizes modern API response with error", async () => {
      vi.mocked(isConnected).mockResolvedValue({
        isConnected: false,
        error: new Error("Freighter not installed"),
      });

      const result = await normalizeIsConnected();

      expect(result.isConnected).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("Freighter not installed");
    });

    it("normalizes legacy API response (boolean)", async () => {
      vi.mocked(isConnected).mockResolvedValue(true);

      const result = await normalizeIsConnected();

      expect(result).toEqual({
        isConnected: true,
        error: null,
      });
    });

    it("handles unexpected response shape", async () => {
      vi.mocked(isConnected).mockResolvedValue(null);

      const result = await normalizeIsConnected();

      expect(result.isConnected).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain("Unexpected response shape");
    });
  });

  describe("normalizeRequestAccess", () => {
    it("normalizes modern API response with address", async () => {
      vi.mocked(requestAccess).mockResolvedValue({
        address: "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ",
        error: null,
      });

      const result = await normalizeRequestAccess();

      expect(result).toEqual({
        address: "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ",
        error: null,
      });
    });

    it("normalizes modern API response with error", async () => {
      vi.mocked(requestAccess).mockResolvedValue({
        address: null,
        error: { message: "User denied access" },
      });

      const result = await normalizeRequestAccess();

      expect(result.address).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("User denied access");
    });

    it("normalizes legacy API response (string)", async () => {
      vi.mocked(requestAccess).mockResolvedValue(
        "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ"
      );

      const result = await normalizeRequestAccess();

      expect(result).toEqual({
        address: "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ",
        error: null,
      });
    });

    it("handles unexpected response shape", async () => {
      vi.mocked(requestAccess).mockResolvedValue(null);

      const result = await normalizeRequestAccess();

      expect(result.address).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain("Unexpected response shape");
    });
  });

  describe("resetApiVersionCache", () => {
    it("resets the cached API version", () => {
      // This is a simple test to ensure the function exists and can be called
      expect(() => resetApiVersionCache()).not.toThrow();
    });
  });
});
