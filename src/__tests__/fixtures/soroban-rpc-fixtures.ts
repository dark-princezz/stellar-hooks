import { vi } from "vitest";

export const TX_HASH =
  "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

export const CONTRACT_ID =
  "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4";

export const PUBLIC_KEY = "GBL5T5MLZ57JTBNS643LEJBKAKSOTJCCZVY54FTNZHDSNA56NS6LM3WG";

export const mockTx = { toXDR: () => "AAAA-transaction-xdr" };

export const mockSimulateTransaction = vi.fn();
export const mockSendTransaction = vi.fn();
export const mockGetTransaction = vi.fn();
export const mockGetLedgerEntries = vi.fn();
export const mockGetEvents = vi.fn();
export const mockGetAccount = vi.fn().mockResolvedValue({
  accountId: () => "GABC123XYZ",
  sequenceNumber: () => "1",
});

export function mockRpcServer() {
  return {
    Server: vi.fn().mockImplementation(() => ({
      simulateTransaction: mockSimulateTransaction,
      sendTransaction: mockSendTransaction,
      getTransaction: mockGetTransaction,
      getLedgerEntries: mockGetLedgerEntries,
      getEvents: mockGetEvents,
      getAccount: mockGetAccount,
    })),
  };
}

export function mockSuccessfulSimulation(retval = {}) {
  mockSimulateTransaction.mockResolvedValue({
    results: [{ retval }],
    latestLedger: 100,
  });
}

export function mockSimulationError(error = "Simulation failed") {
  mockSimulateTransaction.mockResolvedValue({ error });
}

export function mockSuccessfulSubmission() {
  mockSendTransaction.mockResolvedValue({
    status: "PENDING",
    hash: TX_HASH,
  });
}

export function mockSubmissionError(errorResult = "tx_bad_seq") {
  mockSendTransaction.mockResolvedValue({
    status: "ERROR",
    errorResult,
  });
}

export function mockSuccessfulGetTransaction(resultMetaXdr = null) {
  mockGetTransaction.mockResolvedValue({
    status: "SUCCESS",
    resultMetaXdr,
  });
}

export function mockFailedGetTransaction() {
  mockGetTransaction.mockResolvedValue({
    status: "FAILED",
  });
}

export function mockNotFoundGetTransaction() {
  mockGetTransaction.mockResolvedValue({
    status: "NOT_FOUND",
  });
}

export function mockLedgerEntryFound(entry: unknown) {
  mockGetLedgerEntries.mockResolvedValue({ entries: [entry] });
}

export function mockLedgerEntryNotFound() {
  mockGetLedgerEntries.mockResolvedValue({ entries: [] });
}

export function mockEventsFound(events: unknown[]) {
  mockGetEvents.mockResolvedValue({ events });
}

export function mockRpcError(mockFn: ReturnType<typeof vi.fn>, message = "RPC error") {
  mockFn.mockRejectedValue(new Error(message));
}

export function resetSorobanRpcMocks() {
  mockSimulateTransaction.mockReset();
  mockSendTransaction.mockReset();
  mockGetTransaction.mockReset();
  mockGetLedgerEntries.mockReset();
  mockGetEvents.mockReset();
  mockGetAccount.mockReset();
  mockGetAccount.mockResolvedValue({
    accountId: () => "GABC123XYZ",
    sequenceNumber: () => "1",
  });
}
