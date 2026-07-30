import { vi, type Mock } from "vitest";

// ---------------------------------------------------------------------------
// Manual mock for @stellar/freighter-api v6
//
// Every exported mock is typed with the real function signatures from the
// @stellar/freighter-api v6 type declarations so that vi.mocked() infers
// the correct parameter and return types in test files.
//
// Uses `as unknown as Mock<Params, Return>` type assertions (vitest v1
// compatible) because vitest v1's vi.fn() only accepts parameter-tuple
// generics and the concrete mock type may not exactly match the desired
// signature (e.g. vi.fn with no-arg implementation cast to a param-bearing
// function signature).
// ---------------------------------------------------------------------------

// ─── Freighter API v6 error shape ─────────────────────────────────────────

export interface FreighterApiError {
  message: string;
  code: number;
}

// ─── Response types (matching real @stellar/freighter-api v6) ─────────────

interface IsConnectedResponse {
  isConnected: boolean;
  error?: FreighterApiError;
}

interface IsAllowedResponse {
  isAllowed: boolean;
  error?: FreighterApiError;
}

interface GetAddressResponse {
  address: string;
  error?: FreighterApiError;
}

interface GetNetworkDetailsResponse {
  network: string;
  networkUrl: string;
  networkPassphrase: string;
  sorobanRpcUrl?: string;
  error?: FreighterApiError;
}

interface GetNetworkResponse {
  network: string;
  networkPassphrase: string;
  error?: FreighterApiError;
}

interface SignTransactionResponse {
  signedTxXdr: string;
  signerAddress?: string;
  error?: FreighterApiError;
}

interface SignAuthEntryResponse {
  signedAuthEntry: string | null;
  signerAddress?: string;
  error?: FreighterApiError;
}

interface SignMessageResponse {
  signedMessage: string | null;
  signerAddress?: string;
  error?: FreighterApiError;
}

interface AddTokenResponse {
  contractId: string;
}

// ─── Function type aliases ────────────────────────────────────────────────

type IsConnectedFn = () => Promise<IsConnectedResponse>;
type IsAllowedFn = () => Promise<IsAllowedResponse>;
type GetAddressFn = () => Promise<GetAddressResponse>;
type GetNetworkDetailsFn = () => Promise<GetNetworkDetailsResponse>;
type GetNetworkFn = () => Promise<GetNetworkResponse>;
type RequestAccessFn = () => Promise<GetAddressResponse>;
type SignTransactionFn = (
  transactionXdr: string,
  opts?: { networkPassphrase?: string; address?: string },
) => Promise<SignTransactionResponse>;
type SignAuthEntryFn = (
  entryXdr: string,
  opts?: { networkPassphrase?: string; address?: string },
) => Promise<SignAuthEntryResponse>;
type SignMessageFn = (
  message: string,
  opts?: { networkPassphrase?: string; address?: string },
) => Promise<SignMessageResponse>;
type SetAllowedFn = () => Promise<IsAllowedResponse>;
type AddTokenFn = (args: { contractId: string }) => Promise<AddTokenResponse>;

// ─── Typed mock functions ─────────────────────────────────────────────────

export const isConnected = vi.fn(() =>
  Promise.resolve({ isConnected: false }),
) as unknown as Mock<Parameters<IsConnectedFn>, ReturnType<IsConnectedFn>>;

export const isAllowed = vi.fn(() =>
  Promise.resolve({ isAllowed: false }),
) as unknown as Mock<Parameters<IsAllowedFn>, ReturnType<IsAllowedFn>>;

export const getAddress = vi.fn(() =>
  Promise.resolve({ address: "" }),
) as unknown as Mock<Parameters<GetAddressFn>, ReturnType<GetAddressFn>>;

export const getNetworkDetails = vi.fn(() =>
  Promise.resolve({ network: "", networkUrl: "", networkPassphrase: "" }),
) as unknown as Mock<
  Parameters<GetNetworkDetailsFn>,
  ReturnType<GetNetworkDetailsFn>
>;

export const getNetwork = vi.fn(() =>
  Promise.resolve({ network: "", networkPassphrase: "" }),
) as unknown as Mock<Parameters<GetNetworkFn>, ReturnType<GetNetworkFn>>;

export const requestAccess = vi.fn(() =>
  Promise.resolve({ address: "" }),
) as unknown as Mock<Parameters<RequestAccessFn>, ReturnType<RequestAccessFn>>;

export const signTransaction = vi.fn(() =>
  Promise.resolve({ signedTxXdr: "signed-xdr", signerAddress: "" }),
) as unknown as Mock<
  Parameters<SignTransactionFn>,
  ReturnType<SignTransactionFn>
>;

export const signAuthEntry = vi.fn(() =>
  Promise.resolve({ signedAuthEntry: "signed-entry", signerAddress: "" }),
) as unknown as Mock<
  Parameters<SignAuthEntryFn>,
  ReturnType<SignAuthEntryFn>
>;

export const signMessage = vi.fn(() =>
  Promise.resolve({ signedMessage: "signed-blob", signerAddress: "" }),
) as unknown as Mock<Parameters<SignMessageFn>, ReturnType<SignMessageFn>>;

// signBlob is an alias for signMessage (matching the real API)
export const signBlob = signMessage;

export const setAllowed = vi.fn(() =>
  Promise.resolve({ isAllowed: false }),
) as unknown as Mock<Parameters<SetAllowedFn>, ReturnType<SetAllowedFn>>;

export const addToken = vi.fn(() =>
  Promise.resolve({ contractId: "" }),
) as unknown as Mock<Parameters<AddTokenFn>, ReturnType<AddTokenFn>>;

export const isBrowser = false;

export const WatchWalletChanges = {
  watch: vi.fn(),
  stop: vi.fn(),
};

// ─── Default export (matches the real module's default export) ────────────

const _default = {
  getAddress,
  addToken,
  signTransaction,
  signMessage,
  signAuthEntry,
  isConnected,
  getNetwork,
  getNetworkDetails,
  isAllowed,
  setAllowed,
  requestAccess,
  WatchWalletChanges,
};
export default _default;

// ─── Test helpers ─────────────────────────────────────────────────────────

export function resetFreighterMocks() {
  isConnected.mockReset();
  isConnected.mockResolvedValue({ isConnected: false });
  isAllowed.mockReset();
  isAllowed.mockResolvedValue({ isAllowed: false });
  getAddress.mockReset();
  getAddress.mockResolvedValue({ address: "" });
  getNetworkDetails.mockReset();
  getNetworkDetails.mockResolvedValue({
    network: "",
    networkUrl: "",
    networkPassphrase: "",
  });
  requestAccess.mockReset();
  requestAccess.mockResolvedValue({ address: "" });
  signTransaction.mockReset();
  signTransaction.mockResolvedValue({
    signedTxXdr: "signed-xdr",
    signerAddress: "",
  });
  signAuthEntry.mockReset();
  signAuthEntry.mockResolvedValue({
    signedAuthEntry: "signed-entry",
    signerAddress: "",
  });
  signMessage.mockReset();
  signMessage.mockResolvedValue({
    signedMessage: "signed-blob",
    signerAddress: "",
  });
}

export function mockFreighterConnected(
  publicKey = "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ",
  network = "TESTNET",
  networkPassphrase = "Test SDF Network ; September 2015",
) {
  isConnected.mockResolvedValue({ isConnected: true });
  getAddress.mockResolvedValue({ address: publicKey });
  getNetworkDetails.mockResolvedValue({
    network,
    networkUrl: "",
    networkPassphrase,
  });
}

export function mockFreighterInstalled() {
  isConnected.mockResolvedValue({ isConnected: true });
  getAddress.mockResolvedValue({ address: "" });
  getNetworkDetails.mockResolvedValue({
    network: "",
    networkUrl: "",
    networkPassphrase: "",
  });
}

export function mockFreighterError(message = "Freighter error") {
  isConnected.mockResolvedValue({ isConnected: true });
  getAddress.mockRejectedValue(new Error(message));
}
