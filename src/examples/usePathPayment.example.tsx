/**
 * @file usePathPayment.example.tsx
 * @description Asset-swap style form with live path preview using usePathPayment and useStrictSendPaths.
 * @package stellar-hooks
 * @license MIT
 */

import { useState, useMemo, useEffect } from "react";
import {
  Asset,
  Horizon,
} from "@stellar/stellar-sdk";
import {
  usePathPayment,
  useStrictSendPaths,
  useFreighter,
  useStellarNetwork,
} from "../hooks";

// ─── Constants ────────────────────────────────────────────────────────────────

// USDC issuers for common networks
const USDC_ISSUERS = {
  testnet: "GBVAIOXC5XOGTWTKK4MI3J5TTQKZCKW7NY3W6Y74W7D3424M6GJQZ3XU",
  public: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
};

// USDT issuers
const USDT_ISSUERS = {
  testnet: "GBVAIOXC5XOGTWTKK4MI3J5TTQKZCKW7NY3W6Y74W7D3424M6GJQZ3XU",
  public: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type AssetType = "native" | "credit";
type Mode = "strict-send" | "strict-receive";

interface AssetOption {
  type: AssetType;
  code: string;
  issuer?: string;
  label: string;
}

// ─── Example Component ────────────────────────────────────────────────────────

export function PathPaymentSwapExample() {
  const [mode, setMode] = useState<Mode>("strict-send");
  const [sendAmount, setSendAmount] = useState<string>("1");
  const [destination, setDestination] = useState<string>("");
  const [selectedSendAsset, setSelectedSendAsset] = useState<AssetOption>({
    type: "native",
    code: "XLM",
    label: "XLM (native)",
  });
  const [selectedDestAsset, setSelectedDestAsset] = useState<AssetOption>({
    type: "credit",
    code: "USDC",
    issuer: USDC_ISSUERS.testnet,
    label: "USDC",
  });
  const [destMin, setDestMin] = useState<string>("0.9");
  const [paths, setPaths] = useState<AssetOption[][]>([]);
  const [isLoadingPaths, setIsLoadingPaths] = useState(false);

  // Network configuration
  const { network, networkPassphrase } = useStellarNetwork();
  const networkName = network.network;

  // Wallet connection
  const { connect, disconnect, isConnected, publicKey, error: walletError } =
    useFreighter();

  // Path preview (live rate preview)
  const pathPreview = useStrictSendPaths(
    useMemo(() => {
      if (selectedSendAsset.type === "native") {
        return Asset.native();
      }
      return new Asset(selectedSendAsset.code, selectedSendAsset.issuer);
    }, [selectedSendAsset]),
    sendAmount || "0",
    useMemo(() => {
      if (!selectedDestAsset) return [];
      return [new Asset(selectedDestAsset.code, selectedDestAsset.issuer)];
    }, [selectedDestAsset]),
    { debounceMs: 300, enabled: !!sendAmount && isConnected }
  );

  // Path payment execution
  const pathPayment = usePathPayment({
    mode,
    sendAsset:
      selectedSendAsset.type === "native"
        ? { type: "native" }
        : { type: "credit", code: selectedSendAsset.code, issuer: selectedSendAsset.issuer! },
    sendAmount,
    destination,
    destAsset:
      selectedDestAsset.type === "native"
        ? { type: "native" }
        : { type: "credit", code: selectedDestAsset.code, issuer: selectedDestAsset.issuer! },
    destMin,
    timeoutSeconds: 60,
    async onSuccess(hash) {
      console.log("Transaction successful:", hash);
      // Optional: Clear form or show success message
    },
    onError(error) {
      console.error("Transaction failed:", error);
      // Optional: Show error to user
    },
  });

  // Derive paths from preview for display
  const pathOptions = useMemo(() => {
    if (!pathPreview.paths || pathPreview.paths.length === 0) return [];
    return pathPreview.paths.map((p) => {
      const pathAssets: AssetOption[] = (p.path || []).map((step) => ({
        type: step.asset_type === "native" ? "native" : "credit",
        code: step.asset_code || "UNKNOWN",
        issuer: step.asset_issuer,
        label:
          step.asset_type === "native"
            ? "XLM"
            : `${step.asset_code || "UNKNOWN"} (${step.asset_issuer?.slice(0, 6)}...)`,
      }));
      return pathAssets;
    });
  }, [pathPreview.paths]);

  // Auto-populate destMin based on path preview (strict-send mode)
  useEffect(() => {
    if (mode === "strict-send" && pathPreview.paths.length > 0 && !destMin) {
      const bestPath = pathPreview.paths[0];
      setDestMin(bestPath.destination_amount);
    }
  }, [mode, pathPreview.paths, destMin]);

  // Asset options for dropdowns
  const assetOptions: AssetOption[] = [
    { type: "native", code: "XLM", label: "XLM (native)" },
    { type: "credit", code: "USDC", issuer: USDC_ISSUERS.testnet, label: "USDC" },
    { type: "credit", code: "USDT", issuer: USDT_ISSUERS.testnet, label: "USDT" },
  ];

  const handleSendAssetChange = (option: AssetOption) => {
    setSelectedSendAsset(option);
    // Reset send amount when asset changes to avoid confusion
    if (parseFloat(sendAmount) > 0) {
      setSendAmount("1");
    }
  };

  const handleDestAssetChange = (option: AssetOption) => {
    setSelectedDestAsset(option);
    // Update destination assets for path query
  };

  const handleConnect = async () => {
    await connect();
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleSubmit = async () => {
    if (!destination) {
      alert("Please enter a destination address");
      return;
    }
    if (!publicKey) {
      alert("Please connect your wallet first");
      return;
    }
    await pathPayment.submit();
  };

  const formatAsset = (asset: AssetOption) => {
    return asset.type === "native" ? "XLM" : `${asset.code} (${asset.issuer?.slice(0, 6)}...)`;
  };

  // UI Components
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>🔄 Asset Swap</h2>
        <p>Sign and submit a path payment on {networkName}</p>
      </div>

      {/* Connection Status */}
      <div style={styles.connectionStatus}>
        {isConnected ? (
          <div style={styles.connected}>
            <span style={styles.walletAddress}>{publicKey.slice(0, 8)}...{publicKey.slice(-6)}</span>
            <button style={styles.disconnectBtn} onClick={handleDisconnect}>
              Disconnect
            </button>
          </div>
        ) : (
          <button style={styles.connectBtn} onClick={handleConnect}>
            Connect Wallet
          </button>
        )}
        {walletError && <div style={styles.error}>{walletError.message}</div>}
      </div>

      <div style={styles.form}>
        {/* Send Section */}
        <div style={styles.assetSection}>
          <label style={styles.label}>You Send</label>
          <div style={styles.assetInputRow}>
            <input
              type="number"
              min="0"
              step="any"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
              placeholder="Amount"
              disabled={!isConnected}
              style={styles.amountInput}
            />
            <div style={styles.assetSelector}>
              <select
                value={selectedSendAsset.code}
                onChange={(e) => {
                  const option = assetOptions.find((a) => a.code === e.target.value) || assetOptions[0];
                  handleSendAssetChange(option);
                }}
                disabled={!isConnected}
                style={styles.assetSelect}
              >
                {assetOptions.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Arrow Divider */}
        <div style={styles.arrowContainer}>
          <span style={styles.arrow}>↓</span>
        </div>

        {/* Receive Section */}
        <div style={styles.assetSection}>
          <label style={styles.label}>Recipient Gets</label>
          <div style={styles.assetInputRow}>
            <input
              type="number"
              min="0"
              step="any"
              value={destMin}
              onChange={(e) => setDestMin(e.target.value)}
              placeholder="Minimum amount"
              disabled={!isConnected}
              style={styles.amountInput}
            />
            <div style={styles.assetSelector}>
              <select
                value={selectedDestAsset.code}
                onChange={(e) => {
                  const option = assetOptions.find((a) => a.code === e.target.value) || assetOptions[0];
                  handleDestAssetChange(option);
                }}
                disabled={!isConnected}
                style={styles.assetSelect}
              >
                {assetOptions.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Destination Address */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>Destination Address</label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="G..."
            disabled={!isConnected}
            style={styles.input}
          />
          {!destination && <span style={styles.hint}>Enter recipient's Stellar address (G...)</span>}
        </div>

        {/* Mode Toggle */}
        <div style={styles.modeToggle}>
          <button
            style={mode === "strict-send" ? styles.modeBtnActive : styles.modeBtn}
            onClick={() => setMode("strict-send")}
            disabled={!isConnected}
          >
            Strict Send
          </button>
          <button
            style={mode === "strict-receive" ? styles.modeBtnActive : styles.modeBtn}
            onClick={() => setMode("strict-receive")}
            disabled={!isConnected}
          >
            Strict Receive
          </button>
        </div>

        {/* Live Path Preview */}
        <div style={styles.pathPreview}>
          <h4> Available Payment Paths </h4>
          {pathPreview.isLoading ? (
            <div style={styles.loading}>Finding best path...</div>
          ) : pathPreview.error ? (
            <div style={styles.error}>Error: {pathPreview.error.message}</div>
          ) : pathPreview.paths.length === 0 ? (
            <div style={styles.noPaths}>No paths found. Try different assets.</div>
          ) : (
            <div style={styles.pathList}>
              {pathPreview.paths.slice(0, 3).map((p, idx) => (
                <div key={idx} style={styles.pathItem}>
                  <div style={styles.pathInfo}>
                    <span style={styles.pathLabel}>Path {idx + 1}:</span>
                    <span style={styles.pathDetail}>
                      {p.source_amount} {p.source_asset_code || "XLM"} →{" "}
                      {p.destination_amount} {p.destination_asset_code || "XLM"}
                    </span>
                  </div>
                  {p.path && p.path.length > 0 && (
                    <div style={styles.pathDetails}>
                      <span style={styles.pathLabel}>Via:</span>
                      <span style={styles.pathSteps}>
                        {p.path.map((step, stepIdx) => (
                          <span key={stepIdx} style={styles.pathStep}>
                            {step.asset_type === "native"
                              ? "XLM"
                              : `${step.asset_code} (${step.asset_issuer?.slice(0, 4)}...)`}
                            {stepIdx < p.path!.length - 1 && " → "}
                          </span>
                        ))}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          style={styles.submitBtn}
          onClick={handleSubmit}
          disabled={!isConnected || pathPayment.isLoading || pathPayment.isSubmitting}
        >
          {pathPayment.isLoading || pathPayment.isSubmitting ? (
            <span style={styles.loadingText}>Processing...</span>
          ) : (
            "Submit Transaction"
          )}
        </button>

        {/* Transaction Status */}
        {pathPayment.status !== "idle" && (
          <div style={styles.statusSection}>
            <h4>Transaction Status</h4>
            <div style={styles.statusText}>
              <span style={styles.statusLabel}>Status:</span>
              <span style={getStatusStyle(pathPayment.status)}>
                {pathPayment.status}
              </span>
            </div>
            {pathPayment.hash && (
              <div style={styles.statusText}>
                <span style={styles.statusLabel}>Hash:</span>
                <span style={styles.hash}>{pathPayment.hash}</span>
              </div>
            )}
            {pathPayment.error && (
              <div style={styles.statusText}>
                <span style={styles.statusLabel}>Error:</span>
                <span style={styles.errorMessage}>{pathPayment.error.message}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────

function PathPreviewComponent({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  const { config } = useStellarNetwork();

  return (
    <div style={styles.previewContainer}>
      <h4>Available Paths Preview</h4>
      {/* Would use useStrictSendPaths hook here */}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    padding: "20px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backgroundColor: "#f8f9fa",
    borderRadius: "12px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  },
  header: {
    textAlign: "center",
    marginBottom: "24px",
  },
  connectionStatus: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    padding: "12px",
    backgroundColor: "#fff",
    borderRadius: "8px",
    border: "1px solid #e0e0e0",
  },
  connected: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  walletAddress: {
    fontFamily: "monospace",
    color: "#4a5568",
  },
  connectBtn: {
    padding: "10px 20px",
    backgroundColor: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "background-color 0.2s",
  },
  disconnectBtn: {
    padding: "6px 12px",
    backgroundColor: "#e53e3e",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  assetSection: {
    padding: "16px",
    backgroundColor: "#fff",
    borderRadius: "8px",
    border: "1px solid #e0e0e0",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "600",
    color: "#2d3748",
    fontSize: "14px",
  },
  assetInputRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  amountInput: {
    flex: "1",
    padding: "12px",
    fontSize: "16px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    width: "120px",
  },
  assetSelector: {
    flex: "2",
  },
  assetSelect: {
    width: "100%",
    padding: "12px",
    fontSize: "14px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    backgroundColor: "#fff",
    cursor: "pointer",
  },
  inputGroup: {
    padding: "16px",
    backgroundColor: "#fff",
    borderRadius: "8px",
    border: "1px solid #e0e0e0",
  },
  input: {
    width: "100%",
    padding: "12px",
    fontSize: "14px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    boxSizing: "border-box",
  },
  hint: {
    display: "block",
    marginTop: "4px",
    fontSize: "12px",
    color: "#718096",
  },
  arrowContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "8px",
  },
  arrow: {
    fontSize: "24px",
    color: "#a0aec0",
  },
  modeToggle: {
    display: "flex",
    gap: "8px",
    padding: "16px",
    backgroundColor: "#fff",
    borderRadius: "8px",
    border: "1px solid #e0e0e0",
  },
  modeBtn: {
    flex: "1",
    padding: "10px",
    backgroundColor: "#f7fafc",
    color: "#718096",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  modeBtnActive: {
    flex: "1",
    padding: "10px",
    backgroundColor: "#4f46e5",
    color: "#fff",
    border: "1px solid #4f46e5",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.2s",
  },
  pathPreview: {
    padding: "16px",
    backgroundColor: "#f0f9ff",
    borderRadius: "8px",
    border: "1px solid #bae6fd",
  },
  pathList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  pathItem: {
    padding: "12px",
    backgroundColor: "#fff",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
  },
  pathInfo: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  pathLabel: {
    fontWeight: "600",
    color: "#4a5568",
    fontSize: "13px",
  },
  pathDetail: {
    color: "#2d3748",
    fontSize: "13px",
  },
  pathDetails: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    marginTop: "4px",
    fontSize: "12px",
  },
  pathSteps: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
  },
  pathStep: {
    backgroundColor: "#ebf4ff",
    padding: "2px 6px",
    borderRadius: "4px",
    color: "#3182ce",
    fontFamily: "monospace",
    fontSize: "11px",
  },
  submitBtn: {
    width: "100%",
    padding: "14px",
    backgroundColor: "#48bb78",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  statusSection: {
    padding: "16px",
    backgroundColor: "#fff",
    borderRadius: "8px",
    border: "1px solid #e0e0e0",
  },
  statusText: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
    fontSize: "14px",
  },
  statusLabel: {
    fontWeight: "600",
    color: "#4a5568",
    minWidth: "70px",
  },
  previewContainer: {
    padding: "16px",
    backgroundColor: "#fff",
    borderRadius: "8px",
    border: "1px solid #e0e0e0",
  },
  loading: {
    color: "#4299e1",
    fontSize: "13px",
  },
  noPaths: {
    color: "#718096",
    fontSize: "13px",
    fontStyle: "italic",
  },
  loadingText: {
    display: "inline-block",
    animation: "pulse 1.5s infinite",
  },
  errorMessage: {
    color: "#e53e3e",
    wordBreak: "break-word",
  },
  hash: {
    fontFamily: "monospace",
    fontSize: "12px",
    color: "#4a5568",
    wordBreak: "break-all",
  },
};

function getStatusStyle(status: string) {
  const statusStyles: Record<string, React.CSSProperties> = {
    idle: { color: "#718096" },
    submitting: { color: "#4299e1", fontWeight: "600" },
    polling: { color: "#f6ad55", fontWeight: "600" },
    success: { color: "#48bb78", fontWeight: "600" },
    error: { color: "#e53e3e", fontWeight: "600" },
  };
  return statusStyles[status] || statusStyles.idle;
}

// ─── Export Example ───────────────────────────────────────────────────────────

export default {
  title: "Path Payment Example",
  description:
    "A simple asset-swap style form with live path preview using usePathPayment and useStrictSendPaths.",
  component: PathPaymentSwapExample,
};
