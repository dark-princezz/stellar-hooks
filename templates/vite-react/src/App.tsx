import React, { useState } from "react";
import { useFreighter, useStellarBalance } from "stellar-hooks";

export default function App() {
  const {
    isInstalled,
    isConnected,
    publicKey,
    isLoading: isConnecting,
    error: walletError,
    connect,
    disconnect,
  } = useFreighter();

  const [copied, setCopied] = useState(false);

  const {
    xlmBalance,
    balances,
    isLoading: isBalanceLoading,
    error: balanceError,
    refetch: refetchBalance,
  } = useStellarBalance(publicKey ?? "", {
    refetchInterval: 15_000,
  });

  const handleCopy = async () => {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const truncatedAddress = publicKey
    ? `${publicKey.slice(0, 6)}...${publicKey.slice(-6)}`
    : "";

  return (
    <div className="container">
      <header className="header">
        <div className="badge">Stellar Hooks</div>
        <div className="network-pill">Testnet</div>
        <h1>Vite + React Starter</h1>
        <p className="subtitle">
          Ready-to-use template for building decentralized apps on the Stellar network.
        </p>
      </header>

      <main className="card-container">
        {/* Wallet Connection Section */}
        <section className="card">
          <h2>1. Wallet Connection</h2>
          {!isInstalled ? (
            <div className="alert alert-warning">
              <p>
                <strong>Freighter wallet is not detected.</strong>
              </p>
              <p>Please install the browser extension to continue.</p>
              <a
                href="https://www.freighter.app/"
                target="_blank"
                rel="noreferrer"
                className="button secondary"
              >
                Install Freighter
              </a>
            </div>
          ) : !isConnected ? (
            <div className="connect-box">
              <p>Connect your Freighter wallet on Stellar Testnet to view balances.</p>
              <button
                onClick={connect}
                disabled={isConnecting}
                className="button primary"
              >
                {isConnecting ? "Connecting..." : "Connect Freighter"}
              </button>
            </div>
          ) : (
            <div className="wallet-connected">
              <div className="status-row">
                <span className="dot online" />
                <span className="status-text">Connected</span>
              </div>
              <div className="address-row">
                <code title={publicKey}>{truncatedAddress}</code>
                <button onClick={handleCopy} className="button small">
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <button onClick={disconnect} className="button danger outline small">
                Disconnect
              </button>
            </div>
          )}

          {walletError && (
            <p className="error-text">Wallet error: {walletError.message}</p>
          )}
        </section>

        {/* Balance Section */}
        {isConnected && publicKey && (
          <section className="card">
            <div className="section-header">
              <h2>2. Account Balances</h2>
              <button
                onClick={() => refetchBalance()}
                disabled={isBalanceLoading}
                className="button small"
              >
                {isBalanceLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {balanceError && (
              <p className="error-text">Error fetching balances: {balanceError.message}</p>
            )}

            <div className="balance-highlight">
              <span className="balance-label">Native XLM Balance</span>
              <span className="balance-value">
                {xlmBalance?.balance ?? "0"} <span className="currency">XLM</span>
              </span>
            </div>

            {balances.filter((b) => !b.isNative).length > 0 && (
              <div className="other-balances">
                <h3>Other Assets & Trustlines</h3>
                <ul className="asset-list">
                  {balances
                    .filter((b) => !b.isNative)
                    .map((asset, index) => (
                      <li key={index} className="asset-item">
                        <span className="asset-code">{asset.assetCode}</span>
                        <span className="asset-balance">{asset.balance}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="footer">
        <p>
          Built with <a href="https://github.com/dark-princezz/stellar-hooks" target="_blank" rel="noreferrer">stellar-hooks</a>
        </p>
      </footer>
    </div>
  );
}
