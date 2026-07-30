import { describe, expectTypeOf, test } from "vitest";
import type { Horizon, xdr } from "@stellar/stellar-sdk";
import type * as rpc from "@stellar/stellar-sdk/rpc";
import type {
  StellarNetwork,
  NetworkConfig,
  PresetNetworkConfig,
  CustomNetworkConfig,
  StellarAccountData,
  StellarBalance,
  FreighterState,
  UseFreighterOptions,
  UseFreighterReturn,
  SignTransactionOptions,
  TransactionStatus,
  TransactionState,
  StellarTransactionError,
  ContractCallOptions,
  SorobanSimulationEstimate,
  UseContractCallReturn,
  LedgerEntryState,
  StellarProviderProps,
  StellarContextValue,
  WalletsKitOptions,
  WalletsKitState,
  UseWalletsKitReturn,
  WalletConnectChain,
  WalletConnectOptions,
  WalletConnectState,
  UseWalletConnectReturn,
  StellarPublicKey,
  StellarContractId,
  StellarXdrString,
  StellarTxHash,
  StellarAssetIssuer,
} from "./index";

// ─── StellarNetwork ──────────────────────────────────────────────────────────

describe("StellarNetwork", () => {
  test("is a union of four string literals", () => {
    expectTypeOf<StellarNetwork>().toEqualTypeOf<
      "mainnet" | "testnet" | "futurenet" | "custom"
    >();
  });
});

// ─── NetworkConfig ───────────────────────────────────────────────────────────

describe("NetworkConfig", () => {
  test("is a union of PresetNetworkConfig and CustomNetworkConfig", () => {
    expectTypeOf<NetworkConfig>().toEqualTypeOf<
      PresetNetworkConfig | CustomNetworkConfig
    >();
  });
});

// ─── CustomNetworkConfig ─────────────────────────────────────────────────────

describe("CustomNetworkConfig", () => {
  test("has all required fields with correct types", () => {
    expectTypeOf<CustomNetworkConfig>().toHaveProperty("network");
    expectTypeOf<CustomNetworkConfig["network"]>().toEqualTypeOf<"custom">();
    expectTypeOf<CustomNetworkConfig>().toHaveProperty("horizonUrl");
    expectTypeOf<CustomNetworkConfig["horizonUrl"]>().toBeString();
    expectTypeOf<CustomNetworkConfig>().toHaveProperty("sorobanRpcUrl");
    expectTypeOf<CustomNetworkConfig["sorobanRpcUrl"]>().toBeString();
    expectTypeOf<CustomNetworkConfig>().toHaveProperty("networkPassphrase");
    expectTypeOf<CustomNetworkConfig["networkPassphrase"]>().toBeString();
  });
});

// ─── StellarAccountData ──────────────────────────────────────────────────────

describe("StellarAccountData", () => {
  test("has all expected fields with correct types", () => {
    expectTypeOf<StellarAccountData>().toHaveProperty("accountId");
    expectTypeOf<StellarAccountData["accountId"]>().toEqualTypeOf<StellarPublicKey>();

    expectTypeOf<StellarAccountData>().toHaveProperty("balances");
    expectTypeOf<StellarAccountData["balances"]>().toEqualTypeOf<StellarBalance[]>();

    expectTypeOf<StellarAccountData>().toHaveProperty("sequence");
    expectTypeOf<StellarAccountData["sequence"]>().toBeString();

    expectTypeOf<StellarAccountData>().toHaveProperty("subentryCount");
    expectTypeOf<StellarAccountData["subentryCount"]>().toBeNumber();

    expectTypeOf<StellarAccountData>().toHaveProperty("numSponsored");
    expectTypeOf<StellarAccountData["numSponsored"]>().toBeNumber();

    expectTypeOf<StellarAccountData>().toHaveProperty("numSponsoring");
    expectTypeOf<StellarAccountData["numSponsoring"]>().toBeNumber();

    expectTypeOf<StellarAccountData>().toHaveProperty("raw");
    expectTypeOf<StellarAccountData["raw"]>().toEqualTypeOf<Horizon.AccountResponse>();
  });

  test("thresholds has correct nested shape", () => {
    expectTypeOf<StellarAccountData["thresholds"]>().toEqualTypeOf<{
      lowThreshold: number;
      medThreshold: number;
      highThreshold: number;
    }>();
  });

  test("flags has correct nested shape", () => {
    expectTypeOf<StellarAccountData["flags"]>().toEqualTypeOf<{
      authRequired: boolean;
      authRevocable: boolean;
      authImmutable: boolean;
      authClawbackEnabled: boolean;
    }>();
  });
});

// ─── StellarBalance ──────────────────────────────────────────────────────────

describe("StellarBalance", () => {
  test("has all expected fields", () => {
    expectTypeOf<StellarBalance>().toHaveProperty("assetType");
    expectTypeOf<StellarBalance["assetType"]>().toBeString();

    expectTypeOf<StellarBalance>().toHaveProperty("balance");
    expectTypeOf<StellarBalance["balance"]>().toBeString();

    expectTypeOf<StellarBalance>().toHaveProperty("balanceFloat");
    expectTypeOf<StellarBalance["balanceFloat"]>().toBeNumber();

    expectTypeOf<StellarBalance>().toHaveProperty("buyingLiabilities");
    expectTypeOf<StellarBalance["buyingLiabilities"]>().toBeString();

    expectTypeOf<StellarBalance>().toHaveProperty("sellingLiabilities");
    expectTypeOf<StellarBalance["sellingLiabilities"]>().toBeString();

    expectTypeOf<StellarBalance>().toHaveProperty("isNative");
    expectTypeOf<StellarBalance["isNative"]>().toBeBoolean();
  });

  test("optional fields are correctly typed", () => {
    expectTypeOf<StellarBalance["assetCode"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<StellarBalance["assetIssuer"]>().toEqualTypeOf<StellarAssetIssuer | undefined>();
    expectTypeOf<StellarBalance["limit"]>().toEqualTypeOf<string | undefined>();
  });
});

// ─── UseFreighterReturn ──────────────────────────────────────────────────────

describe("UseFreighterReturn", () => {
  test("extends FreighterState", () => {
    expectTypeOf<UseFreighterReturn>().toMatchTypeOf<FreighterState>();
  });

  test("FreighterState has all expected fields", () => {
    expectTypeOf<FreighterState>().toHaveProperty("isInstalled");
    expectTypeOf<FreighterState["isInstalled"]>().toBeBoolean();

    expectTypeOf<FreighterState>().toHaveProperty("isConnected");
    expectTypeOf<FreighterState["isConnected"]>().toBeBoolean();

    expectTypeOf<FreighterState>().toHaveProperty("publicKey");
    expectTypeOf<FreighterState["publicKey"]>().toEqualTypeOf<StellarPublicKey | null>();

    expectTypeOf<FreighterState>().toHaveProperty("network");
    expectTypeOf<FreighterState["network"]>().toEqualTypeOf<string | null>();

    expectTypeOf<FreighterState>().toHaveProperty("networkPassphrase");
    expectTypeOf<FreighterState["networkPassphrase"]>().toEqualTypeOf<string | null>();

    expectTypeOf<FreighterState>().toHaveProperty("networkPassphraseMismatch");
    expectTypeOf<FreighterState["networkPassphraseMismatch"]>().toBeBoolean();

    expectTypeOf<FreighterState>().toHaveProperty("isLoading");
    expectTypeOf<FreighterState["isLoading"]>().toBeBoolean();

    expectTypeOf<FreighterState>().toHaveProperty("error");
    expectTypeOf<FreighterState["error"]>().toEqualTypeOf<Error | null>();
  });

  test("has connect, disconnect, and signing methods", () => {
    expectTypeOf<UseFreighterReturn>().toHaveProperty("connect");
    expectTypeOf<UseFreighterReturn["connect"]>().toEqualTypeOf<() => Promise<void>>();

    expectTypeOf<UseFreighterReturn>().toHaveProperty("disconnect");
    expectTypeOf<UseFreighterReturn["disconnect"]>().toEqualTypeOf<() => void>();

    expectTypeOf<UseFreighterReturn>().toHaveProperty("signTransaction");
    expectTypeOf<UseFreighterReturn>().toHaveProperty("signAuthEntry");
    expectTypeOf<UseFreighterReturn>().toHaveProperty("signBlob");
  });
});

// ─── ContractCallOptions ─────────────────────────────────────────────────────

describe("ContractCallOptions", () => {
  test("required vs optional fields are correct", () => {
    type RequiredKeys = {
      [K in keyof ContractCallOptions]-?: undefined extends ContractCallOptions[K]
        ? never
        : K;
    }[keyof ContractCallOptions];

    type OptionalKeys = {
      [K in keyof ContractCallOptions]-?: undefined extends ContractCallOptions[K]
        ? K
        : never;
    }[keyof ContractCallOptions];

    expectTypeOf<RequiredKeys>().toEqualTypeOf<"contractId" | "method">();
    expectTypeOf<OptionalKeys>().toEqualTypeOf<
      | "args"
      | "fee"
      | "timeoutSeconds"
      | "sorobanRpcServer"
      | "onSuccess"
      | "onError"
      | "parseResult"
    >();
  });

  test("contractId is a branded StellarContractId", () => {
    expectTypeOf<ContractCallOptions["contractId"]>().toEqualTypeOf<StellarContractId>();
  });

  test("method is a string", () => {
    expectTypeOf<ContractCallOptions["method"]>().toBeString();
  });
});

// ─── TransactionStatus ──────────────────────────────────────────────────────

describe("TransactionStatus", () => {
  test("is a union of seven string literals", () => {
    expectTypeOf<TransactionStatus>().toEqualTypeOf<
      "idle" | "building" | "signing" | "submitting" | "polling" | "success" | "error"
    >();
  });
});

// ─── TransactionState ────────────────────────────────────────────────────────

describe("TransactionState", () => {
  test("has correct field types", () => {
    expectTypeOf<TransactionState>().toHaveProperty("status");
    expectTypeOf<TransactionState["status"]>().toEqualTypeOf<TransactionStatus>();

    expectTypeOf<TransactionState>().toHaveProperty("hash");
    expectTypeOf<TransactionState["hash"]>().toEqualTypeOf<StellarTxHash | null>();

    expectTypeOf<TransactionState>().toHaveProperty("isLoading");
    expectTypeOf<TransactionState["isLoading"]>().toBeBoolean();

    expectTypeOf<TransactionState>().toHaveProperty("isSuccess");
    expectTypeOf<TransactionState["isSuccess"]>().toBeBoolean();

    expectTypeOf<TransactionState>().toHaveProperty("isError");
    expectTypeOf<TransactionState["isError"]>().toBeBoolean();
  });

  test("generic TResult flows to result field", () => {
    expectTypeOf<TransactionState<number>["result"]>().toEqualTypeOf<number | null>();
    expectTypeOf<TransactionState<string>["result"]>().toEqualTypeOf<string | null>();
    expectTypeOf<TransactionState["result"]>().toEqualTypeOf<unknown | null>();
  });
});

// ─── StellarTransactionError ─────────────────────────────────────────────────

describe("StellarTransactionError", () => {
  test("is a discriminated union on the type field", () => {
    type NetworkError = Extract<StellarTransactionError, { type: "network" }>;
    type TxError = Extract<StellarTransactionError, { type: "transaction" }>;
    type TimeoutError = Extract<StellarTransactionError, { type: "timeout" }>;

    expectTypeOf<NetworkError>().toHaveProperty("message");
    expectTypeOf<TxError>().toHaveProperty("resultCode");
    expectTypeOf<TxError>().toHaveProperty("message");
    expectTypeOf<TimeoutError>().toHaveProperty("message");
  });
});

// ─── LedgerEntryState ────────────────────────────────────────────────────────

describe("LedgerEntryState", () => {
  test("has all expected fields", () => {
    expectTypeOf<LedgerEntryState>().toHaveProperty("data");
    expectTypeOf<LedgerEntryState["data"]>().toEqualTypeOf<rpc.Api.LedgerEntryResult | null>();

    expectTypeOf<LedgerEntryState>().toHaveProperty("isLoading");
    expectTypeOf<LedgerEntryState["isLoading"]>().toBeBoolean();

    expectTypeOf<LedgerEntryState>().toHaveProperty("error");
    expectTypeOf<LedgerEntryState["error"]>().toEqualTypeOf<Error | null>();

    expectTypeOf<LedgerEntryState>().toHaveProperty("refetch");
    expectTypeOf<LedgerEntryState["refetch"]>().toEqualTypeOf<() => Promise<void>>();

    expectTypeOf<LedgerEntryState>().toHaveProperty("lastFetchedAt");
    expectTypeOf<LedgerEntryState["lastFetchedAt"]>().toEqualTypeOf<Date | null>();
  });
});

// ─── UseContractCallReturn ───────────────────────────────────────────────────

describe("UseContractCallReturn", () => {
  test("extends TransactionState", () => {
    expectTypeOf<UseContractCallReturn>().toMatchTypeOf<TransactionState>();
  });

  test("has simulation metadata plus call, query, simulate, and reset methods", () => {
    expectTypeOf<UseContractCallReturn>().toHaveProperty("simulation");
    expectTypeOf<UseContractCallReturn["simulation"]>().toEqualTypeOf<
      import("@stellar/stellar-sdk/rpc").Api.SimulateTransactionResponse | null
    >();
    expectTypeOf<UseContractCallReturn>().toHaveProperty("estimatedCost");
    expectTypeOf<UseContractCallReturn["estimatedCost"]>().toEqualTypeOf<
      SorobanSimulationEstimate | null
    >();
    expectTypeOf<UseContractCallReturn>().toHaveProperty("call");
    expectTypeOf<UseContractCallReturn>().toHaveProperty("query");
    expectTypeOf<UseContractCallReturn>().toHaveProperty("simulate");
    expectTypeOf<UseContractCallReturn>().toHaveProperty("reset");
    expectTypeOf<UseContractCallReturn["reset"]>().toEqualTypeOf<() => void>();
  });
});

// ─── WalletConnect types ─────────────────────────────────────────────────────

describe("WalletConnectChain", () => {
  test("is the expected chain union", () => {
    expectTypeOf<WalletConnectChain>().toEqualTypeOf<
      "stellar:pubnet" | "stellar:testnet"
    >();
  });
});

describe("UseWalletConnectReturn", () => {
  test("extends WalletConnectState", () => {
    expectTypeOf<UseWalletConnectReturn>().toMatchTypeOf<WalletConnectState>();
  });

  test("has connect, disconnect, and signTransaction", () => {
    expectTypeOf<UseWalletConnectReturn>().toHaveProperty("connect");
    expectTypeOf<UseWalletConnectReturn>().toHaveProperty("disconnect");
    expectTypeOf<UseWalletConnectReturn>().toHaveProperty("signTransaction");
  });
});

// ─── WalletsKit types ────────────────────────────────────────────────────────

describe("UseWalletsKitReturn", () => {
  test("extends WalletsKitState", () => {
    expectTypeOf<UseWalletsKitReturn>().toMatchTypeOf<WalletsKitState>();
  });

  test("has connect, disconnect, and signing methods", () => {
    expectTypeOf<UseWalletsKitReturn>().toHaveProperty("connect");
    expectTypeOf<UseWalletsKitReturn>().toHaveProperty("disconnect");
    expectTypeOf<UseWalletsKitReturn>().toHaveProperty("signTransaction");
    expectTypeOf<UseWalletsKitReturn>().toHaveProperty("signAuthEntry");
    expectTypeOf<UseWalletsKitReturn>().toHaveProperty("signMessage");
  });
});

// ─── StellarProviderProps ────────────────────────────────────────────────────

describe("StellarProviderProps", () => {
  test("network is optional and defaults", () => {
    expectTypeOf<StellarProviderProps["network"]>().toEqualTypeOf<
      StellarNetwork | undefined
    >();
  });

  test("customConfig is optional", () => {
    expectTypeOf<StellarProviderProps["customConfig"]>().toEqualTypeOf<
      CustomNetworkConfig | undefined
    >();
  });
});
