/**
 * examples/wallet-balance-dashboard/src/App.tsx
 *
 * Wallet Connect + Balance Display App.
 *
 * Demonstrates how to use stellar-hooks to:
 *  - Connect a Freighter wallet using useFreighter
 *  - Fetch account details using useStellarAccount
 *  - Display native XLM balance using useStellarBalance
 *  - Show account information like sequence number and thresholds
 *
 * Run: npm install && npm run dev
 */

import React, { useState } from "react";
import {
  StellarProvider,
  useFreighter,
  useStellarAccount,
  useStellarBalance,
} from "stellar-hooks";

// ─── Components ───────────────────────────────────────────────────────────────

function ConnectionIndicator({ isConnected }: { isConnected: boolean }) {
  return (
    <span
      className={`connection-indicator ${isConnected ? "connected" : ""}`}
      title={isConnected ? "Wallet connected" : "Wallet disconnected"}
    />
  );
}

function WalletSection() {
  const {
    isInstalled,
    isConnected,
    publicKey,
    isLoading: freighterLoading,
    error: freighterError,
    connect,
    disconnect,
  } = useFreighter();

  return (
    <div className="card">
      <h2>Wallet</h2>
      <div className="wallet-section">
        <div className="connection-status">
          <ConnectionIndicator isConnected={isConnected} />
          <div>
            <p>
              <strong>
                {freighterLoading
                  ? "Connecting..."
                  : isConnected
                  ? "Connected"
                  : "Disconnected"}
              </strong>
            </p>
            <p style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
              {freighterLoading ? "Establishing connection..." : isConnected ? "Ready to transact" : "Connect to begin"}
            </p>
          </div>
        </div>

        {freighterError && (
          <div
            style={{
              padding: "0.75rem",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "0.5rem",
              color: "#fca5a5",
              fontSize: "0.85rem",
            }}
          >
            <strong>Connection error:</strong> {freighterError.message}
          </div>
        )}

        {isConnected && publicKey && (
          <div className="wallet-info">
            <code className="public-key">{publicKey}</code>
            <button
              className="button button-danger"
              onClick={disconnect}
              disabled={freighterLoading}
            >
              Disconnect
            </button>
          </div>
        )}

        {!isConnected && (
          <button
            className="button button-primary"
            onClick={connect}
            disabled={freighterLoading || !isInstalled}
          >
            {freighterLoading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Connecting...
              </>
            ) : !isInstalled ? (
              "Freighter Not Detected"
            ) : (
              "Connect Freighter"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function BalanceSection({ publicKey }: { publicKey: string }) {
  const { xlmBalance, isLoading: balanceLoading } = useStellarBalance(publicKey);

  return (
    <div className="card">
      <h2>Native Balance (XLM)</h2>
      <div className="balance-section">
        <div className="balance-card">
          <h3>Available</h3>
          {balanceLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="spinner" aria-hidden="true" />
              <span>Loading...</span>
            </div>
          ) : xlmBalance ? (
            <div className="balance-value">
              {xlmBalance.balance}
              <span> XLM</span>
            </div>
          ) : (
            <div style={{ color: "#94a3b8" }}>No XLM found</div>
          )}
        </div>
        <div className="balance-card">
          <h3>Last Updated</h3>
          {xlmBalance?.lastModifiedLedger ? (
            <div className="balance-value">
              Ledger {xlmBalance.lastModifiedLedger}
            </div>
          ) : (
            <div style={{ color: "#94a3b8" }}>—</div>
          )}
        </div>
      </div>
    </div>
  );
}

function AccountDetailsSection({ publicKey }: { publicKey: string }) {
  const { account, isLoading: accountLoading } = useStellarAccount(publicKey);

  if (accountLoading) {
    return (
      <div className="card">
        <h2>Account Details</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "1rem" }}>
          <span className="spinner" aria-hidden="true" />
          <span>Loading account data...</span>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="card">
        <h2>Account Details</h2>
        <div className="empty-state">
          <p>No account data found for this address.</p>
        </div>
      </div>
    );
  }

  const { sequence, thresholds, lastModifiedLedger, subentryCount } = account;

  return (
    <div className="card">
      <h2>Account Details</h2>
      <div className="account-details-section">
        <div className="detail-row">
          <span className="detail-label">Sequence</span>
          <span className="detail-value">{sequence}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Last Modified</span>
          <span className="detail-value">Ledger {lastModifiedLedger}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Subentries</span>
          <span className="detail-value">{subentryCount}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Thresholds</span>
          <span className="detail-value">
            Low: {thresholds.lowThreshold} / Med: {thresholds.medThreshold} / High: {thresholds.highThreshold}
          </span>
        </div>
      </div>
    </div>
  );
}

function NetworkInfoSection() {
  return (
    <div className="card">
      <h2>Network Info</h2>
      <div className="account-details-section">
        <div className="detail-row">
          <span className="detail-label">Network</span>
          <span className="detail-value">Testnet</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Explorer</span>
          <span className="detail-value">
            <a
              href="https://stellar.expert/explorer/testnet"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#6366f1", textDecoration: "none" }}
            >
              stellar.expert
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main App Content ────────────────────────────────────────────────────────

function Dashboard() {
  const { isConnected, publicKey } = useFreighter();

  if (!isConnected) {
    return (
      <div className="container">
        <header className="header">
          <h1>Wallet + Balance Dashboard</h1>
          <p>A minimal example using useFreighter + useStellarAccount</p>
        </header>
        <div className="empty-state">
          <p>👋 Welcome! Please connect your Freighter wallet to view your account details and balances.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Wallet + Balance Dashboard</h1>
        <p>A minimal example using useFreighter + useStellarAccount</p>
      </header>

      <WalletSection />

      {publicKey && (
        <>
          <BalanceSection publicKey={publicKey} />
          <AccountDetailsSection publicKey={publicKey} />
          <NetworkInfoSection />
        </>
      )}
    </div>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <StellarProvider network="testnet">
      <Dashboard />
    </StellarProvider>
  );
}
