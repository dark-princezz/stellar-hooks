/**
 * examples/multisig-dapp/src/App.tsx
 *
 * Example app demonstrating a multi-signature transaction workflow using `useMultiSig`.
 * Covers building an unsigned transaction, collecting signatures from multiple signers,
 * inspecting signature counts, and submitting the multi-signed XDR.
 *
 * npm install && npm run dev
 */

import React, { useState } from "react";
import {
  StellarProvider,
  useFreighter,
  useMultiSig,
} from "stellar-hooks";
import { Operation, Asset } from "@stellar/stellar-sdk";

// ─── Multisig Inner App ────────────────────────────────────────────────────────

function MultiSigWorkflow() {
  const { isConnected, publicKey, connect } = useFreighter();
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("10");
  const [customXdrInput, setCustomXdrInput] = useState("");

  const {
    build,
    sign,
    submit,
    reset,
    unsignedXdr,
    signatureCount,
    status,
    hash,
    error,
    isLoading,
    isSuccess,
    isError,
  } = useMultiSig({
    fee: 100,
    onSuccess: (txHash) => {
      console.log("Multisig transaction succeeded:", txHash);
    },
  });

  if (!isConnected || !publicKey) {
    return (
      <div style={{ textAlign: "center", margin: "2rem 0" }}>
        <p>Connect your wallet to start the multi-signature transaction workflow.</p>
        <button onClick={connect}>Connect Freighter</button>
      </div>
    );
  }

  const handleBuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination || !amount) return;

    try {
      const op = Operation.payment({
        destination,
        amount,
        asset: Asset.native(),
      });
      const builtXdr = await build([op], { memo: "Multisig Payment" });
      setCustomXdrInput(builtXdr);
    } catch (err) {
      console.error("Failed to build transaction:", err);
    }
  };

  const handleSign = async () => {
    const targetXdr = customXdrInput || unsignedXdr;
    if (!targetXdr) return;

    try {
      const signedXdr = await sign(targetXdr);
      setCustomXdrInput(signedXdr);
    } catch (err) {
      console.error("Failed to sign transaction:", err);
    }
  };

  const handleSubmit = async () => {
    const xdrToSubmit = customXdrInput || unsignedXdr;
    if (!xdrToSubmit) return;

    try {
      await submit(xdrToSubmit);
    } catch (err) {
      console.error("Failed to submit transaction:", err);
    }
  };

  return (
    <div style={{ marginTop: "1rem" }}>
      {/* Step 1: Build */}
      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem", marginBottom: "1rem" }}>
        <h3>Step 1: Build Unsigned Transaction</h3>
        <form onSubmit={handleBuild}>
          <div style={{ marginBottom: "0.5rem" }}>
            <label htmlFor="multisig-dest">Recipient Public Key:</label>
            <input
              id="multisig-dest"
              type="text"
              placeholder="G..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              style={{ width: "100%", padding: "0.4rem", marginTop: "0.2rem" }}
              required
            />
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <label htmlFor="multisig-amount">Amount (XLM):</label>
            <input
              id="multisig-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: "100%", padding: "0.4rem", marginTop: "0.2rem" }}
              required
            />
          </div>
          <button type="submit" disabled={isLoading}>
            Build Unsigned XDR
          </button>
        </form>
      </section>

      {/* Step 2: Collect Signatures */}
      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem", marginBottom: "1rem" }}>
        <h3>Step 2: Sign & Collect Signatures</h3>
        <p>
          Current Signatures Count: <strong>{signatureCount}</strong>
        </p>
        <div style={{ marginBottom: "0.5rem" }}>
          <label htmlFor="xdr-area">Transaction XDR (Unsigned / Partially Signed):</label>
          <textarea
            id="xdr-area"
            rows={5}
            value={customXdrInput || unsignedXdr || ""}
            onChange={(e) => setCustomXdrInput(e.target.value)}
            placeholder="Build transaction above or paste XDR here..."
            style={{ width: "100%", fontFamily: "monospace", fontSize: "0.85rem", padding: "0.5rem" }}
          />
        </div>
        <button
          type="button"
          onClick={handleSign}
          disabled={isLoading || (!customXdrInput && !unsignedXdr)}
          style={{ marginRight: "0.5rem" }}
        >
          Sign with Connected Wallet
        </button>
      </section>

      {/* Step 3: Submit Transaction */}
      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem" }}>
        <h3>Step 3: Submit Multi-Signed Transaction</h3>
        <p>Status: <strong>{status}</strong></p>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || (!customXdrInput && !unsignedXdr)}
          style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
        >
          {isLoading ? "Submitting..." : "Submit Transaction"}
        </button>
        <button type="button" onClick={reset} style={{ marginLeft: "0.5rem" }}>
          Reset
        </button>

        {isSuccess && hash && (
          <div style={{ color: "green", marginTop: "1rem" }}>
            <p>✅ Multisig transaction broadcast successfully!</p>
            <p>
              Hash:{" "}
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
                target="_blank"
                rel="noreferrer"
              >
                {hash}
              </a>
            </p>
          </div>
        )}

        {isError && error && (
          <div style={{ color: "red", marginTop: "1rem" }}>
            <p className="error">❌ Submission Error: {error.message}</p>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Root Component ────────────────────────────────────────────────────────────

export default function App() {
  return (
    <StellarProvider network="testnet">
      <main style={{ fontFamily: "sans-serif", maxWidth: 680, margin: "2rem auto", padding: "0 1rem" }}>
        <h1>Multisig Signing Workflow Example</h1>
        <p>
          Demonstrates using <code>useMultiSig</code> to compose a transaction, sign with multiple signers,
          track signature counts, and broadcast to Stellar testnet.
        </p>
        <MultiSigWorkflow />
      </main>
    </StellarProvider>
  );
}
