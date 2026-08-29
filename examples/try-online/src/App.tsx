/**
 * @file App.tsx
 * @description Try Stellar Hooks online - Minimal example with multiple hooks
 * @package stellar-hooks
 * @license MIT
 */

import { useState } from "react";
import {
  StellarProvider,
  useFreighter,
  usePathPayment,
  useStellarAccount,
  useStellarBalance,
  usePayment,
} from "stellar-hooks";

// Testnet USDC issuer (Circle's testnet anchor — for demo purposes only)
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

// ─── Toggle Button for Switching Between Examples ────────────────────────────

function ExampleToggle({
  current,
  options,
  onChange,
}: {
  current: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div style={styles.exampleToggle}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={
            current === opt.value ? styles.exampleBtnActive : styles.exampleBtn
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Wallet Connection Example ───────────────────────────────────────────────

function WalletExample() {
  const { isConnected, publicKey, connect, disconnect, isInstalled } =
    useFreighter();

  if (!isInstalled) {
    return (
      <div style={styles.infoBox}>
        <h3>❌ Freighter Not Detected</h3>
        <p>Please install the Freighter wallet browser extension:</p>
        <a
          href="https://freighter.app"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.link}
        >
          Install Freighter
        </a>
      </div>
    );
  }

  if (!isConnected || !publicKey) {
    return (
      <div style={styles.walletCard}>
        <h3>Connect Wallet</h3>
        <p>Click below to connect your Freighter wallet:</p>
        <button onClick={connect} style={styles.btnPrimary}>
          🔌 Connect Freighter
        </button>
      </div>
    );
  }

  return (
    <div style={styles.walletCard}>
      <div style={styles.walletHeader}>
        <h3>✅ Connected</h3>
        <button onClick={disconnect} style={styles.btnSecondary}>
          🚪 Disconnect
        </button>
      </div>
      <div style={styles.walletInfo}>
        <span style={styles.label}>Public Key:</span>
        <code style={styles.code}>{publicKey}</code>
      </div>
      <p style={styles.smallText}>
        Your wallet is connected and ready for transactions!
      </p>
    </div>
  );
}

// ─── Account Viewer Example ──────────────────────────────────────────────────

function AccountViewerExample() {
  const { publicKey } = useFreighter();
  const { account, isLoading, error } = useStellarAccount(
    publicKey ?? undefined
  );

  if (!publicKey) {
    return (
      <div style={styles.infoBox}>
        <p>Connect a wallet first to view account details.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={styles.accountCard}>
        <h3>Loading Account...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.infoBox}>
        <p>Error loading account: {error.message}</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div style={styles.infoBox}>
        <p>No account found for this public key.</p>
      </div>
    );
  }

  return (
    <div style={styles.accountCard}>
      <h3>Account Details</h3>
      <div style={styles.infoGrid}>
        <div style={styles.infoItem}>
          <span style={styles.label}>Address:</span>
          <code style={styles.code}>{account.account_id}</code>
        </div>
        <div style={styles.infoItem}>
          <span style={styles.label}>Sequence:</span>
          <code style={styles.code}>{account.sequence}</code>
        </div>
        <div style={styles.infoItem}>
          <span style={styles.label}>Subentry Count:</span>
          <span style={styles.value}>{account.subentry_count}</span>
        </div>
        <div style={styles.infoItem}>
          <span style={styles.label}>Balances:</span>
          <ul style={styles.balanceList}>
            {account.balances?.map((b, i) => (
              <li key={i} style={styles.balanceItem}>
                {b.balance} {b.asset_code || "XLM"} ({b.asset_type})
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Balance Viewer Example ──────────────────────────────────────────────────

function BalanceViewerExample() {
  const { publicKey } = useFreighter();

  const { balance, asset, isLoading, error } = useStellarBalance(
    publicKey ?? undefined
  );

  if (!publicKey) {
    return (
      <div style={styles.infoBox}>
        <p>Connect a wallet first to view balances.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={styles.accountCard}>
        <h3>Loading Balance...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.infoBox}>
        <p>Error loading balance: {error.message}</p>
      </div>
    );
  }

  return (
    <div style={styles.accountCard}>
      <h3>Balance</h3>
      <div style={styles.balanceDisplay}>
        <span style={styles.balanceAmount}>{balance}</span>
        <span style={styles.balanceAsset}>
          {asset?.code || "XLM"} ({asset?.issuer ? "credit" : "native"})
        </span>
      </div>
    </div>
  );
}

// ─── Simple Payment Example ──────────────────────────────────────────────────

function SimplePaymentExample() {
  const { publicKey, connect, isInstalled } = useFreighter();
  const [amount, setAmount] = useState<string>("1");
  const [destination, setDestination] = useState<string>("");
  const [memo, setMemo] = useState<string>("");

  const { submit, status, hash, error, isLoading, isSuccess, isError } =
    usePayment({
      destination: destination || publicKey ?? "",
      amount: amount || "0",
      memo,
      fee: 100,
      timeoutSeconds: 60,
      async onSuccess(txHash) {
        console.log("Payment successful:", txHash);
      },
      onError(err) {
        console.error("Payment error:", err);
      },
    });

  if (!isInstalled) {
    return (
      <div style={styles.infoBox}>
        <p>Please install Freighter to send payments.</p>
      </div>
    );
  }

  if (!publicKey) {
    return (
      <div style={styles.walletCard}>
        <h3>Connect Wallet</h3>
        <p>Connect to send payments:</p>
        <button onClick={connect} style={styles.btnPrimary}>
          🔌 Connect Freighter
        </button>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!destination && !publicKey) {
      alert("Please enter a destination address or connect your wallet");
      return;
    }
    await submit();
  };

  const statusMessage = {
    idle: "",
    submitting: "⏳ Submitting transaction...",
    polling: "🔄 Waiting for confirmation...",
    success: "✅ Payment successful!",
    error: "❌ Payment failed",
  };

  return (
    <div style={styles.paymentCard}>
      <h3>Simple Payment</h3>
      <div style={styles.formGroup}>
        <label style={styles.label}>Send Amount (XLM)</label>
        <input
          type="number"
          step="0.0000001"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={styles.input}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Destination Address</label>
        <input
          type="text"
          placeholder="G..."
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          style={styles.input}
        />
        <span style={styles.hint}>
          Defaults to your address if left blank (demo mode)
        </span>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Memo (optional)</label>
        <input
          type="text"
          placeholder="Optional memo"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          style={styles.input}
        />
      </div>

      {status !== "idle" && (
        <div
          style={{
            ...styles.statusBanner,
            ...(status === "success" ? styles.successBanner : {}),
            ...(status === "error" ? styles.errorBanner : {}),
          }}
        >
          {statusMessage[status]}
        </div>
      )}

      {isSuccess && hash && (
        <div style={styles.successBox}>
          <p>✅ Payment sent!</p>
          <code style={styles.hash}>{hash}</code>
        </div>
      )}

      {isError && error && (
        <div style={styles.errorBox}>
          <p>❌ Error: {error.message}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={isLoading}
        style={{ ...styles.btnPrimary, width: "100%" }}
      >
        {isLoading ? "Sending..." : "💸 Send Payment"}
      </button>
    </div>
  );
}

// ─── Path Payment (Swap) Example ─────────────────────────────────────────────

function PathPaymentExample() {
  const { publicKey, connect, isInstalled } = useFreighter();
  const [sendAmount, setSendAmount] = useState<string>("1");
  const [destination, setDestination] = useState<string>("");
  const [slippage, setSlippage] = useState<number>(0.01); // 1% slippage

  const receiveAmount = Math.max(
    0,
    parseFloat(sendAmount) * (1 - slippage)
  ).toFixed(7);

  const { submit, status, hash, error, isLoading, isSuccess, isError } =
    usePathPayment({
      mode: "strict-send",
      sendAsset: { type: "native" },
      sendAmount: sendAmount || "0",
      destination: destination || publicKey ?? "",
      destAsset: {
        type: "credit",
        code: "USDC",
        issuer: USDC_ISSUER,
      },
      destMin: receiveAmount,
      fee: 100,
      timeoutSeconds: 60,
      async onSuccess(txHash) {
        console.log("Swap successful:", txHash);
      },
      onError(err) {
        console.error("Swap error:", err);
      },
    });

  if (!isInstalled) {
    return (
      <div style={styles.infoBox}>
        <p>Please install Freighter to use path payments.</p>
      </div>
    );
  }

  if (!publicKey) {
    return (
      <div style={styles.walletCard}>
        <h3>Connect Wallet</h3>
        <p>Connect to swap assets:</p>
        <button onClick={connect} style={styles.btnPrimary}>
          🔌 Connect Freighter
        </button>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!destination && !publicKey) {
      alert("Please enter a destination address or connect your wallet");
      return;
    }
    await submit();
  };

  const statusMessage = {
    idle: "",
    submitting: "⏳ Submitting transaction...",
    polling: "🔄 Waiting for confirmation...",
    success: "✅ Swap successful!",
    error: "❌ Swap failed",
  };

  return (
    <div style={styles.paymentCard}>
      <h3>Path Payment (Asset Swap)</h3>
      <div style={styles.formGroup}>
        <label style={styles.label}>Send Amount (XLM)</label>
        <input
          type="number"
          step="0.0000001"
          min="0"
          value={sendAmount}
          onChange={(e) => setSendAmount(e.target.value)}
          style={styles.input}
        />
      </div>

      <div style={styles.slippageRow}>
        <label style={styles.label}>Slippage Tolerance</label>
        <div style={styles.slippageBtns}>
          {[0.005, 0.01, 0.02, 0.05].map((val) => (
            <button
              key={val}
              onClick={() => setSlippage(val)}
              style={
                slippage === val
                  ? styles.slippageBtnActive
                  : styles.slippageBtn
              }
            >
              {(val * 100).toFixed(0)}%
            </button>
          ))}
        </div>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Estimated Receive (USDC)</label>
        <input
          type="text"
          value={receiveAmount}
          disabled
          style={styles.input}
        />
        <span style={styles.hint}>
          Minimum: {receiveAmount} USDC (after {slippage * 100}% slippage)
        </span>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Destination Address</label>
        <input
          type="text"
          placeholder="G..."
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          style={styles.input}
        />
      </div>

      {status !== "idle" && (
        <div
          style={{
            ...styles.statusBanner,
            ...(status === "success" ? styles.successBanner : {}),
            ...(status === "error" ? styles.errorBanner : {}),
          }}
        >
          {statusMessage[status]}
        </div>
      )}

      {isSuccess && hash && (
        <div style={styles.successBox}>
          <p>✅ Swap sent!</p>
          <code style={styles.hash}>{hash}</code>
        </div>
      )}

      {isError && error && (
        <div style={styles.errorBox}>
          <p>❌ Error: {error.message}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={isLoading}
        style={{ ...styles.btnPrimary, width: "100%" }}
      >
        {isLoading ? "Swapping..." : "🔄 Swap XLM → USDC"}
      </button>
    </div>
  );
}

// ─── Main App Component ──────────────────────────────────────────────────────

export default function App() {
  const [example, setExample] = useState<string>("wallet");

  const examples = [
    { label: "Wallet Connection", value: "wallet" },
    { label: "Account Viewer", value: "account" },
    { label: "Balance Viewer", value: "balance" },
    { label: "Simple Payment", value: "payment" },
    { label: "Path Payment (Swap)", value: "path" },
  ];

  return (
    <StellarProvider network="testnet">
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>🌊 Stellar Hooks</h1>
          <p style={styles.subtitle}>Try Online Sandbox</p>
        </header>

        <ExampleToggle
          current={example}
          options={examples}
          onChange={setExample}
        />

        <div style={styles.main}>
          {example === "wallet" && <WalletExample />}
          {example === "account" && <AccountViewerExample />}
          {example === "balance" && <BalanceViewerExample />}
          {example === "payment" && <SimplePaymentExample />}
          {example === "path" && <PathPaymentExample />}
        </div>

        <footer style={styles.footer}>
          <p>
            Built with{" "}
            <a
              href="https://github.com/dark-princezz/stellar-hooks"
              style={styles.footerLink}
            >
              stellar-hooks
            </a>
            . Fork this sandbox and start building!
          </p>
        </footer>
      </div>
    </StellarProvider>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "20px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  header: {
    textAlign: "center",
    marginBottom: "30px",
  },
  title: {
    fontSize: "2.5rem",
    marginBottom: "10px",
    background:
      "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: "1.1rem",
  },
  exampleToggle: {
    display: "flex",
    gap: "10px",
    marginBottom: "30px",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  exampleBtn: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "1px solid #334155",
    background: "#1e293b",
    color: "#94a3b8",
    cursor: "pointer",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  exampleBtnActive: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "1px solid #3b82f6",
    background: "rgba(59, 130, 246, 0.1)",
    color: "#3b82f6",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.2s",
  },
  main: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  walletCard: {
    background: "#1e293b",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #334155",
  },
  walletHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  walletInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "16px",
  },
  label: {
    fontSize: "0.875rem",
    color: "#94a3b8",
    marginBottom: "4px",
    display: "block",
  },
  code: {
    fontFamily: "'Consolas', 'Monaco', monospace",
    background: "#0f172a",
    padding: "4px 8px",
    borderRadius: "4px",
    color: "#4ade80",
  },
  smallText: {
    fontSize: "0.875rem",
    color: "#64748b",
  },
  accountCard: {
    background: "#1e293b",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #334155",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  infoItem: {
    marginBottom: "12px",
  },
  balanceList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  balanceItem: {
    padding: "4px 0",
    fontSize: "0.875rem",
  },
  balanceDisplay: {
    display: "flex",
    alignItems: "baseline",
    gap: "8px",
  },
  balanceAmount: {
    fontSize: "2.5rem",
    fontWeight: "700",
    color: "#e2e8f0",
  },
  balanceAsset: {
    fontSize: "1.1rem",
    color: "#94a3b8",
  },
  paymentCard: {
    background: "#1e293b",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #334155",
  },
  formGroup: {
    marginBottom: "16px",
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#e2e8f0",
    fontSize: "1rem",
    boxSizing: "border-box",
  },
  hint: {
    display: "block",
    marginTop: "4px",
    fontSize: "0.75rem",
    color: "#64748b",
  },
  slippageRow: {
    marginBottom: "16px",
  },
  slippageBtns: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  slippageBtn: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "0.875rem",
  },
  slippageBtnActive: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid #3b82f6",
    background: "rgba(59, 130, 246, 0.1)",
    color: "#3b82f6",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: "600",
  },
  statusBanner: {
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "16px",
    textAlign: "center",
    fontSize: "0.9rem",
  },
  successBanner: {
    background: "rgba(74, 222, 128, 0.1)",
    color: "#4ade80",
    border: "1px solid rgba(74, 222, 128, 0.2)",
  },
  errorBanner: {
    background: "rgba(248, 113, 113, 0.1)",
    color: "#f87171",
    border: "1px solid rgba(248, 113, 113, 0.2)",
  },
  successBox: {
    background: "rgba(74, 222, 128, 0.1)",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "16px",
    textAlign: "center",
  },
  errorBox: {
    background: "rgba(248, 113, 113, 0.1)",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "16px",
    textAlign: "center",
  },
  hash: {
    fontFamily: "'Consolas', 'Monaco', monospace",
    fontSize: "0.8rem",
    wordBreak: "break-all",
    marginTop: "8px",
    display: "block",
  },
  infoBox: {
    background: "#1e293b",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #334155",
  },
  btnPrimary: {
    padding: "12px 24px",
    borderRadius: "8px",
    border: "none",
    background: "#3b82f6",
    color: "white",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "1rem",
    transition: "all 0.2s",
  },
  btnSecondary: {
    padding: "8px 16px",
    borderRadius: "6px",
    border: "none",
    background: "#475569",
    color: "white",
    fontWeight: "500",
    cursor: "pointer",
    fontSize: "0.875rem",
  },
  footer: {
    textAlign: "center",
    marginTop: "40px",
    padding: "20px",
    color: "#64748b",
    fontSize: "0.875rem",
  },
  footerLink: {
    color: "#3b82f6",
    textDecoration: "none",
  },
};
