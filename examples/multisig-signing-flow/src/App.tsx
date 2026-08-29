/**
 * @file App.tsx
 * @description Comprehensive multisig transaction signing flow example
 * @package stellar-hooks
 * @license MIT
 */

import { useState, useEffect, useMemo } from "react";
import {
  StellarProvider,
  useMultiSig,
  useFreighter,
  Operation,
  Asset,
} from "stellar-hooks";

// Test network
const TESTNET_SERVER = "https://horizon-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  "Test SDF Network ;September 2015";

// Mock signer addresses (for demo - users would replace with actual addresses)
const SIGNER_A =
  "GDQNY3P2L35B3R4J7X5Z7M6X7QYV7W6Z5X4C3B2A1Z0Y9X8W7V6U5T4S3R2Q1P0O";
const SIGNER_B =
  "GCVJZK6D7Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z";
const SIGNER_C =
  "GDQ34Y3B3R4J7X5Z7M6X7QYV7W6Z5X4C3B2A1Z0Y9X8W7V6U5T4S3R2Q1P0O";

// ─── Helper Components ───────────────────────────────────────────────────────

function StepIndicator({ step, label, description, completed, active }: { step: number; label: string; description: string; completed: boolean; active: boolean }) {
  return (
    <div className="step-row">
      <div className={`step-badge ${active ? "active" : completed ? "completed" : ""}`}>
        {completed ? "✓" : active ? step : step}
      </div>
      <div className="step-info">
        <div className="step-title">{label}</div>
        <div className="step-desc">{description}</div>
      </div>
      <div className="step-status">
        {completed && <span className="status-badge status-complete">Complete</span>}
        {active && <span className="status-badge status-pending">Active</span>}
      </div>
    </div>
  );
}

function StatusRow({ label, value, code = false }: { label: string; value: string | number | boolean; code?: boolean }) {
  return (
    <div className="status-row">
      <span className="status-label">{label}</span>
      <span className={`status-value ${code ? "" : ""}`}>
        {code ? <code>{String(value)}</code> : String(value)}
      </span>
    </div>
  );
}

// ─── Main App Component ──────────────────────────────────────────────────────

export default function App() {
  // User provides 2 addresses they want to use as signers
  const [signer1, setSigner1] = useState<string>(SIGNER_A);
  const [signer2, setSigner2] = useState<string>(SIGNER_B);
  const [signer3, setSigner3] = useState<string>(SIGNER_C);

  // Transaction details
  const [amount, setAmount] = useState<string>("10");
  const [destination, setDestination] = useState<string>("");
  const [memo, setMemo] = useState<string>("Multisig test payment");

  // Signer connections (mock: user clicks connect for each signer)
  const [signersConnected, setSignersConnected] = useState<Record<string, boolean>>({});
  const [activeSigner, setActiveSigner] = useState<string>("");

  // Wallet connection for the active signer
  const {
    isConnected: walletConnected,
    publicKey: walletPublicKey,
    connect: connectWallet,
    disconnect: disconnectWallet,
    isInstalled: walletInstalled,
  } = useFreighter();

  // MultiSig hook
  const {
    build,
    sign,
    submit,
    reset,
    unsignedXdr,
    signatureCount,
    signers,
    thresholds,
    meetsThreshold,
    signatureWeight,
    signedBy,
    status,
    hash,
    error,
    isLoading,
    isSuccess,
    isError,
  } = useMultiSig({
    fee: 100,
    timeoutSeconds: 60,
    async onSuccess(txHash) {
      console.log("Transaction submitted:", txHash);
    },
    onError(err) {
      console.error("Transaction error:", err);
    },
  });

  // Check if signers are connected (mock logic)
  useEffect(() => {
    const isSignerConnected = (address: string) => {
      // In real app, this would check if wallet is connected
      return !!signersConnected[address];
    };

    // Check if any signer is connected
    if (isSignerConnected(signer1) || isSignerConnected(signer2) || isSignerConnected(signer3)) {
      setActiveSigner(Object.keys(signersConnected).find(addr => signersConnected[addr]) || "");
    }
  }, [signersConnected, signer1, signer2, signer3]);

  // Get signers array from inputs
  const signerEntries = useMemo(() => {
    const entries = [];
    if (signer1) entries.push({ key: signer1, weight: 1, type: "ed25519_public_key" as const });
    if (signer2) entries.push({ key: signer2, weight: 1, type: "ed25519_public_key" as const });
    if (signer3) entries.push({ key: signer3, weight: 1, type: "ed25519_public_key" as const });
    return entries;
  }, [signer1, signer2, signer3]);

  // Calculate threshold status
  const thresholdStatus = useMemo(() => {
    if (!thresholds) return { required: 0, current: 0, status: "pending" as const };
    const required = thresholds.medium;
    const current = signatureWeight;
    const percentage = (current / required) * 100;
    return { required, current, percentage, status: meetsThreshold ? "complete" : current >= required ? "complete" : current > 0 ? "partial" : "pending" } as const;
  }, [thresholds, signatureWeight, meetsThreshold]);

  // Handle connect signer
  const handleConnectSigner = async (address: string) => {
    // In a real app, this would connect the wallet for this signer
    setSignersConnected(prev => ({ ...prev, [address]: true }));
    setActiveSigner(address);
    // Connect actual wallet
    await connectWallet();
  };

  // Handle disconnect signer
  const handleDisconnectSigner = (address: string) => {
    setSignersConnected(prev => {
      const newPrev = { ...prev };
      delete newPrev[address];
      return newPrev;
    });
    disconnectWallet();
  };

  // Step 1: Build transaction
  const handleBuildTransaction = async () => {
    if (!walletPublicKey && !activeSigner) {
      alert("Please connect a wallet first");
      return;
    }

    const ops = [
      Operation.payment({
        destination: destination || signer1, // Default to signer if no destination
        asset: Asset.native(),
        amount: amount || "0",
      }),
    ];

    try {
      const xdr = await build(ops, {
        source: activeSigner || walletPublicKey || signer1,
        memo,
      });
      console.log("Transaction built:", xdr);
    } catch (err) {
      console.error("Error building transaction:", err);
      alert(`Failed to build transaction: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  // Step 2: Sign transaction (can be called multiple times)
  const handleSignTransaction = async () => {
    if (!unsignedXdr) {
      alert("Please build the transaction first");
      return;
    }

    try {
      const signedXdr = await sign(unsignedXdr);
      console.log("Transaction signed:", signedXdr);
      console.log("Current signatures:", signatureCount);
      console.log("Signed by:", signedBy);
    } catch (err) {
      console.error("Error signing transaction:", err);
      alert(`Failed to sign transaction: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  // Step 3: Submit transaction
  const handleSubmitTransaction = async () => {
    if (!unsignedXdr) {
      alert("Please build the transaction first");
      return;
    }

    try {
      await submit(unsignedXdr);
      console.log("Transaction submitted");
    } catch (err) {
      console.error("Error submitting transaction:", err);
      alert(`Failed to submit transaction: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  // Reset form
  const handleReset = () => {
    reset();
    setAmount("10");
    setDestination("");
    setMemo("Multisig test payment");
  };

  // Check wallet connection status
  const walletStatus = useMemo(() => {
    if (!walletInstalled) return { label: "Freighter not installed", className: "wallet-btn disconnected" };
    if (isLoading) return { label: "Connecting...", className: "wallet-btn loading" };
    if (walletConnected && walletPublicKey) return { label: `Connected: ${walletPublicKey.slice(0, 8)}...`, className: "wallet-btn connected" };
    return { label: "Connect Wallet", className: "wallet-btn disconnected" };
  }, [walletInstalled, walletConnected, walletPublicKey, isLoading]);

  // Determine which step we're on
  const currentStep = useMemo(() => {
    if (status === "success") return 4; // Completed
    if (isError) return 5; // Failed
    if (unsignedXdr) return 2; // Built - waiting for signatures
    if (walletConnected && walletPublicKey) return 1; // Ready to build
    return 0; // Not ready
  }, [status, isError, unsignedXdr, walletConnected]);

  return (
    <StellarProvider network="testnet" server={TESTNET_SERVER}>
      <div className="container">
        <div className="header">
          <h1>🔐 Multisig Transaction Signing Flow</h1>
          <p>
            Demonstration of collecting multiple signatures from different signers
            before submitting a Stellar transaction
          </p>
        </div>

        {/* Connection Status Alert */}
        {!walletInstalled && (
          <div className="alert alert-warning">
            ⚠️ <strong>Freighter wallet not detected.</strong> Install Freighter to test real wallet connections:
            <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" style={{ marginLeft: "8px" }}>
              https://freighter.app
            </a>
          </div>
        )}

        {isError && (
          <div className="alert alert-error">
            <strong>Error:</strong> {error?.message || "Unknown error"}
            <button onClick={handleReset} className="btn btn-secondary btn-small" style={{ marginLeft: "12px" }}>
              Reset
            </button>
          </div>
        )}

        {isSuccess && hash && (
          <div className="alert alert-success">
            <strong>✅ Transaction Submitted!</strong>
            <br />
            <div style={{ marginTop: "8px" }}>
              <span style={{ color: "#94a3b8" }}>Hash:</span>
              <code style={{ wordBreak: "break-all", marginLeft: "8px" }}>{hash}</code>
            </div>
            <button onClick={handleReset} className="btn btn-primary btn-small" style={{ marginTop: "12px" }}>
              New Transaction
            </button>
          </div>
        )}

        {/* Step Progress */}
        <div className="card">
          <h2>📋 Transaction Steps</h2>
          <StepIndicator
            step={1}
            label="Connect Signer Wallet"
            description="Connect the wallet for the first signer to initiate the transaction"
            completed={currentStep >= 1}
            active={currentStep === 1}
          />
          <StepIndicator
            step={2}
            label="Build Transaction"
            description="Create the transaction with operations (payment, etc.)"
            completed={currentStep >= 2}
            active={currentStep === 2}
          />
          <StepIndicator
            step={3}
            label="Collect Signatures"
            description="Each signer signs the transaction (can be done by different people)"
            completed={currentStep === 2 && unsignedXdr && signatureCount > 0}
            active={currentStep === 3}
          />
          <StepIndicator
            step={4}
            label="Submit Transaction"
            description="Submit the transaction once all required signatures are collected"
            completed={status === "success"}
            active={status === "success"}
          />
        </div>

        {/* Signer Configuration */}
        <div className="card">
          <h2>👥 Signer Configuration</h2>
          <p>
            Configure the signers and their weights. In a real multisig account,
            these must match the account's existing signers on the network.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            {[1, 2, 3].map((num) => {
              const address = num === 1 ? signer1 : num === 2 ? signer2 : signer3;
              const setAddress = num === 1 ? setSigner1 : num === 2 ? setSigner2 : setSigner3;
              const isSigner = !!signersConnected[address];

              return (
                <div key={num} className="signer-card">
                  <h3>
                    <span className={`avatar ${["A", "B", "C"][num - 1]}`}>
                      {["A", "B", "C"][num - 1]}
                    </span>
                    Signer {num}
                  </h3>

                  <div className="signer-info">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="signer-address">{address}</span>
                    </div>
                    <div className="signer-status">
                      {isSigner ? (
                        <>
                          <div className="indicator signed"></div>
                          <button
                            onClick={() => handleDisconnectSigner(address)}
                            className="btn btn-secondary btn-small"
                          >
                            Disconnect
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="indicator pending"></div>
                          <button
                            onClick={() => handleConnectSigner(address)}
                            className="btn btn-primary btn-small"
                          >
                            Connect
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    <span style={{ marginRight: "4px" }}>Weight:</span>
                    <strong>1</strong>
                    <span style={{ marginLeft: "12px", color: "#94a3b8" }}>
                      Type: ed25519_public_key
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Threshold Display */}
        <div className="card">
          <h2>📊 Signature Threshold</h2>
          <div className="threshold-label">
            <span>Required signatures (medium threshold):</span>
            <span className="threshold-value">
              {thresholdStatus.required || 1}
            </span>
          </div>
          <div className="threshold-meter">
            <div
              className="threshold-fill"
              style={{ width: `${thresholdStatus.percentage || 0}%` }}
            ></div>
          </div>
          <div className="threshold-label">
            <span>Current weight:</span>
            <span className="threshold-value">
              {thresholdStatus.current} / {thresholdStatus.required}
            </span>
          </div>

          {thresholdStatus.percentage && thresholdStatus.percentage >= 100 && (
            <div className="alert alert-success" style={{ marginTop: "12px" }}>
              ✅ <strong>Threshold met!</strong> The transaction has enough signatures to submit.
            </div>
          )}

          {thresholdStatus.percentage && thresholdStatus.percentage > 0 && thresholdStatus.percentage < 100 && (
            <div className="alert alert-info" style={{ marginTop: "12px" }}>
              ℹ️ <strong>Partial signatures collected.</strong> More signatures needed.
            </div>
          )}

          {thresholdStatus.percentage === 0 && (
            <div className="alert alert-warning" style={{ marginTop: "12px" }}>
              ⚠️ <strong>No signatures yet.</strong> Build and sign the transaction.
            </div>
          )}

          {/* Current Signatures */}
          {signedBy.length > 0 && (
            <div className="signature-list">
              <h4>Signatures Collected ({signatureCount}):</h4>
              {signedBy.map((addr, idx) => (
                <div key={idx} className="sig-item">
                  <span className="check">✓</span>
                  <span className="user">{addr.slice(0, 8)}...</span>
                  <span className="weight">weight: 1</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transaction Details */}
        <div className="card">
          <h2>📝 Transaction Details</h2>
          <div className="form-group">
            <label className="label">Amount (XLM)</label>
            <input
              type="number"
              step="0.0000001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
              placeholder="10"
              disabled={currentStep >= 2}
            />
          </div>

          <div className="form-group">
            <label className="label">Destination Address</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="input"
              placeholder="G..."
              disabled={currentStep >= 2}
            />
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Defaults to Signer A address if blank
            </span>
          </div>

          <div className="form-group">
            <label className="label">Memo (optional)</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="input"
              placeholder="Optional memo"
              disabled={currentStep >= 2}
            />
          </div>
        </div>

        {/* Wallet Connection */}
        <div className="card">
          <h2>🔑 Wallet Connection</h2>
          <p>
            Connect a wallet to act as one of the signers. This wallet will be
            used to sign transactions.
          </p>
          <div className="connection-status">
            <button
              onClick={() => {
                if (walletConnected) {
                  disconnectWallet();
                } else {
                  connectWallet();
                }
              }}
              className={walletStatus.className}
              disabled={!walletInstalled}
            >
              {walletStatus.label}
            </button>
            {walletConnected && walletPublicKey && (
              <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                Active signer: {activeSigner || walletPublicKey.slice(0, 8)}...
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="card">
          <h2>⚡ Actions</h2>

          {/* Build Button */}
          <div style={{ marginBottom: "16px" }}>
            <button
              onClick={handleBuildTransaction}
              disabled={!walletConnected || !walletPublicKey || isLoading || currentStep >= 2}
              className="btn btn-primary"
              style={{ marginRight: "12px" }}
            >
              {currentStep >= 2 ? "✓ Transaction Built" : "🔨 Build Transaction"}
            </button>
            {unsignedXdr && (
              <button onClick={handleReset} className="btn btn-secondary">
                Reset
              </button>
            )}
          </div>

          {/* Sign Button */}
          {unsignedXdr && (
            <div style={{ marginBottom: "16px" }}>
              <button
                onClick={handleSignTransaction}
                disabled={!walletConnected || isLoading}
                className="btn btn-outline"
                style={{ marginRight: "12px" }}
              >
                {signedBy.includes(walletPublicKey || "") ? (
                  "✓ Already Signed"
                ) : (
                  `📝 Sign Transaction (${signedBy.length + 1}/${signerEntries.length})`
                )}
              </button>
            </div>
          )}

          {/* Submit Button */}
          {unsignedXdr && thresholdStatus.percentage && thresholdStatus.percentage >= 100 && (
            <div>
              <button
                onClick={handleSubmitTransaction}
                disabled={isLoading || status === "success"}
                className="btn btn-success"
              >
                {isLoading ? "Submitting..." : "🚀 Submit Transaction"}
              </button>
            </div>
          )}

          {unsignedXdr && thresholdStatus.percentage && thresholdStatus.percentage < 100 && (
            <div>
              <div className="alert alert-warning">
                ⚠️ <strong>Not enough signatures.</strong> Need {thresholdStatus.required - thresholdStatus.current} more signature(s) before submitting.
              </div>
            </div>
          )}
        </div>

        {/* Transaction Status */}
        {status !== "idle" && (
          <div className="card">
            <h2>📊 Transaction Status</h2>
            <StatusRow label="Status" value={status.toUpperCase()} code />
            <StatusRow label="Signature Count" value={signatureCount} />
            <StatusRow label="Signature Weight" value={signatureWeight} />
            <StatusRow label="Meets Threshold" value={meetsThreshold} />
            {hash && (
              <StatusRow label="Transaction Hash" value={hash} code />
            )}
          </div>
        )}

        {/* XDR Display (for demo purposes) */}
        {unsignedXdr && (
          <div className="card">
            <h2>📄 Transaction XDR</h2>
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
              The unsigned transaction XDR. This is what gets signed by each
              signer.
            </p>
            <div
              style={{
                background: "#0f172a",
                padding: "12px",
                borderRadius: "8px",
                fontFamily: "monospace",
                fontSize: "0.75rem",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {unsignedXdr}
            </div>
          </div>
        )}

        <footer className="footer">
          <p>
            Built with <a href="https://github.com/dark-princezz/stellar-hooks" style={{ color: "#6366f1" }}>stellar-hooks</a> -{" "}
            <a href="https://stellar-hooks.vercel.app" style={{ color: "#6366f1" }}>Documentation</a>
          </p>
        </footer>
      </div>
    </StellarProvider>
  );
}
