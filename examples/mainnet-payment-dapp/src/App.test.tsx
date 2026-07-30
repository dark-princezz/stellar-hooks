/**
 * @file App.test.tsx
 * @description Integration tests for the mainnet payment dApp example against mocked Mainnet context.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";

// ─── Shared mock state ──────────────────────────────────────────────────────────

const { mockFreighterState, resetState } = vi.hoisted(() => {
  const defaultState = {
    isInstalled: false,
    isConnected: false,
    publicKey: null as string | null,
    isLoading: false,
    error: null as Error | null,
    networkPassphraseMismatch: false,
    networkPassphraseWarning: null as string | null,
  };

  const mockFreighterState = { ...defaultState };

  return {
    mockFreighterState,
    resetState: () => Object.assign(mockFreighterState, { ...defaultState }),
  };
});

// ─── Mock stellar-hooks ─────────────────────────────────────────────────────────

const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockUseStellarBalance = vi.fn();
const mockSubmitPayment = vi.fn();

vi.mock("stellar-hooks", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require("react");

  function StellarProvider({ children }: { children: any }) {
    return children;
  }

  function useFreighter() {
    const [, forceRender] = React.useState(0);

    React.useEffect(() => {
      mockConnect.mockImplementation(async () => {
        mockFreighterState.isConnected = true;
        mockFreighterState.isInstalled = true;
        mockFreighterState.publicKey =
          "GMAINNETACCOUNT1234567890ABCDEFGHIJKLMNOPQRSTUVW";
        forceRender((n: number) => n + 1);
      });
    }, []);

    return {
      ...mockFreighterState,
      connect: mockConnect,
      disconnect: mockDisconnect,
      signTransaction: vi.fn(),
    };
  }

  return {
    StellarProvider,
    useFreighter,
    useStellarBalance: (...args: any[]) => mockUseStellarBalance(...args),
    usePayment: () => ({
      submit: mockSubmitPayment,
      status: "idle",
      hash: null,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
      reset: vi.fn(),
    }),
  };
});

import App from "./App";

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe("mainnet-payment-dapp App", () => {
  beforeEach(() => {
    resetState();
    mockConnect.mockReset();
    mockDisconnect.mockReset();
    mockSubmitPayment.mockReset();
    mockUseStellarBalance.mockReturnValue({
      xlmBalance: { balance: "500.0000000", isNative: true },
      balances: [
        {
          assetType: "native",
          balance: "500.0000000",
          balanceFloat: 500,
          buyingLiabilities: "0",
          sellingLiabilities: "0",
          isNative: true,
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("renders the mainnet heading", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /stellar-hooks Mainnet Payment dApp/i })).toBeTruthy();
  });

  it("shows wallet warning when Freighter is not installed", () => {
    render(<App />);

    expect(screen.getByText(/Freighter wallet not detected/i)).toBeTruthy();
  });

  it("renders connect button when Freighter is installed but not connected", () => {
    mockFreighterState.isInstalled = true;
    mockFreighterState.isConnected = false;

    render(<App />);

    expect(screen.getByRole("button", { name: /Connect Freighter Wallet/i })).toBeTruthy();
  });

  it("displays public key, mainnet balance, and payment form after connect", async () => {
    const mainnetKey = "GMAINNETACCOUNT1234567890ABCDEFGHIJKLMNOPQRSTUVW";

    mockFreighterState.isInstalled = true;
    mockFreighterState.isConnected = false;

    const { rerender } = render(<App />);

    const connectBtn = screen.getByRole("button", { name: /Connect Freighter Wallet/i });

    await act(async () => {
      fireEvent.click(connectBtn);
    });

    rerender(<App />);

    await waitFor(() => {
      expect(screen.getByText(new RegExp(mainnetKey))).toBeTruthy();
    });

    expect(screen.getByText(/500\.0000000 XLM/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Send Mainnet XLM/i })).toBeTruthy();
  });
});
