/**
 * @file xdr.test.ts
 * @description Tests for XDR decoding utilities
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { xdr, scValToNative } from "@stellar/stellar-sdk";
import { decodeXdr, formatXdrResult, detectXdrType } from "./xdr";

// Mock the SDK
vi.mock("@stellar/stellar-sdk", () => ({
  xdr: {
    TransactionEnvelope: {
      fromXDR: vi.fn(),
    },
    ScVal: {
      fromXDR: vi.fn(),
    },
  },
  scValToNative: vi.fn(),
}));

describe("decodeXdr", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error for empty string", () => {
    const result = decodeXdr("");
    expect(result.data).toBeNull();
    expect(result.type).toBe("unknown");
    expect(result.error).toContain("Invalid XDR string");
  });

  it("returns error for non-string input", () => {
    const result = decodeXdr(null as any);
    expect(result.data).toBeNull();
    expect(result.type).toBe("unknown");
    expect(result.error).toContain("Invalid XDR string");
  });

  it("decodes transaction envelope when type is specified", () => {
    const mockEnvelope = { _switch: { name: "envelopeTypeTx", value: 2 }, _arm: "v1", _value: { tx: "data" } };
    vi.mocked(xdr.TransactionEnvelope.fromXDR).mockReturnValue(mockEnvelope as any);

    const result = decodeXdr("AAAAAg...", "transaction");
    
    expect(xdr.TransactionEnvelope.fromXDR).toHaveBeenCalledWith("AAAAAg...", "base64");
    expect(result.data).toEqual({ _switch: { name: "envelopeTypeTx", value: 2 }, _arm: "v1", _value: { tx: "data" } });
    expect(result.type).toBe("transaction");
    expect(result.error).toBeUndefined();
  });

  it("decodes ScVal when type is specified", () => {
    const mockScVal = {};
    vi.mocked(xdr.ScVal.fromXDR).mockReturnValue(mockScVal as any);
    vi.mocked(scValToNative).mockReturnValue("decoded value");

    const result = decodeXdr("AAAADw...", "scval");
    
    expect(xdr.ScVal.fromXDR).toHaveBeenCalledWith("AAAADw...", "base64");
    expect(scValToNative).toHaveBeenCalledWith(mockScVal);
    expect(result.data).toBe("decoded value");
    expect(result.type).toBe("scval");
    expect(result.error).toBeUndefined();
  });

  it("auto-detects transaction envelope when type is not specified", () => {
    const mockEnvelope = { _switch: { name: "envelopeTypeTx", value: 2 }, _arm: "v1", _value: { tx: "data" } };
    vi.mocked(xdr.TransactionEnvelope.fromXDR).mockReturnValue(mockEnvelope as any);

    const result = decodeXdr("AAAAAg...");
    
    expect(result.data).toEqual({ _switch: { name: "envelopeTypeTx", value: 2 }, _arm: "v1", _value: { tx: "data" } });
    expect(result.type).toBe("transaction");
  });

  it("auto-detects ScVal when transaction decoding fails", () => {
    vi.mocked(xdr.TransactionEnvelope.fromXDR).mockImplementation(() => {
      throw new Error("Not a transaction");
    });
    const mockScVal = {};
    vi.mocked(xdr.ScVal.fromXDR).mockReturnValue(mockScVal as any);
    vi.mocked(scValToNative).mockReturnValue("decoded value");

    const result = decodeXdr("AAAADw...");
    
    expect(result.data).toBe("decoded value");
    expect(result.type).toBe("scval");
  });

  it("returns error when explicit type decoding fails", () => {
    vi.mocked(xdr.TransactionEnvelope.fromXDR).mockImplementation(() => {
      throw new Error("Invalid XDR");
    });

    const result = decodeXdr("invalid", "transaction");
    
    expect(result.data).toBeNull();
    expect(result.type).toBe("transaction");
    expect(result.error).toContain("Failed to decode as TransactionEnvelope");
  });

  it("returns error when auto-detection fails", () => {
    vi.mocked(xdr.TransactionEnvelope.fromXDR).mockImplementation(() => {
      throw new Error("Not a transaction");
    });
    vi.mocked(xdr.ScVal.fromXDR).mockImplementation(() => {
      throw new Error("Not an ScVal");
    });

    const result = decodeXdr("invalid");
    
    expect(result.data).toBeNull();
    expect(result.type).toBe("unknown");
    expect(result.error).toContain("Could not auto-detect XDR type");
  });
});

describe("formatXdrResult", () => {
  it("formats error result", () => {
    const result = {
      data: null,
      type: "unknown" as const,
      error: "Test error",
    };
    expect(formatXdrResult(result)).toBe("Error: Test error");
  });

  it("formats null data", () => {
    const result = {
      data: null,
      type: "unknown" as const,
    };
    expect(formatXdrResult(result)).toBe("No data");
  });

  it("formats object data as JSON", () => {
    const result = {
      data: { key: "value", num: 123 },
      type: "transaction" as const,
    };
    expect(formatXdrResult(result)).toBe('{\n  "key": "value",\n  "num": 123\n}');
  });

  it("formats string data", () => {
    const result = {
      data: "simple string",
      type: "scval" as const,
    };
    expect(formatXdrResult(result)).toBe('"simple string"');
  });

  it("handles circular references gracefully", () => {
    const circular: any = { name: "test" };
    circular.self = circular;
    const result = {
      data: circular,
      type: "scval" as const,
    };
    // Should not throw, just return string representation
    expect(typeof formatXdrResult(result)).toBe("string");
  });
});

describe("detectXdrType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects transaction envelope", () => {
    vi.mocked(xdr.TransactionEnvelope.fromXDR).mockReturnValue({} as any);
    
    expect(detectXdrType("AAAAAg...")).toBe("transaction");
  });

  it("detects ScVal", () => {
    vi.mocked(xdr.TransactionEnvelope.fromXDR).mockImplementation(() => {
      throw new Error("Not a transaction");
    });
    vi.mocked(xdr.ScVal.fromXDR).mockReturnValue({} as any);
    
    expect(detectXdrType("AAAADw...")).toBe("scval");
  });

  it("returns unknown for invalid XDR", () => {
    vi.mocked(xdr.TransactionEnvelope.fromXDR).mockImplementation(() => {
      throw new Error("Not a transaction");
    });
    vi.mocked(xdr.ScVal.fromXDR).mockImplementation(() => {
      throw new Error("Not an ScVal");
    });
    
    expect(detectXdrType("invalid")).toBe("unknown");
  });
});
