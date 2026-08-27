import { useState, useMemo } from "react";
import {
  StellarProvider,
  useFreighter,
  usePathPayment,
} from "stellar-hooks";
import type { PathPaymentAsset } from "stellar-hooks";

// Testnet USDC issuer (Circle's testnet anchor — for demo purposes only)
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

type AssetKey = "XLM" | "USDC";

const ASSETS: Record<AssetKey, PathPaymentAsset> = {
  XLM: { type: "native" },
  USDC: { type: "credit", code: "USDC", issuer: USDC_ISSUER },
};

const SLIPPAGE_OPTIONS = [
  { label: "0.5%", value: 0.005 },
  { label: "1%", value: 0.01 },
  { label: "2%", value: 0.02 },
  { label: "5%", value: 0.05 },
];

const TESTNET_EXPLORER = "https://stellar.expert/explorer/testnet/tx";

function getOppositeAsset(asset: AssetKey): AssetKey {
  return asset === "XLM" ? "USDC" : "XLM";
}

// ─── Swap form (rendered when wallet is connected) ───────────────────────────

function SwapForm({ publicKey, disconnect }: { publicKey: string; disconnect: () => void }) {
  const [sendAssetKey, setSendAssetKey] = useState<AssetKey>("XLM");
  const [sendAmount, setSendAmount] = useState("");
  const [slippage, setSlippage] = useState(0.01); // default 1%
  const [destination, setDestination] = useState("");

  const receiveAssetKey = getOppositeAsset(sendAssetKey);

  // Estimated receive amount (UI-only, 1:1 rate for demo)
  const estimatedReceive = useMemo(() => {
    const parsed = parseFloat(sendAmount);
    if (isNaN(parsed) || parsed <= 0) return "";
    // For UI demo purposes we assume 1:1 rate; slippage floor is what matters
    return parsed.toFixed(7);
  }, [sendAmount]);

  // destMin = estimatedReceive * (1 - slippage)
  const destMin = useMemo(() => {
    const parsed = parseFloat(estimatedReceive);
    if (isNaN(parsed) || parsed <= 0) return "0";
    return (parsed * (1 - slippage)).toFixed(7);
  }, [estimatedReceive, slippage]);

  const { submit, status, hash, error, isLoading, isSuccess, isError, reset } =
    usePathPayment({
      mode: "strict-send",
      sendAsset: ASSETS[sendAssetKey],
      sendAmount: sendAmount || "0",
      destination: destination || publicKey, // fall back to self if blank (demo)
      destAsset: ASSETS[receiveAssetKey],
      destMin,
      fee: 100,
      timeoutSeconds: 60,
    });

  const handleSwap = async () => {
    if (!sendAmount || parseFloat(sendAmount) <= 0) return;
    reset();
    await submit();
  };

  const handleFlipAssets = () => {
    setSendAssetKey(receiveAssetKey);
    setSendAmount("");
    reset();
  };

  const isFormValid =
    sendAmount !== "" && parseFloat(sendAmount) > 0;

  const statusMessage: Record<typeof status, string> = {
    idle: "",
    submitting: "⏳ Submitting transaction to the network…",
    polling: "🔄 Waiting for confirmation…",
    success: "✓ Swap successful!",
    error: "✗ Swap failed.",
  };

  return (
    <div className="container">
      <div className="card">
        {/* Header */}
        <div className="header">
          <h2>Token Swap</h2>
          <button onClick={disconnect} className="button secondary">
            Disconnect
          </button>
        </div>

        {/* Connected wallet info */}
        <div className="balance">
          <span className="label">Connected:</span>
          <span className="value mono truncate">{publicKey}</span>
        </div>

        {/* Swap form */}
        <div className="form">
          {/* Send Asset */}
          <div className="field">
            <label htmlFor="send-asset">Send Asset</label>
            <select
              id="send-asset"
              value={sendAssetKey}
              onChange={(e) => {
                setSendAssetKey(e.target.value as AssetKey);
                setSendAmount("");
                reset();
              }}
              className="select"
            >
              <option value="XLM">XLM (Stellar Lumens)</option>
              <option value="USDC">USDC (Testnet)</option>
            </select>
          </div>

          {/* Send Amount */}
          <div className="field">
            <label htmlFor="send-amount">Send Amount</label>
            <input
              id="send-amount"
              type="number"
              step="0.0000001"
              min="0"
              placeholder="0.0000000"
              value={sendAmount}
              onChange={(e) => {
                setSendAmount(e.target.value);
                reset();
              }}
            />
          </div>

          {/* Flip button */}
          <div className="flip-row">
            <button
              type="button"
              onClick={handleFlipAssets}
              className="button secondary flip-btn"
              title="Flip send and receive assets"
            >
              ⇅ Flip
            </button>
          </div>

          {/* Receive Asset (read-only opposite) */}
          <div className="field">
            <label htmlFor="receive-asset">Receive Asset</label>
            <select
              id="receive-asset"
              value={receiveAssetKey}
              disabled
              className="select"
            >
              <option value="XLM">XLM (Stellar Lumens)</option>
              <option value="USDC">USDC (Testnet)</option>
            </select>
          </div>

          {/* Estimated Receive */}
          <div className="field">
            <label>Estimated Receive</label>
            <div className="estimate-box">
              {estimatedReceive ? (
                <>
                  <span className="estimate-value">{estimatedReceive}</span>
                  <span className="estimate-asset">{receiveAssetKey}</span>
                </>
              ) : (
                <span className="estimate-placeholder">Enter send amount</span>
              )}
            </div>
          </div>

          {/* Slippage Tolerance */}
          <div className="field">
            <label>Slippage Tolerance</label>
            <div className="slippage-row">
              {SLIPPAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSlippage(opt.value)}
                  className={`slippage-btn ${slippage === opt.value ? "active" : ""}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* destMin display */}
          {estimatedReceive && (
            <div className="dest-min-row">
              <span className="dest-min-label">Minimum received:</span>
              <span className="dest-min-value">
                {destMin} {receiveAssetKey}
              </span>
            </div>
          )}

          {/* Destination (optional — defaults to self for demo) */}
          <div className="field">
            <label htmlFor="destination">
              Recipient Address{" "}
              <span className="optional">(optional — defaults to your own address)</span>
            </label>
            <input
              id="destination"
              type="text"
              placeholder="G… (leave blank to swap to yourself)"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>

          {/* Status banner */}
          {status !== "idle" && (
            <div className={`status-banner status-${status}`}>
              {statusMessage[status]}
            </div>
          )}

          {/* Success block */}
          {isSuccess && hash && (
            <div className="success">
              <p>✓ Swap successful!</p>
              <p className="hash">Hash: {hash}</p>
              <a
                href={`${TESTNET_EXPLORER}/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="explorer-link"
              >
                View on Stellar Expert →
              </a>
            </div>
          )}

          {/* Error block */}
          {isError && error && (
            <div className="error">
              <p>✗ Swap failed</p>
              <p>{error.message}</p>
            </div>
          )}

          {/* Swap button */}
          <button
            onClick={handleSwap}
            disabled={isLoading || !isFormValid}
            className="button primary swap-btn"
          >
            {isLoading ? "Swapping…" : `Swap ${sendAssetKey} → ${receiveAssetKey}`}
          </button>

          {isSuccess && (
            <button
              onClick={() => {
                reset();
                setSendAmount("");
              }}
              className="button secondary reset-btn"
            >
              New Swap
            </button>
          )}
        </div>

        {/* Info footer */}
        <div className="info">
          <p className="network">Network: Testnet</p>
          <p>
            Mode: <strong>strict-send</strong> — you send exactly{" "}
            {sendAmount || "0"} {sendAssetKey}, receive at least {destMin}{" "}
            {receiveAssetKey}.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Root component ──────────────────────────────────────────────────────────

function PathPaymentSwapDemo() {
  const { isConnected, publicKey, connect, disconnect, isInstalled } =
    useFreighter();

  if (!isInstalled) {
    return (
      <div className="container">
        <div className="card">
          <h2>Freighter Not Detected</h2>
          <p>
            Please install the Freighter wallet browser extension to use this
            demo.
          </p>
          <a
            href="https://freighter.app"
            target="_blank"
            rel="noopener noreferrer"
            className="button"
          >
            Install Freighter
          </a>
        </div>
      </div>
    );
  }

  if (!isConnected || !publicKey) {
    return (
      <div className="container">
        <div className="card">
          <h2>Connect Your Wallet</h2>
          <p>
            Connect your Freighter wallet to swap tokens via Stellar's path
            payment on testnet.
          </p>
          <button onClick={connect} className="button">
            Connect Freighter
          </button>
        </div>
      </div>
    );
  }

  return <SwapForm publicKey={publicKey} disconnect={disconnect} />;
}

function App() {
  return (
    <StellarProvider network="testnet">
      <div className="app">
        <header>
          <h1>Stellar Hooks</h1>
          <p>Path Payment Swap Example</p>
        </header>
        <PathPaymentSwapDemo />
      </div>
    </StellarProvider>
  );
}

export default App;
