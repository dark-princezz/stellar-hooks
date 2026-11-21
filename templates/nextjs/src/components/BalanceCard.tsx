"use client";

import React from "react";
import { useFreighter, useStellarBalance } from "stellar-hooks";

export function BalanceCard() {
  const { isConnected, publicKey } = useFreighter();
  const { xlmBalance, balances, isLoading, error, refetch } = useStellarBalance(
    publicKey ?? "",
    {
      refetchInterval: 12_000,
    }
  );

  if (!isConnected || !publicKey) {
    return null;
  }

  return (
    <div className="card">
      <div className="flex-between">
        <h2>Account Balance</h2>
        <button onClick={() => refetch()} disabled={isLoading} className="button small">
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <p className="error-text">Failed to fetch balance: {error.message}</p>}

      <div className="balance-box">
        <span className="balance-label">Native XLM Balance</span>
        <div className="balance-amount">
          {xlmBalance?.balance ?? "0"} <span className="denom">XLM</span>
        </div>
      </div>

      {balances.filter((b) => !b.isNative).length > 0 && (
        <div className="token-list">
          <h4>Custom Assets & Tokens</h4>
          <ul>
            {balances
              .filter((b) => !b.isNative)
              .map((b, i) => (
                <li key={i}>
                  <span>{b.assetCode}</span>
                  <span>{b.balance}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
