/**
 * @file useSorobanContractSpec.ts
 * @description Hook for fetching and parsing a deployed Soroban contract's spec/interface.
 * @package stellar-hooks
 * @license MIT
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { xdr } from "@stellar/stellar-sdk";
import { useSorobanServer } from "./useSorobanServer";
import type { StellarContractId } from "../types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ContractSpecEntry {
  name: string;
  inputs: Array<{ name: string; type: string }>;
  outputs: string[];
}

export interface ContractSpecEvent {
  name: string;
  topics: string[];
}

export interface ContractSpec {
  /** Parsed contract function signatures */
  entries: ContractSpecEntry[];
  /** Parsed contract event schemas */
  events: ContractSpecEvent[];
  /** Raw WASM binary of the deployed contract, or null if unavailable */
  rawWasm: Uint8Array | null;
  /** Raw contract spec XDR entries as returned by the RPC */
  rawSpecEntries: xdr.SpecEntry[];
}

export interface UseSorobanContractSpecReturn {
  /** The parsed contract spec, or null if not yet loaded */
  spec: ContractSpec | null;
  /** `true` while the initial fetch is in flight */
  isLoading: boolean;
  /** Most recent fetch error, or `null` */
  error: Error | null;
  /** Manually trigger a re-fetch of the contract spec */
  refetch: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapScType(scType: xdr.ScSpecType): string {
  const kind = scType.switch();
  switch (kind) {
    case xdr.ScSpecTypeKind.val():
      return "val";
    case xdr.ScSpecTypeKind.bool():
      return "bool";
    case xdr.ScSpecTypeKind.void():
      return "void";
    case xdr.ScSpecTypeKind.error():
      return "error";
    case xdr.ScSpecTypeKind.u32():
      return "u32";
    case xdr.ScSpecTypeKind.i32():
      return "i32";
    case xdr.ScSpecTypeKind.u64():
      return "u64";
    case xdr.ScSpecTypeKind.i64():
      return "i64";
    case xdr.ScSpecTypeKind.timepoint():
      return "timepoint";
    case xdr.ScSpecTypeKind.duration():
      return "duration";
    case xdr.ScSpecTypeKind.map():
      return "map";
    case xdr.ScSpecTypeKind.bytes():
      return "bytes";
    case xdr.ScSpecTypeKind.address():
      return "address";
    case xdr.ScSpecTypeKind.string():
      return "string";
    case xdr.ScSpecTypeKind.symbol():
      return "symbol";
    case xdr.ScSpecTypeKind.bytesN():
      return "bytesN";
    case xdr.ScSpecTypeKind.contractInstance():
      return "contractInstance";
    case xdr.ScSpecTypeKind.ledgerKey():
      return "ledgerKey";
    default:
      return "unknown";
  }
}

function parseSpecEntries(rawEntries: xdr.SpecEntry[]): {
  entries: ContractSpecEntry[];
  events: ContractSpecEvent[];
} {
  const entries: ContractSpecEntry[] = [];
  const events: ContractSpecEvent[] = [];

  for (const specEntry of rawEntries) {
    const tag = specEntry.switch();
    switch (tag) {
      case xdr.SpecEntryType.functionV0():
      case xdr.SpecEntryType.functionV1(): {
        const fnV0 = specEntry.functionV0();
        const fnV1 = specEntry.functionV1();
        const fn = fnV0 || fnV1;
        if (fn) {
          const funcSpec = fn;
          const inputs = (funcSpec.inputs() || []).map((input: xdr.ScSpecFunctionInputV0) => ({
            name: input.name().toString("utf8"),
            type: input.type() ? mapScType(input.type()!) : "unknown",
          }));
          const outputs = (funcSpec.outputs() || []).map((output: xdr.ScSpecType) =>
            mapScType(output),
          );
          entries.push({
            name: funcSpec.name().toString("utf8"),
            inputs,
            outputs,
          });
        }
        break;
      }
      case xdr.SpecEntryType.eventV0(): {
        const ev = specEntry.eventV0();
        if (ev) {
          events.push({
            name: ev.name().toString("utf8"),
            topics: (ev.topics() || []).map((t: xdr.ScSpecType) => mapScType(t)),
          });
        }
        break;
      }
      case xdr.SpecEntryType.structV0():
      case xdr.SpecEntryType.structV1(): {
        // Struct definitions are embedded in the spec but not top-level functions
        break;
      }
      default:
        break;
    }
  }

  return { entries, events };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Fetches and parses a deployed Soroban contract's specification (WASM metadata).
 *
 * Retrieves the contract's spec entries (function signatures, event schemas)
 * and raw WASM bytecode from the Soroban RPC, then parses them into a
 * structured format.
 *
 * @param contractId - The Stellar contract address (C...)
 * @param options - Optional configuration
 * @returns Contract spec data, loading state, and refetch function
 *
 * @example
 * ```tsx
 * const { spec, isLoading, error, refetch } = useSorobanContractSpec("C...");
 * if (spec) {
 *   spec.entries.forEach(fn => console.log(fn.name, fn.inputs, fn.outputs));
 * }
 * ```
 */
export function useSorobanContractSpec(
  contractId: StellarContractId,
  options?: { enabled?: boolean },
): UseSorobanContractSpecReturn {
  const server = useSorobanServer();
  const [spec, setSpec] = useState<ContractSpec | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const fetchSpec = useCallback(async () => {
    if (options?.enabled === false) return;

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Fetch the contract data entry to get the WASM hash
      const contractData = await server.getContractData(
        contractId,
        xdr.ScVal.scvLedgerKeyContractInstance(),
      );

      // Step 2: Extract the WASM hash from the contract instance
      const instance = contractData.val.contractInstance();
      if (!instance) {
        throw new Error("Contract has no instance data");
      }

      const wasmHash = instance.executable().wasmHash();
      if (!wasmHash || wasmHash.length === 0) {
        throw new Error("Contract has no associated WASM code");
      }

      // Step 3: Fetch the contract code entry using the WASM hash
      const codeKey = new xdr.LedgerKey.contractCode(
        new xdr.ContractCodeLedgerKey({ wasmHash }),
      );

      const ledgerEntries = await server.getLedgerEntries(codeKey);

      if (!ledgerEntries || !ledgerEntries.entries || ledgerEntries.entries.length === 0) {
        throw new Error("Contract WASM not found on-chain");
      }

      const ledgerEntry = ledgerEntries.entries[0].val;
      const contractCode = ledgerEntry.contractCode();
      const rawWasm = contractCode ? new Uint8Array(contractCode.ext().wasm()) : null;

      // Step 4: Parse spec entries from the WASM if available
      let parsedEntries: ContractSpecEntry[] = [];
      let parsedEvents: ContractSpecEvent[] = [];
      let rawSpecEntries: xdr.SpecEntry[] = [];

      if (contractCode) {
        const ext = contractCode.ext();
        if (ext.wasm()) {
          // Parse spec entries from the WASM binary metadata section
          // The spec is embedded in the WASM as a custom section
          try {
            const wasmBytes = new Uint8Array(ext.wasm());
            const specSection = extractSpecFromWasm(wasmBytes);
            if (specSection) {
              rawSpecEntries = specSection;
              const parsed = parseSpecEntries(specSection);
              parsedEntries = parsed.entries;
              parsedEvents = parsed.events;
            }
          } catch {
            // WASM parsing may fail for some contracts; return what we have
          }
        }
      }

      if (isMountedRef.current) {
        setSpec({
          entries: parsedEntries,
          events: parsedEvents,
          rawWasm,
          rawSpecEntries,
        });
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [contractId, server, options?.enabled]);

  useEffect(() => {
    isMountedRef.current = true;
    void fetchSpec();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchSpec]);

  return { spec, isLoading, error, refetch: fetchSpec };
}

/**
 * Attempt to extract SpecEntry XDR from a WASM binary's custom sections.
 * Looks for the ".smart-contract-spec" custom section used by soroban-sdk.
 */
function extractSpecFromWasm(wasm: Uint8Array): xdr.SpecEntry[] | null {
  const specEntries: xdr.SpecEntry[] = [];

  // Parse WASM custom sections to find the spec metadata
  // WASM binary format: magic + version + sections...
  // Custom section ID = 0
  let pos = 8; // skip magic (4 bytes) + version (4 bytes)

  while (pos < wasm.length) {
    const sectionId = wasm[pos];
    pos++;

    // Read LEB128 section size
    const { value: sectionSize, bytesRead } = readLeb128(wasm, pos);
    pos += bytesRead;

    if (sectionId === 0) {
      // Custom section - read name
      const { value: nameLen, bytesRead: nameBytes } = readLeb128(wasm, pos);
      pos += nameBytes;

      const name = new TextDecoder().decode(wasm.slice(pos, pos + nameLen));
      pos += nameLen;

      const remaining = sectionSize - nameLen - nameBytes;

      if (name === ".smart-contract-spec" || name === "contractspec") {
        // Each spec entry is an XDR-encoded SpecEntry preceded by a 4-byte length
        let specPos = pos;
        const specEnd = pos + remaining;

        while (specPos < specEnd - 4) {
          const entryLen =
            (wasm[specPos] << 24) |
            (wasm[specPos + 1] << 16) |
            (wasm[specPos + 2] << 8) |
            wasm[specPos + 3];
          specPos += 4;

          if (specPos + entryLen > specEnd) break;

          try {
            const entryXdr = wasm.slice(specPos, specPos + entryLen);
            const specEntry = xdr.SpecEntry.fromXDR(entryXdr);
            specEntries.push(specEntry);
          } catch {
            // Skip malformed entry
          }

          specPos += entryLen;
        }
      } else {
        pos += remaining;
      }
    } else {
      pos += sectionSize;
    }
  }

  return specEntries.length > 0 ? specEntries : null;
}

function readLeb128(
  bytes: Uint8Array,
  offset: number,
): { value: number; bytesRead: number } {
  let result = 0;
  let shift = 0;
  let bytesRead = 0;

  while (offset + bytesRead < bytes.length) {
    const byte = bytes[offset + bytesRead];
    result |= (byte & 0x7f) << shift;
    bytesRead++;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }

  return { value: result, bytesRead };
}
