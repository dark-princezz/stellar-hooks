import { scValToNative, type contract, type xdr } from "@stellar/stellar-sdk";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A decoded event with named fields extracted from raw topics and data.
 */
export interface DecodedEvent {
  /** Event name from the contract spec, or auto-generated if not found. */
  name: string;
  /** Event ID (includes contract ID and sequence number). */
  id: string;
  /** The ledger sequence where this event was emitted. */
  ledger: number;
  /** Timestamp of the ledger close time (milliseconds since epoch). */
  ledgerTimestamp: number;
  /** The contract that emitted this event. */
  contractId: string;
  /** Raw event type: "system", "contract", or "diagnostic". */
  type: "system" | "contract" | "diagnostic";
  /** Decoded topic fields with names and values. */
  topics: DecodedEventField[];
  /** Decoded data fields with names and values. */
  data: DecodedEventField[];
}

/**
 * A single decoded field (from topics or data).
 */
export interface DecodedEventField {
  /** Field name from the event spec, or `topic0`, `topic1`... / `field0`, `field1`... without a spec. */
  name: string;
  /** Spec type (for example `u32`, `address`, `vec`, `bool`), or the raw ScVal type without a spec. */
  type: string;
  /** The native JavaScript value. */
  value: unknown;
  /** Raw XDR value before decoding. */
  rawValue: xdr.ScVal;
}

/**
 * Options for decoding contract events.
 */
export interface DecodeEventsOptions {
  /** A `contract.Spec` for the contract, when available. */
  spec?: contract.Spec;
  /** Include raw ScVal values in the decoded output. Default: `false`. */
  includeRaw?: boolean;
  /** Convert timestamps to Date objects. Default: `true`. */
  timestampsAsDates?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts the event spec from a contract spec by name.
 */
function getEventSpec(spec?: contract.Spec, eventName?: string): contract.SpecEvent | null {
  if (!spec || !eventName) return null;
  try {
    return spec.getEvent(eventName);
  } catch {
    return null;
  }
}

/**
 * Extracts the event name from the first topic (event ID).
 * The first topic is typically: ContractId + "!" + EventName
 */
function extractEventNameFromTopic0(topic0?: xdr.ScVal): string | null {
  if (!topic0) return null;
  
  const value = scValToNative(topic0);
  if (typeof value === "string" && value.includes("!")) {
    const parts = value.split("!", 2);
    return parts[1] || null;
  }
  return null;
}

/**
 * Decodes ScVal fields with optional named fields from an event spec.
 */
function decodeEventFields(
  values: xdr.ScVal[],
  fieldNames: string[] | undefined,
  specFields: contract.SpecParam[] | undefined,
  includeRaw: boolean,
): DecodedEventField[] {
  return values.map((value, index) => {
    const name = fieldNames?.[index] ?? `topic${index}`;
    const specField = specFields?.[index];
    
    // Get type from spec or ScVal
    let type: string;
    if (specField) {
      type = specField.type().switch().name.replace(/^scSpecType/, "").toLowerCase();
    } else {
      type = value.switch().name.replace(/^scv/, "").toLowerCase();
    }
    
    const decoded: DecodedEventField = {
      name,
      type,
      value: scValToNative(value),
    };
    
    if (includeRaw) {
      // @ts-expect-error - raw property for debugging
      decoded.rawValue = value;
    }
    
    return decoded;
  });
}

// ─── Main Decoder ─────────────────────────────────────────────────────────────

/**
 * Decodes raw Soroban contract events into named, typed fields using the contract spec.
 * 
 * With a contract spec, topics and data fields are decoded with parameter names
 * and types. Without a spec, fields are labeled generically (`topic0`, `topic1`, etc.)
 * but still converted to native JavaScript values.
 *
 * @param events - Raw event responses from the Soroban RPC API.
 * @param spec - The contract's `contract.Spec` when available.
 * @param options - Decoding options.
 * @returns Array of decoded events with named fields.
 *
 * @example
 * ```ts
 * import { decodeContractEvents } from "stellar-hooks";
 * import { parseContractSpec } from "@stellar/stellar-sdk";
 *
 * // Load contract spec from JSON or WASM
 * const spec = parseContractSpec(contractJson);
 *
 * // Get raw events from RPC
 * const server = new rpc.Server("https://soroban-testnet.stellar.org");
 * const response = await server.getEvents({
 *   filters: [{ type: "contract", contractIds: ["CABC..."] }],
 *   limit: 10,
 * });
 *
 * // Decode with spec
 * const decoded = decodeContractEvents(response.events, spec);
 * console.log(decoded[0].topics[0].name); // "from"
 * console.log(decoded[0].topics[0].value); // "GAAZ..."
 * ```
 *
 * @example
 * ```ts
 * // Without spec (still decodes to native values with generic names)
 * const decoded = decodeContractEvents(response.events);
 * console.log(decoded[0].topics[0].name); // "topic0"
 * console.log(decoded[0].topics[0].value); // "GAAZ..."
 * ```
 */
export function decodeContractEvents(
  events: contract.Api.EventResponse[],
  spec?: contract.Spec,
  options: DecodeEventsOptions = {},
): DecodedEvent[] {
  const {
    includeRaw = false,
    timestampsAsDates = true,
  } = options;

  return events.map((event) => {
    // Extract contract ID and event name from first topic
    const topic0 = event.topic.length > 0 ? event.topic[0] : undefined;
    const eventName = extractEventNameFromTopic0(topic0);
    
    // Get event spec if available
    const eventSpec = getEventSpec(spec, eventName);
    const eventInputs = eventSpec?.inputs();
    
    // Split inputs into topics and data
    // In Soroban events, topics are indexed parameters, data is non-indexed
    const inputs = eventInputs ?? [];
    const topicInputs = inputs.filter((_, i) => i < event.topic.length);
    const dataInputs = inputs.slice(event.topic.length);
    
    // Decode topics
    const decodedTopics = decodeEventFields(
      event.topic,
      topicInputs.map((input) => input.name()?.toString()),
      topicInputs,
      includeRaw,
    );
    
    // Decode data
    const decodedData = decodeEventFields(
      event.data,
      dataInputs.map((input) => input.name()?.toString()),
      dataInputs,
      includeRaw,
    );
    
    // Build decoded event
    const decoded: DecodedEvent = {
      name: eventName ?? `event_${event.id.split(":").pop()}`,
      id: event.id,
      ledger: event.ledger,
      ledgerTimestamp: event.ledgerClosedAt ? 
        (timestampsAsDates ? new Date(event.ledgerClosedAt) : event.ledgerClosedAt) : 
        0,
      contractId: event.contractId,
      type: event.type as "system" | "contract" | "diagnostic",
      topics: decodedTopics,
      data: decodedData,
    };
    
    return decoded;
  });
}

// ─── Decode a Single Event (Convenience) ──────────────────────────────────────

/**
 * Decodes a single raw event into named, typed fields.
 * 
 * This is a convenience wrapper around {@link decodeContractEvents} for
 * working with individual events.
 *
 * @param event - A single raw event response.
 * @param spec - The contract's `contract.Spec` when available.
 * @param options - Decoding options.
 * @returns The decoded event with named fields.
 *
 * @example
 * ```ts
 * const decoded = decodeContractEvent(singleEvent, spec);
 * console.log(decoded.name); // "Transfer"
 * console.log(decoded.topics[0].name); // "from"
 * console.log(decoded.data[0].name); // "amount"
 * ```
 */
export function decodeContractEvent(
  event: contract.Api.EventResponse,
  spec?: contract.Spec,
  options?: DecodeEventsOptions,
): DecodedEvent {
  return decodeContractEvents([event], spec, options)[0];
}

// ─── Decode Invocation Args (Re-export) ───────────────────────────────────────

// Re-export decodeInvocationArgs for convenience
export { decodeInvocationArgs } from "./decodeInvocationArgs";
