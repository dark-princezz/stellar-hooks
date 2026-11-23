# Contract Event Decoder

The `decodeContractEvents` utility decodes raw Soroban contract events into named, typed fields using the contract spec.

## Overview

When you query contract events from the Soroban RPC, the response includes raw topics and data as XDR values. This utility helps you decode those into meaningful, named fields using the contract's interface specification.

## Features

- **Named fields**: Decode topics and data with parameter names from the contract spec
- **Type information**: Extract type information from the spec (e.g., `u32`, `address`, `vec`)
- **Native values**: Convert XDR ScVal values to native JavaScript types
- **Fallback handling**: Works without a spec (uses generic names like `topic0`, `field0`)

## API Reference

### `decodeContractEvents(events, spec?, options?)`

Decodes an array of raw event responses into decoded events with named fields.

**Parameters:**

- `events`: `contract.Api.EventResponse[]` - Raw event responses from the Soroban RPC API
- `spec?`: `contract.Spec` - Optional contract spec for named fields
- `options?`: `DecodeEventsOptions` - Additional options

**Returns:** `DecodedEvent[]` - Array of decoded events

### `decodeContractEvent(event, spec?, options?)`

Decodes a single event. Convenience wrapper around `decodeContractEvents`.

**Parameters:**

- `event`: `contract.Api.EventResponse` - A single raw event response
- `spec?`: `contract.Spec` - Optional contract spec
- `options?`: `DecodeEventsOptions` - Additional options

**Returns:** `DecodedEvent` - The decoded event

### `DecodeEventsOptions`

```typescript
{
  includeRaw?: boolean;         // Include raw ScVal values (default: false)
  timestampsAsDates?: boolean;  // Convert timestamps to Date objects (default: true)
}
```

### `DecodedEvent`

```typescript
{
  name: string;                  // Event name from spec
  id: string;                    // Event ID
  ledger: number;                // Ledger sequence number
  ledgerTimestamp: number | Date; // Ledger close timestamp
  contractId: string;            // Contract address
  type: "system" | "contract" | "diagnostic";
  topics: DecodedEventField[];   // Indexed parameters
  data: DecodedEventField[];     // Non-indexed parameters
}
```

### `DecodedEventField`

```typescript
{
  name: string;    // Field name from spec (or generic if not found)
  type: string;    // Type from spec (e.g., "u32", "address")
  value: unknown;  // Native JavaScript value
  rawValue?: xdr.ScVal;  // Raw XDR value (if includeRaw is true)
}
```

## Usage

### Basic Usage (Without Spec)

```typescript
import { decodeContractEvents } from "stellar-hooks";
import * as rpc from "@stellar/stellar-sdk/rpc";

// Get raw events from RPC
const server = new rpc.Server("https://soroban-testnet.stellar.org");
const response = await server.getEvents({
  filters: [{ type: "contract", contractIds: ["CD456..."] }],
  limit: 10,
});

// Decode without spec (still converts to native values)
const decoded = decodeContractEvents(response.events);

console.log(decoded[0].topics[0].name);  // "topic0"
console.log(decoded[0].topics[0].value); // "GAAZ..." (native value)
```

### With Contract Spec

```typescript
import { decodeContractEvents, parseContractSpec } from "stellar-hooks";

// Load contract spec from JSON or WASM
const spec = parseContractSpec(contractJson);

// Decode with spec
const decoded = decodeContractEvents(response.events, spec);

console.log(decoded[0].topics[0].name);  // "from"
console.log(decoded[0].topics[0].type);  // "address"
console.log(decoded[0].topics[0].value); // "GAAZ..."
```

### Using with useSorobanEvents Hook

```tsx
import { useSorobanEvents } from "stellar-hooks";
import { decodeContractEvents } from "stellar-hooks";

function ContractEvents() {
  const { events, isLoading, error } = useSorobanEvents({
    contractId: "CD456...",
    limit: 20,
  });

  // Decode events with spec
  const decoded = decodeContractEvents(events, contractSpec);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {decoded.map((event) => (
        <div key={event.id}>
          <h3>{event.name}</h3>
          <ul>
            {event.topics.map((topic, i) => (
              <li key={i}>
                <strong>{topic.name}:</strong> {JSON.stringify(topic.value)}
              </li>
            ))}
            {event.data.map((data, i) => (
              <li key={i}>
                <strong>{data.name}:</strong> {JSON.stringify(data.value)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

### Event Structure Example

For a `Transfer(from: address, to: address, amount: u32)` event:

**Raw Response (from RPC):**
```json
{
  "id": "event:123",
  "ledger": 100,
  "ledgerClosedAt": "2024-01-01T00:00:00Z",
  "contractId": "CD456...",
  "type": "contract",
  "topic": [
    "CD456...!Transfer",
    "GAAZ...",
    "GBBB..."
  ],
  "data": [
    {
      "value": {
        "switch": "u32",
        "u32": 100000000
      }
    }
  ]
}
```

**Decoded Output:**
```json
{
  "name": "Transfer",
  "id": "event:123",
  "ledger": 100,
  "ledgerTimestamp": "2024-01-01T00:00:00.000Z",
  "contractId": "CD456...",
  "type": "contract",
  "topics": [
    {
      "name": "topic0",
      "type": "string",
      "value": "CD456...!Transfer"
    },
    {
      "name": "from",
      "type": "address",
      "value": "GAAZ..."
    },
    {
      "name": "to",
      "type": "address",
      "value": "GBBB..."
    }
  ],
  "data": [
    {
      "name": "amount",
      "type": "u32",
      "value": 100000000
    }
  ]
}
```

## Related Utilities

- `decodeInvocationArgs` - Decode contract invocation arguments
- `scValToNative` - Convert ScVal to native JavaScript values
- `parseContractSpec` - Parse contract spec from JSON or WASM
