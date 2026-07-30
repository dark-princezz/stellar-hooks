/**
 * @file App.test.tsx
 * @description Integration tests for the multisig-dapp example against mocked StellarProvider & hooks.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";

// ─── Shared mock state ──────────────────────────────────────────────────────────

const { mockFreighterState, resetState } = vi.hoisted(() => {
  const defaultState = {
    isInstalled: true,
    isConnected: true,
    publicKey: "GCOSIGNER1ACCOUNT1234567890ABCDEFGHIJKLMNOPQRSTUVW",
    isLoading: false,
    error: null as Error | null,
  };

  const mockFreighterState = { ...defaultState };

  return {
    mockFreighterState,
    resetState: () => Object.assign(mockFreighterState, { ...defaultState }),
  };
});

// ─── Mock stellar-hooks ─────────────────────────────────────────────────────────

const mockConnect = vi.fn();
const mockBuild = vi.fn();
const mockSign = vi.fn();
const mockSubmit = vi.fn();
const mockReset = vi.fn();

vi.mock("stellar-hooks", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require("react");

  function StellarProvider({ children }: { children: any }) {
    return children;
  }

  function useFreighter() {
    return {
      ...mockFreighterState,
      connect: mockConnect,
      disconnect: vi.fn(),
      signTransaction: vi.fn(),
    };
  }

  return {
    StellarProvider,
    useFreighter,
    useMultiSig: () => ({
      build: mockBuild,
      sign: mockSign,
      submit: mockSubmit,
      reset: mockReset,
      unsignedXdr: null,
      signatureCount: 0,
      status: "idle",
      hash: null,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
    }),
  };
});

import App from "./App";

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe("multisig-dapp App", () => {
  beforeEach(() => {
    resetState();
    mockConnect.mockReset();
    mockBuild.mockReset();
    mockSign.mockReset();
    mockSubmit.mockReset();
    mockReset.mockReset();
  });

  it("renders the multisig header and workflow steps", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /Multisig Signing Workflow Example/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Step 1: Build Unsigned Transaction/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Step 2: Sign & Collect Signatures/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Step 3: Submit Multi-Signed Transaction/i })).toBeTruthy();
  });

  it("triggers transaction building on form submission", async () => {
    mockBuild.mockResolvedValue("AAAAF...MOCK_XDR");

    render(<App />);

    const destInput = screen.getByLabelText(/Recipient Public Key:/i);
    const amountInput = screen.getByLabelText(/Amount \(XLM\):/i);

    fireEvent.change(destInput, { target: { value: "GDESTINATION1234567890ABCDEFGHIJKLMNOPQRSTUVW" } });
    fireEvent.change(amountInput, { target: { value: "25" } });

    const buildBtn = screen.getByRole("button", { name: /Build Unsigned XDR/i });

    await act(async () => {
      fireEvent.click(buildBtn);
    });

    expect(mockBuild).toHaveBeenCalled();
  });

  it("renders connect button when wallet is disconnected", () => {
    mockFreighterState.isConnected = false;
    mockFreighterState.publicKey = null;

    render(<App />);

    expect(screen.getByRole("button", { name: /Connect Freighter/i })).toBeTruthy();
  });
});
