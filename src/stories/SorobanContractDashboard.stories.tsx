/**
 * SorobanContractDashboard — Example combining useSorobanContract read and write
 * calls in a single dashboard view.
 *
 * Covers:
 *  - Read-only queries (balance, info) using read() and query()
 *  - Write calls (transfer, mint, increment) using write() with full status tracking
 *  - Simulation-only preview using dryRun() for gas estimation before committing
 *  - Contract invocation with useFreighter wallet connection
 *  - Distinct pending/success/error UI states
 *  - Estimated cost display from simulation (resource fee, instructions)
 *  - JSON result display for complex returns
 *  - Loading states during simulation, signing, submission, polling
 */
import React, { useState, useEffect, useRef } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { useSorobanContract } from "../hooks/useSorobanContract";
import { useFreighter } from "../hooks/useFreighter";
import { asContractId, unsafeAsContractId } from "../types";
import type { SorobanSimulationEstimate } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle: "#6b7280",
    building: "#d97706",
    simulating: "#7c3aed",
    signing: "#7c3aed",
    submitting: "#2563eb",
    polling: "#0891b2",
    success: "#16a34a",
    error: "#dc2626",
  };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.15rem 0.55rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: 600,
        background: colors[status] ?? "#6b7280",
        color: "#fff",
        letterSpacing: "0.03em",
      }}
    >
      {status}
    </span>
  );
}

function EstimatedCostDisplay({ cost }: { cost: SorobanSimulationEstimate | null }) {
  if (!cost || (!cost.resourceFee && !cost.instructions)) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0.5rem",
        padding: "0.75rem",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        marginTop: "0.75rem",
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>Resource Fee</p>
        <p style={{ margin: "0.15rem 0 0", fontWeight: 600, fontFamily: "monospace" }}>
          {cost.resourceFee ?? "N/A"} stroops
        </p>
      </div>
      <div>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>Instructions</p>
        <p style={{ margin: "0.15rem 0 0", fontWeight: 600, fontFamily: "monospace" }}>
          {typeof cost.instructions === "number"
            ? cost.instructions.toLocaleString()
            : cost.instructions ?? "N/A"}
        </p>
      </div>
    </div>
  );
}

function JsonResult({ result }: { result: unknown }) {
  const [expanded, setExpanded] = useState(true);
  const jsonString = JSON.stringify(result, null, 2);

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "0.25rem 0.5rem",
          borderRadius: 6,
          border: "1px solid #d1d5db",
          background: "#f9fafb",
          fontSize: "0.8rem",
          cursor: "pointer",
        }}
      >
        {expanded ? "Hide" : "Show"} JSON result
      </button>
      {expanded && (
        <pre
          style={{
            marginTop: "0.5rem",
            padding: "0.75rem",
            background: "#1e293b",
            color: "#e2e8f0",
            borderRadius: 8,
            fontSize: "0.8rem",
            overflow: "auto",
            maxHeight: 300,
          }}
        >
          {jsonString}
        </pre>
      )}
    </div>
  );
}

function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #d1d5db",
        borderRadius: 10,
        padding: "1rem",
        marginBottom: "1rem",
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>{title}</h4>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}

function LoadingOverlay({ status, message }: { status: string; message?: string }) {
  const labels: Record<string, string> = {
    building: "Building transaction…",
    simulating: "Simulating…",
    signing: "Waiting for signature…",
    submitting: "Submitting to network…",
    polling: "Waiting for confirmation…",
  };
  const label = labels[status] || message || status;

  return (
    <div
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        padding: "0.75rem 1rem",
        background: "#eff6ff",
        border: "1px solid #93c5fd",
        borderRadius: 8,
        marginTop: "0.75rem",
        fontSize: "0.88rem",
        color: "#1d4ed8",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: 16,
          height: 16,
          border: "2px solid #93c5fd",
          borderTopColor: "#1d4ed8",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          flexShrink: 0,
        }}
      />
      {label}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function SuccessBanner({ hash, method }: { hash: string; method: string }) {
  const explorerUrl = `https://stellar.expert/explorer/testnet/tx/${hash}`;

  return (
    <div
      role="status"
      style={{
        background: "#f0fdf4",
        border: "1px solid #86efac",
        borderRadius: 8,
        padding: "1rem",
        marginTop: "0.75rem",
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, color: "#15803d" }}>
        ✅ {method}() confirmed
      </p>
      <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", wordBreak: "break-all" }}>
        <strong>TX Hash:</strong>{" "}
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#15803d" }}
        >
          {hash}
        </a>
      </p>
    </div>
  );
}

function ErrorBanner({ error, method }: { error: Error; method: string }) {
  return (
    <div
      role="alert"
      style={{
        background: "#fef2f2",
        border: "1px solid #fca5a5",
        borderRadius: 8,
        padding: "1rem",
        marginTop: "0.75rem",
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, color: "#b91c1c" }}>
        ❌ {method}() failed
      </p>
      <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "#7f1d1d" }}>
        <strong>Reason:</strong> {error.message}
      </p>
      {error instanceof Error && "result" in error && (
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#7f1d1d" }}>
          <strong>Result:</strong> <code>{String(error.result)}</code>
        </p>
      )}
    </div>
  );
}

// ─── Contract Interactions Section ────────────────────────────────────────────

interface ContractOperationsProps {
  contractId: string;
  network: "testnet" | "mainnet";
}

function ContractOperations({ contractId, network }: ContractOperationsProps) {
  const { isInstalled, isConnected, publicKey, connect, isLoading: walletLoading } = useFreighter();

  const {
    contract,
    read,
    write,
    query,
    dryRun,
    status,
    result,
    simulation,
    estimatedCost,
    error,
    isLoading,
    isSuccess,
    isError,
    reset,
  } = useSorobanContract(unsafeAsContractId(contractId), {
    method: "balance",
    args: [],
  });

  // Form state for write operations
  const [writeMethod, setWriteMethod] = useState("transfer");
  const [writeParams, setWriteParams] = useState<{ to?: string; amount?: string; memo?: string }>({});
  const [writeStatus, setWriteStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [writeError, setWriteError] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<unknown>(null);
  const [previewStatus, setPreviewStatus] = useState<"idle" | "simulating" | "success" | "error">("idle");

  // Reset form when contract ID changes
  useEffect(() => {
    setWriteMethod("transfer");
    setWriteParams({});
    reset();
  }, [contractId, reset]);

  // Handlers for read operations
  async function handleReadBalance() {
    const res = await read("balance", []);
    if (res) {
      setWriteStatus("idle");
      setWriteError(null);
    }
  }

  async function handleReadInfo() {
    const res = await read("info", []);
    if (res) {
      setWriteStatus("idle");
      setWriteError(null);
    }
  }

  // Handlers for write operations with simulation preview
  async function handlePreviewWrite() {
    setPreviewStatus("simulating");
    setPreviewResult(null);
    try {
      const res = await dryRun({
        method: writeMethod,
        args: Object.values(writeParams).filter(Boolean),
      });
      setPreviewResult(res ?? "void");
      setPreviewStatus("success");
      setWriteStatus("idle");
      setWriteError(null);
    } catch (err) {
      setPreviewResult(err instanceof Error ? err.message : String(err));
      setPreviewStatus("error");
      setWriteError(err instanceof Error ? err.message : String(err));
      setWriteStatus("error");
    }
  }

  async function handleExecuteWrite() {
    if (!isConnected || !publicKey) {
      setWriteError("Wallet not connected");
      setWriteStatus("error");
      return;
    }
    setWriteStatus("submitting");
    setWriteError(null);
    setPreviewResult(null);

    try {
      const args = Object.values(writeParams).filter(Boolean);
      const res = await write(writeMethod, args);
      if (res !== null) {
        setWriteStatus("success");
        setWriteError(null);
      } else {
        setWriteError("Write failed — check console for details");
        setWriteStatus("error");
      }
    } catch (err) {
      setWriteError(err instanceof Error ? err.message : String(err));
      setWriteStatus("error");
    }
  }

  // Formatters for input values
  function formatParamsForInput(method: string) {
    if (method === "transfer") return { to: "", amount: "" };
    if (method === "mint") return { to: "", amount: "" };
    if (method === "increment") return {};
    return {};
  }

  function handleMethodChange(method: string) {
    setWriteMethod(method);
    setWriteParams(formatParamsForInput(method));
  }

  const isFormValid = (() => {
    if (writeMethod === "transfer") return writeParams.to && writeParams.amount;
    if (writeMethod === "mint") return writeParams.to && writeParams.amount;
    if (writeMethod === "increment") return true;
    return false;
  })();

  return (
    <div>
      {/* Contract ID display */}
      <div
        style={{
          padding: "0.75rem",
          background: "#f3f4f6",
          borderRadius: 8,
          marginBottom: "1rem",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#374151" }}>
          <strong>Contract ID:</strong>{" "}
          <code
            style={{
              background: "#fff",
              padding: "0.15rem 0.4rem",
              borderRadius: 4,
              fontFamily: "monospace",
            }}
          >
            {contractId.slice(0, 8)}…{contractId.slice(-8)}
          </code>
        </p>
      </div>

      {/* Wallet gate */}
      {!isConnected && (
        <div
          style={{
            background: "#fefce8",
            border: "1px solid #fde047",
            borderRadius: 8,
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            fontSize: "0.88rem",
          }}
        >
          {!isInstalled ? (
            <p style={{ margin: 0 }}>
              ⚠️ Freighter wallet extension not detected.{" "}
              <a href="https://freighter.app" target="_blank" rel="noopener noreferrer">
                Install Freighter
              </a>{" "}
              to sign transactions.
            </p>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <span>🔌 Connect your wallet to write to the contract.</span>
              <button
                type="button"
                onClick={connect}
                disabled={walletLoading}
                style={{
                  padding: "0.3rem 0.8rem",
                  borderRadius: 6,
                  border: "1px solid #ca8a04",
                  background: "#fef9c3",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                {walletLoading ? "Connecting…" : "Connect Freighter"}
              </button>
            </div>
          )}
        </div>
      )}

      {isConnected && publicKey && (
        <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "#6b7280" }}>
          <strong>Signing as:</strong>{" "}
          <code style={{ wordBreak: "break-all" }}>{publicKey.slice(0, 16)}…</code>
        </p>
      )}

      {/* Read operations */}
      <Card title="Read Operations (simulate-only)">
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <button
            onClick={handleReadBalance}
            disabled={isLoading}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              background: "#f9fafb",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            {isLoading && status === "polling" ? "Fetching…" : "Read: balance()"}
          </button>
          <button
            onClick={handleReadInfo}
            disabled={isLoading}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              background: "#f9fafb",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            {isLoading && status === "polling" ? "Fetching…" : "Read: info()"}
          </button>
        </div>
        <StatusBadge status={status} />
        {estimatedCost && <EstimatedCostDisplay cost={estimatedCost} />}
        {result != null && <JsonResult result={result} />}
        {error && <ErrorBanner error={error} method="read" />}
      </Card>

      {/* Write operations */}
      <Card
        title="Write Operations (sign & submit)"
        action={
          <button
            onClick={() => {
              reset();
              setWriteStatus("idle");
              setWriteError(null);
              setPreviewResult(null);
            }}
            style={{
              padding: "0.25rem 0.6rem",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              background: "#f9fafb",
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            Reset
          </button>
        }
      >
        {/* Method selector */}
        <div style={{ marginBottom: "0.75rem" }}>
          <label htmlFor="write-method" style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.3rem" }}>
            Method
          </label>
          <select
            id="write-method"
            value={writeMethod}
            onChange={(e) => handleMethodChange(e.target.value)}
            disabled={isLoading || writeStatus === "submitting"}
            style={{
              width: "100%",
              padding: "0.45rem 0.6rem",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              fontSize: "0.88rem",
            }}
          >
            <option value="transfer">transfer(to, amount)</option>
            <option value="mint">mint(to, amount)</option>
            <option value="increment">increment()</option>
          </select>
        </div>

        {/* Parameters input */}
        {writeMethod === "transfer" || writeMethod === "mint" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <label htmlFor="write-to" style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.2rem" }}>
                To (G…)
              </label>
              <input
                id="write-to"
                type="text"
                value={writeParams.to ?? ""}
                onChange={(e) => setWriteParams((prev) => ({ ...prev, to: e.target.value }))}
                placeholder="GAX..."
                disabled={isLoading || writeStatus === "submitting"}
                style={{
                  width: "100%",
                  padding: "0.45rem 0.6rem",
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                  fontSize: "0.85rem",
                  fontFamily: "monospace",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label htmlFor="write-amount" style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.2rem" }}>
                Amount
              </label>
              <input
                id="write-amount"
                type="number"
                inputMode="decimal"
                value={writeParams.amount ?? ""}
                onChange={(e) => setWriteParams((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="10.5"
                min="0"
                step="any"
                disabled={isLoading || writeStatus === "submitting"}
                style={{
                  width: "100%",
                  padding: "0.45rem 0.6rem",
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                  fontSize: "0.85rem",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        ) : null}

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={handlePreviewWrite}
            disabled={!isConnected || isLoading || !isFormValid}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: 6,
              border: "1px solid #6366f1",
              background: "#6366f1",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: (!isConnected || !isFormValid) ? "not-allowed" : "pointer",
            }}
          >
            {previewStatus === "simulating" ? "Simulating…" : "Dry-run / Preview"}
          </button>
          <button
            onClick={handleExecuteWrite}
            disabled={!isConnected || isLoading || writeStatus === "submitting" || !isFormValid}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: 6,
              border: "none",
              background: (!isConnected || writeStatus === "submitting") ? "#d1d5db" : "#16a34a",
              color: (!isConnected || writeStatus === "submitting") ? "#6b7280" : "#fff",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: (!isConnected || writeStatus === "submitting") ? "not-allowed" : "pointer",
            }}
          >
            {writeStatus === "submitting" ? "Submitting…" : "Execute Write"}
          </button>
        </div>

        {/* Dry-run results */}
        {previewStatus === "success" && previewResult !== null && (
          <div
            style={{
              marginTop: "0.75rem",
              padding: "0.75rem",
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: 6,
            }}
          >
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#166534", fontWeight: 600 }}>
              ✅ Simulation successful
            </p>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "#15803d" }}>
              <strong>Estimated return:</strong> {String(previewResult)}
            </p>
          </div>
        )}
        {previewStatus === "error" && previewResult && (
          <div
            style={{
              marginTop: "0.75rem",
              padding: "0.75rem",
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              borderRadius: 6,
            }}
          >
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#991b1b", fontWeight: 600 }}>
              ⚠️ Simulation failed
            </p>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "#b91c1c" }}>
              {String(previewResult)}
            </p>
          </div>
        )}

        {/* Write status feedback */}
        <StatusBadge status={writeStatus === "submitting" ? "submitting" : writeStatus === "success" ? "success" : writeStatus === "error" ? "error" : status} />
        {writeError && <ErrorBanner error={new Error(writeError)} method={writeMethod} />}
        {isSuccess && result && <SuccessBanner hash={String(result)} method={writeMethod} />}
      </Card>

      {/* Transaction summary */}
      {status !== "idle" && status !== "success" && status !== "error" && (
        <LoadingOverlay
          status={status}
          message={
            status === "building" ? "Building transaction…" :
            status === "simulating" ? "Simulating transaction…" :
            status === "signing" ? "Waiting for signature…" :
            status === "submitting" ? "Submitting to network…" :
            status === "polling" ? "Waiting for confirmation…" :
            undefined
          }
        />
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface SorobanContractDashboardProps {
  defaultContractId?: string;
  network?: "testnet" | "mainnet";
}

function SorobanContractDashboard({
  defaultContractId = "CCW67TSBXS2THGAOWHBV4YXGQDHQDIF5XDI333333333333333333333",
  network = "testnet",
}: SorobanContractDashboardProps) {
  const [contractId, setContractId] = useState(defaultContractId);

  return (
    <div
      style={{
        border: "1px solid #d1d5db",
        borderRadius: 10,
        padding: "1.5rem",
        maxWidth: 720,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem" }}>Soroban Contract Dashboard</h3>
        <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
          {network === "mainnet" ? "Mainnet" : "Testnet"} • Preview
        </span>
      </div>

      {/* Contract ID input */}
      <div style={{ marginBottom: "1.25rem" }}>
        <label htmlFor="contract-id" style={{ display: "block", fontWeight: 600, fontSize: "0.88rem", marginBottom: "0.3rem" }}>
          Contract ID (C…)
        </label>
        <input
          id="contract-id"
          type="text"
          value={contractId}
          onChange={(e) => setContractId(e.target.value)}
          placeholder="CCW67TSBXS2THGAOWHBV4YXGQDHQDIF5XDI3…"
          style={{
            width: "100%",
            padding: "0.5rem 0.6rem",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            fontSize: "0.88rem",
            fontFamily: "monospace",
          }}
        />
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "#6b7280" }}>
          This dashboard demonstrates both read (simulate-only) and write (sign & submit) operations with {network === "testnet" ? "testnet" : "mainnet"} contracts.
        </p>
      </div>

      {/* Operations */}
      <ContractOperations contractId={contractId} network={network} />
    </div>
  );
}

// ─── Storybook Meta ───────────────────────────────────────────────────────────

const meta: Meta<typeof SorobanContractDashboard> = {
  title: "Examples/SorobanContractDashboard",
  component: SorobanContractDashboard,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A comprehensive Soroban contract interaction dashboard that combines read-only queries and write operations " +
          "with full status tracking, dry-run simulation, and estimated gas cost display.",
      },
    },
  },
  argTypes: {
    defaultContractId: {
      control: "text",
      description: "Pre-fill the contract ID field",
    },
    network: {
      control: { type: "radio" },
      options: ["testnet", "mainnet"],
      description: "Network mode indicator for the dashboard",
    },
  },
};

export default meta;
type Story = StoryObj<typeof SorobanContractDashboard>;

/** Default dashboard with a test contract on testnet. */
export const Default: Story = {
  args: {
    defaultContractId: "CCW67TSBXS2THGAOWHBV4YXGQDHQDIF5XDI333333333333333333333",
    network: "testnet",
  },
};

/** Mainnet mode example. */
export const MainnetMode: Story = {
  name: "Mainnet (example)",
  args: {
    defaultContractId: "CCW67TSBXS2THGAOWHBV4YXGQDHQDIF5XDI333333333333333333333",
    network: "mainnet",
  },
};
