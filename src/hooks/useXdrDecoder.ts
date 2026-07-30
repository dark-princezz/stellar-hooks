/**
 * @file useXdrDecoder.ts
 * @description React hook for decoding XDR strings in debugging UIs
 * @package stellar-hooks
 */

import { useState, useCallback } from "react";
import { decodeXdr, formatXdrResult, detectXdrType, type XdrDecodeResult } from "../utils/xdr";

export interface UseXdrDecoderOptions {
  /** Initial XDR string to decode */
  initialXdr?: string;
  /** Auto-detect type if not specified */
  autoDetect?: boolean;
}

export interface UseXdrDecoderReturn {
  /** The current XDR string being decoded */
  xdr: string;
  /** The decoded result */
  result: XdrDecodeResult;
  /** Set a new XDR string to decode */
  setXdr: (xdr: string) => void;
  /** Decode the current XDR string */
  decode: (xdr?: string, type?: "transaction" | "scval") => void;
  /** Format the result for display */
  formatResult: () => string;
  /** Detect the XDR type */
  detectType: (xdr?: string) => "transaction" | "scval" | "unknown";
  /** Clear the current XDR and result */
  clear: () => void;
}

/**
 * React hook for decoding XDR strings (transaction envelopes, ScVal) into JS-friendly objects
 * 
 * @param options - Configuration options
 * @returns Decoder state and functions
 * 
 * @example
 * ```tsx
 * function XdrDebugger() {
 *   const { xdr, setXdr, result, decode, formatResult } = useXdrDecoder();
 * 
 *   return (
 *     <div>
 *       <textarea
 *         value={xdr}
 *         onChange={(e) => setXdr(e.target.value)}
 *         placeholder="Paste XDR string here..."
 *       />
 *       <button onClick={() => decode()}>Decode</button>
 *       <pre>{formatResult()}</pre>
 *     </div>
 *   );
 * }
 * ```
 */
export function useXdrDecoder(options: UseXdrDecoderOptions = {}): UseXdrDecoderReturn {
  const { initialXdr = "", autoDetect = true } = options;
  const [xdr, setXdrState] = useState(initialXdr);
  const [result, setResult] = useState<XdrDecodeResult>({
    data: null,
    type: "unknown",
  });

  const setXdr = useCallback((newXdr: string) => {
    setXdrState(newXdr);
  }, []);

  const decode = useCallback(
    (xdrToDecode?: string, type?: "transaction" | "scval") => {
      const targetXdr = xdrToDecode ?? xdr;
      
      if (!targetXdr) {
        setResult({
          data: null,
          type: "unknown",
          error: "No XDR string provided",
        });
        return;
      }

      // Auto-detect type if not specified and autoDetect is enabled
      let detectedType: "transaction" | "scval" | undefined = type;
      if (!detectedType && autoDetect) {
        const detected = detectXdrType(targetXdr);
        if (detected !== "unknown") {
          detectedType = detected;
        }
      }

      setResult(decodeXdr(targetXdr, detectedType));
    },
    [xdr, autoDetect],
  );

  const formatResult = useCallback(() => {
    return formatXdrResult(result);
  }, [result]);

  const detectType = useCallback(
    (xdrToDetect?: string) => {
      return detectXdrType(xdrToDetect ?? xdr);
    },
    [xdr],
  );

  const clear = useCallback(() => {
    setXdrState("");
    setResult({
      data: null,
      type: "unknown",
    });
  }, []);

  return {
    xdr,
    result,
    setXdr,
    decode,
    formatResult,
    detectType,
    clear,
  };
}
