/**
 * examples/sac-balance-viewer/src/App.tsx
 *
 * SAC (Stellar Asset Contract) Token Balance Viewer.
 *
 * Demonstrates how to use stellar-hooks to:
 *  - Connect a Freighter wallet
 *  - Read native XLM balance via useStellarBalance
 *  - Read SAC token balances via useSorobanTokenBalance
 *  - Add custom token contract IDs to watch
 *
 * Run: npm install && npm run dev
 */

import React, { useState } from "react";
import {
  StellarProvider,
  useFreighter,
  useStellarBalance,
  useSorobanTokenBalance,
} from "stellar-hooks";
import type { UseSorobanTokenBalanceOptions } from "stellar-hooks";

// ─── Known testnet SAC token contracts ───────────────────────────────────────

interface TokenInfo {
  id: string;
  symbol: string;
  name: string;
  logo?: string;
  decimals?: number;
}

const TESTNET_TOKENS: TokenInfo[] = [
  {
    id: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 7,
  },
  {
    id: "CAAO34TVDJ7BGQSXUPTXKRBL7IC3GJKVPPJ4AGEZQ4K6H5PYENDRYH",
    symbol: "yUSDC",
    name: "yUSDC (test token)",
    decimals: 7,
  },
  {
    id: "CAS3CD4S2AFNI6JQ4QLCVBWMJ46BBBFGKEE22K5RAA6K3N6S2O7KC4F",
    symbol: "Native",
    name: "Soroban Native Asset",
    decimals: 7,
  },
];

// ─── Token Balance Row Component ─────────────────────────────────────────────

function TokenBalanceRow({
  publicKey,
  token,
}: {
  publicKey: string;
  token: TokenInfo;
}) {
  const options: UseSorobanTokenBalanceOptions = {};
  if (token.decimals !== undefined) {
    options.decimals = token.decimals;
  }

  const { formatted, isLoading, error, refetch } =
    useSorobanTokenBalance(token.id, publicKey, options);

  return (
    <tr className={isLoading ? "loading" : error ? "error" : ""}>
      <td className="token-symbol">
        <span className="token-icon">{token.symbol.charAt(0)}</span>
        <div>
          <strong>{token.symbol}</strong>
          <small>{token.name}</small>
        </div>
      </td>
      <td className="token-id">
        <code>{token.id.slice(0, 12)}…</code>
      </td>
      <td className="token-balance">
        {isLoading ? (
          <span className="loading-spinner" aria-label="Loading">⟳</span>
        ) : error ? (
          <span className="error-text" title={error.message}>—</span>
        ) : (
          <span>{formatted}</span>
        )}
      </td>
      <td>
        <button
          className="refetch-btn"
          onClick={refetch}
          disabled={isLoading}
          title="Refresh balance"
        >
          ↻
        </button>
      </td>
    </tr>
  );
}

// ─── Add Token Form ──────────────────────────────────────────────────────────

function AddTokenForm({
  onAdd,
}: {
  onAdd: (token: TokenInfo) => void;
}) {
  const [contractId, setContractId] = useState("");
  const [symbol, setSymbol] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractId.trim() || !symbol.trim()) return;
    onAdd({
      id: contractId.trim(),
      symbol: symbol.trim().toUpperCase(),
      name: symbol.trim().toUpperCase(),
    });
    setContractId("");
    setSymbol("");
  };

  return (
    <form className="add-token-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Contract ID (C…)"
        value={contractId}
        onChange={(e) => setContractId(e.target.value)}
        pattern="C[A-Z0-9]{55}"
        title="A valid Soroban contract ID starting with C"
      />
      <input
        type="text"
        placeholder="Symbol (e.g., MYTOKEN)"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        maxLength={12}
      />
      <button type="submit" disabled={!contractId.trim() || !symbol.trim()}>
        + Add Token
      </button>
    </form>
  );
}

// ─── Main App Content ────────────────────────────────────────────────────────

function BalanceViewer() {
  const {
    isInstalled,
    isConnected,
    publicKey,
    isLoading: freighterLoading,
    error: freighterError,
    connect,
    disconnect,
  } = useFreighter();

  const {
    xlmBalance,
    isLoading: balanceLoading,
  } = useStellarBalance(publicKey ?? undefined, {
    enabled: !!publicKey,
  });

  const [customTokens, setCustomTokens] = useState<TokenInfo[]>([]);

  const allTokens = [...TESTNET_TOKENS, ...customTokens];

  const handleAddToken = (token: TokenInfo) => {
    setCustomTokens((prev) => [...prev, token]);
  };

  const handleRemoveToken = (contractId: string) => {
    setCustomTokens((prev) => prev.filter((t) => t.id !== contractId));
  };

  // ── Wallet not installed ─────────────────────────────────────────────────
  if (!isInstalled && !freighterLoading) {
    return (
      <div className="viewer">
        <header>
          <h1>SAC Token Balance Viewer</h1>
          <p>View Soroban Asset Contract token balances for your Stellar account.</p>
        </header>
        <div className="empty-state">
          <p>⚠️ Freighter wallet not detected.</p>
          <p>
            Please install{" "}
            <a href="https://freighter.app" target="_blank" rel="noreferrer">
              Freighter
            </a>{" "}
            to view your token balances.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="viewer">
      <header>
        <h1>SAC Token Balance Viewer</h1>
        <p>View Soroban Asset Contract token balances for your Stellar account.</p>
      </header>

      {/* ── Wallet Section ──────────────────────────────────────────────── */}
      <section className="card wallet-card">
        <h2>Wallet</h2>
        {!isConnected ? (
          <button className="connect-btn" onClick={connect} disabled={freighterLoading}>
            {freighterLoading ? "Connecting…" : "Connect Freighter"}
          </button>
        ) : (
          <div className="wallet-info">
            <div className="pubkey">
              <strong>Connected:</strong>{" "}
              <code>{publicKey}</code>
            </div>
            <button className="disconnect-btn" onClick={disconnect}>
              Disconnect
            </button>
          </div>
        )}
        {freighterError && (
          <p className="error-text">{freighterError.message}</p>
        )}
      </section>

      {/* ── Native XLM Balance ──────────────────────────────────────────── */}
      {publicKey && (
        <section className="card">
          <h2>Native Balance</h2>
          {balanceLoading ? (
            <p className="loading-text">Loading XLM balance…</p>
          ) : (
            <p className="xlm-balance">
              <span className="token-icon">X</span>
              {xlmBalance?.balance ?? "—"}{" "}
              <small>XLM</small>
            </p>
          )}
        </section>
      )}

      {/* ── SAC Token Balances ──────────────────────────────────────────── */}
      {publicKey && (
        <section className="card">
          <h2>
            SAC Token Balances
            <span className="badge">{allTokens.length}</span>
          </h2>

          {allTokens.length === 0 ? (
            <p className="empty-text">
              No tokens loaded. Add a token contract ID below.
            </p>
          ) : (
            <table className="token-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Contract ID</th>
                  <th>Balance</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {allTokens.map((token) => (
                  <TokenBalanceRow
                    key={token.id}
                    publicKey={publicKey}
                    token={token}
                  />
                ))}
              </tbody>
            </table>
          )}

          <AddTokenForm onAdd={handleAddToken} />

          {customTokens.length > 0 && (
            <details className="custom-tokens-details">
              <summary>Custom tokens ({customTokens.length})</summary>
              <ul className="custom-tokens-list">
                {customTokens.map((token) => (
                  <li key={token.id}>
                    <code>{token.symbol}</code> —{" "}
                    <code className="contract-id">{token.id}</code>
                    <button
                      className="remove-btn"
                      onClick={() => handleRemoveToken(token.id)}
                      title="Remove token"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      <footer className="footer">
        <p>
          Built with{" "}
          <a href="https://github.com/dark-princezz/stellar-hooks" target="_blank" rel="noreferrer">
            stellar-hooks
          </a>{" "}
          — <code>useSorobanTokenBalance</code>
        </p>
      </footer>
    </div>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <StellarProvider network="testnet">
      <BalanceViewer />
    </StellarProvider>
  );
}
