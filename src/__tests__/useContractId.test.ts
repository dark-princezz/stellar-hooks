import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockContractId } = vi.hoisted(() => {
  const mockContractId = vi.fn().mockReturnValue("CABC123");
  return { mockContractId };
});

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useMemo: (fn: () => unknown) => fn(),
  };
});

vi.mock("@stellar/stellar-sdk", () => ({
  Asset: Object.assign(
    vi.fn().mockImplementation(() => ({
      contractId: mockContractId,
    })),
    {
      native: vi.fn().mockReturnValue({
        contractId: mockContractId,
      }),
    }
  ),
}));

vi.mock("../context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context")>()),
  useStellarContext: () => ({
    config: {
      networkPassphrase: "Test SDF Network ; September 2015",
    },
  }),
}));

import { useContractId } from "../hooks/useContractId";
import { Asset } from "@stellar/stellar-sdk";

describe("useContractId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContractId.mockReturnValue("CABC123");
  });

  it("returns null when asset is null", () => {
    const result = useContractId(null);
    expect(result.contractId).toBeNull();
    expect(result.error).toBeNull();
  });

  it("returns null when asset is undefined", () => {
    const result = useContractId(undefined);
    expect(result.contractId).toBeNull();
    expect(result.error).toBeNull();
  });

  it("resolves native XLM to a contract ID", () => {
    const result = useContractId({ code: "XLM" });

    expect(Asset.native).toHaveBeenCalled();
    expect(mockContractId).toHaveBeenCalledWith("Test SDF Network ; September 2015");
    expect(result.contractId).toBe("CABC123");
    expect(result.error).toBeNull();
  });

  it("resolves an issued asset to a contract ID", () => {
    const result = useContractId({
      code: "USDC",
      issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    });

    expect(Asset).toHaveBeenCalledWith(
      "USDC",
      "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
    );
    expect(result.contractId).toBe("CABC123");
    expect(result.error).toBeNull();
  });

  it("uses a custom network passphrase when provided", () => {
    useContractId({ code: "XLM" }, "Custom Network ; 2024");

    expect(mockContractId).toHaveBeenCalledWith("Custom Network ; 2024");
  });

  it("returns an error when Asset constructor throws", () => {
    (Asset as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error("Invalid asset code");
    });

    const result = useContractId({ code: "INVALID_LONG_CODE", issuer: "GXXX" });
    expect(result.contractId).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe("Invalid asset code");
  });
});
