/**
 * @file xdr.ts
 * @description XDR decoding utilities for debugging UIs
 * @package stellar-hooks
 */

import { xdr, scValToNative } from "@stellar/stellar-sdk";

/**
 * Result of decoding an XDR string
 */
export interface XdrDecodeResult {
  /** The decoded JavaScript-friendly object */
  data: unknown;
  /** The type of XDR that was decoded */
  type: "transaction" | "scval" | "unknown";
  /** Error if decoding failed */
  error?: string;
}

/**
 * Decodes a base64-encoded XDR string into a JavaScript-friendly object
 * 
 * @param xdrString - Base64-encoded XDR string
 * @param type - Optional hint about the XDR type ("transaction" or "scval")
 * @returns Decoded object with type information
 * 
 * @example
 * ```ts
 * // Decode a transaction envelope
 * const result = decodeXdr("AAAAAg...", "transaction");
 * console.log(result.data); // { sourceAccount: "...", operations: [...] }
 * 
 * // Decode an ScVal
 * const result = decodeXdr("AAAADw...", "scval");
 * console.log(result.data); // "hello" or 123 or { ... }
 * ```
 */
export function decodeXdr(xdrString: string, type?: "transaction" | "scval"): XdrDecodeResult {
  try {
    if (!xdrString || typeof xdrString !== "string") {
      return {
        data: null,
        type: "unknown",
        error: "Invalid XDR string: must be a non-empty string",
      };
    }

    // Try to decode as TransactionEnvelope first
    if (type === "transaction" || !type) {
      try {
        const envelope = xdr.TransactionEnvelope.fromXDR(xdrString, "base64");
        const tx = JSON.parse(JSON.stringify(envelope));
        return {
          data: tx,
          type: "transaction",
        };
      } catch (e) {
        // If type was explicitly "transaction", fail hard
        if (type === "transaction") {
          return {
            data: null,
            type: "transaction",
            error: `Failed to decode as TransactionEnvelope: ${e instanceof Error ? e.message : String(e)}`,
          };
        }
        // Otherwise, try ScVal next
      }
    }

    // Try to decode as ScVal
    if (type === "scval" || !type) {
      try {
        const scVal = xdr.ScVal.fromXDR(xdrString, "base64");
        const native = scValToNative(scVal);
        return {
          data: native,
          type: "scval",
        };
      } catch (e) {
        // If type was explicitly "scval", fail hard
        if (type === "scval") {
          return {
            data: null,
            type: "scval",
            error: `Failed to decode as ScVal: ${e instanceof Error ? e.message : String(e)}`,
          };
        }
      }
    }

    // If we get here, auto-detection failed
    return {
      data: null,
      type: "unknown",
      error: "Could not auto-detect XDR type. Try specifying 'transaction' or 'scval' explicitly.",
    };
  } catch (error) {
    return {
      data: null,
      type: "unknown",
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Formats an XDR decode result for display in a UI
 * 
 * @param result - The result from decodeXdr
 * @returns A formatted string representation
 */
export function formatXdrResult(result: XdrDecodeResult): string {
  if (result.error) {
    return `Error: ${result.error}`;
  }

  if (result.data === null || result.data === undefined) {
    return "No data";
  }

  try {
    return JSON.stringify(result.data, null, 2);
  } catch {
    return String(result.data);
  }
}

/**
 * Attempts to detect the XDR type from a base64 string
 * 
 * @param xdrString - Base64-encoded XDR string
 * @returns Detected type or "unknown"
 */
export function detectXdrType(xdrString: string): "transaction" | "scval" | "unknown" {
  try {
    // Try transaction envelope first
    xdr.TransactionEnvelope.fromXDR(xdrString, "base64");
    return "transaction";
  } catch {
    try {
      // Try ScVal
      xdr.ScVal.fromXDR(xdrString, "base64");
      return "scval";
    } catch {
      return "unknown";
    }
  }
}
