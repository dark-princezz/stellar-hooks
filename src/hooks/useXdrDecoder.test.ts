/**
 * @file useXdrDecoder.test.ts
 * @description Tests for useXdrDecoder hook
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useXdrDecoder } from "./useXdrDecoder";
import { decodeXdr, formatXdrResult, detectXdrType } from "../utils/xdr";

// Mock the utilities
vi.mock("../utils/xdr", () => ({
  decodeXdr: vi.fn(),
  formatXdrResult: vi.fn(),
  detectXdrType: vi.fn(),
}));

describe("useXdrDecoder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with empty state", () => {
    const { result } = renderHook(() => useXdrDecoder());

    expect(result.current.xdr).toBe("");
    expect(result.current.result.data).toBeNull();
    expect(result.current.result.type).toBe("unknown");
  });

  it("initializes with provided initial XDR", () => {
    const { result } = renderHook(() => useXdrDecoder({ initialXdr: "AAAAAg..." }));

    expect(result.current.xdr).toBe("AAAAAg...");
    expect(result.current.result.data).toBeNull();
    expect(result.current.result.type).toBe("unknown");
  });

  it("sets XDR string", () => {
    const { result } = renderHook(() => useXdrDecoder());

    act(() => {
      result.current.setXdr("new XDR string");
    });

    expect(result.current.xdr).toBe("new XDR string");
  });

  it("decodes current XDR when decode is called without arguments", () => {
    const mockResult = { data: { decoded: true }, type: "scval" as const };
    vi.mocked(decodeXdr).mockReturnValue(mockResult);
    vi.mocked(detectXdrType).mockReturnValue("scval");

    const { result } = renderHook(() => useXdrDecoder());
    act(() => {
      result.current.setXdr("AAAADw...");
    });

    act(() => {
      result.current.decode();
    });

    expect(decodeXdr).toHaveBeenCalledWith("AAAADw...", "scval");
    expect(result.current.result).toEqual(mockResult);
  });

  it("decodes provided XDR when decode is called with arguments", () => {
    const mockResult = { data: { decoded: true }, type: "transaction" as const };
    vi.mocked(decodeXdr).mockReturnValue(mockResult);

    const { result } = renderHook(() => useXdrDecoder());

    act(() => {
      result.current.decode("AAAAAg...", "transaction");
    });

    expect(decodeXdr).toHaveBeenCalledWith("AAAAAg...", "transaction");
    expect(result.current.result).toEqual(mockResult);
  });

  it("auto-detects type when autoDetect is enabled", () => {
    const mockResult = { data: { decoded: true }, type: "scval" as const };
    vi.mocked(decodeXdr).mockReturnValue(mockResult);
    vi.mocked(detectXdrType).mockReturnValue("scval");

    const { result } = renderHook(() => useXdrDecoder({ autoDetect: true }));
    act(() => {
      result.current.setXdr("AAAADw...");
    });

    act(() => {
      result.current.decode();
    });

    expect(detectXdrType).toHaveBeenCalledWith("AAAADw...");
    expect(decodeXdr).toHaveBeenCalledWith("AAAADw...", "scval");
  });

  it("does not auto-detect when autoDetect is disabled", () => {
    const mockResult = { data: { decoded: true }, type: "transaction" as const };
    vi.mocked(decodeXdr).mockReturnValue(mockResult);

    const { result } = renderHook(() => useXdrDecoder({ autoDetect: false }));
    act(() => {
      result.current.setXdr("AAAAAg...");
    });

    act(() => {
      result.current.decode();
    });

    expect(detectXdrType).not.toHaveBeenCalled();
    expect(decodeXdr).toHaveBeenCalledWith("AAAAAg...", undefined);
  });

  it("handles empty XDR in decode", () => {
    const { result } = renderHook(() => useXdrDecoder());

    act(() => {
      result.current.decode();
    });

    expect(result.current.result.error).toContain("No XDR string provided");
  });

  it("formats result using formatXdrResult", () => {
    const mockResult = { data: { test: "data" }, type: "transaction" as const };
    vi.mocked(decodeXdr).mockReturnValue(mockResult);
    vi.mocked(formatXdrResult).mockReturnValue("formatted string");

    const { result } = renderHook(() => useXdrDecoder());
    act(() => {
      result.current.setXdr("AAAAAg...");
    });
    act(() => {
      result.current.decode();
    });

    const formatted = result.current.formatResult();
    expect(formatXdrResult).toHaveBeenCalledWith(mockResult);
    expect(formatted).toBe("formatted string");
  });

  it("detects type of current XDR", () => {
    vi.mocked(detectXdrType).mockReturnValue("transaction");

    const { result } = renderHook(() => useXdrDecoder());
    act(() => {
      result.current.setXdr("AAAAAg...");
    });

    const type = result.current.detectType();
    expect(detectXdrType).toHaveBeenCalledWith("AAAAAg...");
    expect(type).toBe("transaction");
  });

  it("detects type of provided XDR", () => {
    vi.mocked(detectXdrType).mockReturnValue("scval");

    const { result } = renderHook(() => useXdrDecoder());

    const type = result.current.detectType("AAAADw...");
    expect(detectXdrType).toHaveBeenCalledWith("AAAADw...");
    expect(type).toBe("scval");
  });

  it("clears XDR and result", () => {
    const mockResult = { data: { test: "data" }, type: "transaction" as const };
    vi.mocked(decodeXdr).mockReturnValue(mockResult);

    const { result } = renderHook(() => useXdrDecoder());
    act(() => {
      result.current.setXdr("AAAAAg...");
    });
    act(() => {
      result.current.decode();
    });

    expect(result.current.xdr).toBe("AAAAAg...");
    expect(result.current.result.data).toEqual({ test: "data" });

    act(() => {
      result.current.clear();
    });

    expect(result.current.xdr).toBe("");
    expect(result.current.result.data).toBeNull();
    expect(result.current.result.type).toBe("unknown");
  });

  it("handles auto-detect returning unknown", () => {
    const mockResult = { data: { decoded: true }, type: "transaction" as const };
    vi.mocked(decodeXdr).mockReturnValue(mockResult);
    vi.mocked(detectXdrType).mockReturnValue("unknown");

    const { result } = renderHook(() => useXdrDecoder({ autoDetect: true }));
    act(() => {
      result.current.setXdr("AAAAAg...");
    });

    act(() => {
      result.current.decode();
    });

    // When detect returns unknown, should pass undefined to decodeXdr
    expect(decodeXdr).toHaveBeenCalledWith("AAAAAg...", undefined);
  });
});
