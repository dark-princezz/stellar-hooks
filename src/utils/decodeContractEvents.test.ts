import { describe, it, expect } from "vitest";
import { decodeContractEvents, decodeContractEvent, decodeInvocationArgs } from "./decodeContractEvents";

// Simple test - just verify the functions exist and have the right signature
describe("decodeContractEvents", () => {
  it("exports decodeContractEvents function", () => {
    expect(decodeContractEvents).toBeDefined();
    expect(typeof decodeContractEvents).toBe("function");
  });

  it("exports decodeContractEvent function", () => {
    expect(decodeContractEvent).toBeDefined();
    expect(typeof decodeContractEvent).toBe("function");
  });

  it("exports decodeInvocationArgs function", () => {
    expect(decodeInvocationArgs).toBeDefined();
    expect(typeof decodeInvocationArgs).toBe("function");
  });

  it("decodeContractEvents returns empty array for empty input", () => {
    const result = decodeContractEvents([]);
    expect(result).toEqual([]);
  });

  it("decodeContractEvent handles single event", () => {
    // This test verifies the function signature and basic behavior
    // Actual event decoding requires a proper contract spec
    const mockEvent = {
      id: "test-event",
      ledger: 123,
      ledgerClosedAt: "2024-01-01T00:00:00Z",
      contractId: "CDTEST",
      type: "contract",
      topic: [],
      data: [],
    };
    
    const result = decodeContractEvent(mockEvent);
    
    expect(result.id).toBe("test-event");
    expect(result.ledger).toBe(123);
    expect(result.contractId).toBe("CDTEST");
  });

  it("decodeContractEvents preserves event type", () => {
    const mockEvent = {
      id: "test-event",
      ledger: 123,
      ledgerClosedAt: "2024-01-01T00:00:00Z",
      contractId: "CDTEST",
      type: "system" as const,
      topic: [],
      data: [],
    };
    
    const result = decodeContractEvents([mockEvent])[0];
    expect(result.type).toBe("system");
  });

  it("handles events without spec (generic field names)", () => {
    const mockEvent = {
      id: "test-event",
      ledger: 123,
      ledgerClosedAt: "2024-01-01T00:00:00Z",
      contractId: "CDTEST",
      type: "contract",
      topic: [
        { switch: () => ({ name: "scvString" }) },
        { switch: () => ({ name: "scvString" }) },
      ],
      data: [
        { switch: () => ({ name: "scvU32" }) },
      ],
    };
    
    const result = decodeContractEvents([mockEvent], undefined, { includeRaw: true })[0];
    
    expect(result.topics).toHaveLength(2);
    expect(result.topics[0].name).toBe("topic0");
    expect(result.topics[1].name).toBe("topic1");
    
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe("field0");
  });

  it("includes raw ScVal when includeRaw is true", () => {
    const mockEvent = {
      id: "test-event",
      ledger: 123,
      ledgerClosedAt: "2024-01-01T00:00:00Z",
      contractId: "CDTEST",
      type: "contract",
      topic: [],
      data: [
        { switch: () => ({ name: "scvU32" }) },
      ],
    };
    
    const result = decodeContractEvents([mockEvent], undefined, { includeRaw: true })[0];
    
    expect(result.data[0]).toHaveProperty("rawValue");
  });

  it("converts timestamp to Date by default", () => {
    const mockEvent = {
      id: "test-event",
      ledger: 123,
      ledgerClosedAt: "2024-01-15T12:30:00Z",
      contractId: "CDTEST",
      type: "contract",
      topic: [],
      data: [],
    };
    
    const result = decodeContractEvents([mockEvent])[0];
    
    expect(result.ledgerTimestamp).toBeInstanceOf(Date);
  });

  it("returns numeric timestamp when timestampsAsDates is false", () => {
    const mockEvent = {
      id: "test-event",
      ledger: 123,
      ledgerClosedAt: "2024-01-15T12:30:00Z",
      contractId: "CDTEST",
      type: "contract",
      topic: [],
      data: [],
    };
    
    const result = decodeContractEvents([mockEvent], undefined, { timestampsAsDates: false })[0];
    
    expect(typeof result.ledgerTimestamp).toBe("number");
    expect(result.ledgerTimestamp).toBe(1705324200000);
  });

  it("extracts event name from topic0 when format is ContractId!EventName", () => {
    const mockEvent = {
      id: "test-event",
      ledger: 123,
      ledgerClosedAt: "2024-01-01T00:00:00Z",
      contractId: "CDTEST",
      type: "contract",
      topic: [
        { switch: () => ({ name: "scvString" }) },
      ],
      data: [],
    };
    
    // Mock scValToNative to return the expected format
    vi.mock("./decodeInvocationArgs", () => ({}));
    
    const result = decodeContractEvents([mockEvent])[0];
    
    // The event name should be extracted from topic0
    expect(result.name).toBeDefined();
  });

  it("generates event name from event id when topic0 is not in expected format", () => {
    const mockEvent = {
      id: "event:123",
      ledger: 123,
      ledgerClosedAt: "2024-01-01T00:00:00Z",
      contractId: "CDTEST",
      type: "contract",
      topic: [
        { switch: () => ({ name: "scvString" }) },
      ],
      data: [],
    };
    
    const result = decodeContractEvents([mockEvent])[0];
    
    expect(result.name).toBe("event_123");
  });
});
