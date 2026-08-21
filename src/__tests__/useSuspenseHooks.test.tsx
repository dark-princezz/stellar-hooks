import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { Suspense } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { useSuspenseStellarAccount } from "../hooks/useStellarAccount";
import { useSuspenseLedgerEntry } from "../hooks/useLedgerEntry";
import { StellarProvider } from "../context";

// Mock horizon server
vi.mock("../utils/memoizedServers", () => ({
  getHorizonServer: vi.fn().mockReturnValue({
    loadAccount: vi.fn().mockImplementation((key: string) => {
      if (key === "GDJNNECG3O4S7CU6QLZU6KJUEZG4HZBOY4AEWEJ6MMYEPGPLVBV6XWEN") {
        return Promise.reject(new Error("Account not found"));
      }
      return Promise.resolve({
        id: key,
        account_id: key,
        sequence: "100",
        balances: [{ asset_type: "native", balance: "100.0000000" }],
        signers: [],
        thresholds: { low_threshold: 1, med_threshold: 1, high_threshold: 1 },
        flags: { auth_required: false, auth_revocable: false, auth_immutable: false, auth_clawback_enabled: false },
        data_attr: {},
      });
    }),
  }),
}));

// Mock Soroban RPC server
vi.mock("@stellar/stellar-sdk/rpc", async () => {
  const actual = await vi.importActual("@stellar/stellar-sdk/rpc");
  return {
    ...actual,
    Server: vi.fn().mockImplementation(() => ({
      getLedgerEntries: vi.fn().mockImplementation((key: any) => {
        if (key && key.error) {
          return Promise.reject(new Error("RPC failure"));
        }
        return Promise.resolve({
          entries: [{ lastModifiedLedgerSeq: 1234, val: {} }],
        });
      }),
    })),
  };
});

function AccountTestComponent({ publicKey }: { publicKey: string }) {
  const { account } = useSuspenseStellarAccount(publicKey);
  return <div data-testid="account-id">{account?.accountId}</div>;
}

function LedgerTestComponent({ ledgerKey }: { ledgerKey: any }) {
  const { data } = useSuspenseLedgerEntry(ledgerKey);
  return <div data-testid="ledger-seq">{data?.lastModifiedLedgerSeq}</div>;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return <div data-testid="error-message">{(this.state.error as Error).message}</div>;
    }
    return this.props.children;
  }
}

describe("useSuspenseStellarAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("suspends with loading fallback then renders data", async () => {
    const validKey = "GDYJKKZKSCSDFKH74ECQ7JBUZFPT7HSV574N7FPKRMTBRVL5DW3FTRTK";

    render(
      <StellarProvider>
        <Suspense fallback={<div data-testid="loading">Loading...</div>}>
          <AccountTestComponent publicKey={validKey} />
        </Suspense>
      </StellarProvider>
    );

    expect(screen.getByTestId("loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("account-id")).toHaveTextContent(validKey);
    });
  });

  it("throws error to ErrorBoundary when fetch fails", async () => {
    render(
      <StellarProvider>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <AccountTestComponent publicKey="GDJNNECG3O4S7CU6QLZU6KJUEZG4HZBOY4AEWEJ6MMYEPGPLVBV6XWEN" />
          </Suspense>
        </ErrorBoundary>
      </StellarProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toHaveTextContent("Account not found");
    });
  });
});

describe("useSuspenseLedgerEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("suspends with loading fallback then renders ledger entry", async () => {
    const dummyKey = { toXDR: () => "dummy-xdr" } as any;

    render(
      <StellarProvider>
        <Suspense fallback={<div data-testid="loading">Loading...</div>}>
          <LedgerTestComponent ledgerKey={dummyKey} />
        </Suspense>
      </StellarProvider>
    );

    expect(screen.getByTestId("loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("ledger-seq")).toHaveTextContent("1234");
    });
  });
});
