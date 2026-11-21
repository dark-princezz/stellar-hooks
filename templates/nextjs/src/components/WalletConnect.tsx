"use client";

import React, { useState } from "react";
import { useFreighter } from "stellar-hooks";

export function WalletConnect({
  onConnected,
}: {
  onConnected?: (address: string) => void;
}) {
  const {
    isInstalled,
    isConnected,
    publicKey,
    isLoading,
    error,
    connect,
    disconnect,
  } = useFreighter();

  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (isConnected && publicKey && onConnected) {
      onConnected(publicKey);
    }
  }, [isConnected, publicKey, onConnected]);

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

  if (!isInstalled) {
    return (
      <div className="card alert-warning">
        <h3>Freighter Wallet Not Found</h3>
        <p>Please install the Freighter browser extension to interact with this application.</p>
        <a
          href="https://www.freighter.app/"
          target="_blank"
          rel="noreferrer"
          className="button secondary"
        >
          Install Freighter
        </a>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="card">
        <h2>Wallet Connection</h2>
        <p>Connect your wallet to interact with Stellar Testnet.</p>
        <button
          onClick={connect}
          disabled={isLoading}
          className="button primary"
        >
          {isLoading ? "Connecting..." : "Connect Freighter"}
        </button>
        {error && <p className="error-text">{error.message}</p>}
      </div>
    );
  }

  const truncated = `${publicKey?.slice(0, 6)}...${publicKey?.slice(-6)}`;

  return (
    <div className="card">
      <div className="flex-between">
        <h2>Connected Wallet</h2>
        <span className="badge-online">Active</span>
      </div>
      <div className="address-bar">
        <code>{truncated}</code>
        <button onClick={handleCopy} className="button small secondary">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <button onClick={disconnect} className="button small danger outline">
        Disconnect
      </button>
      {error && <p className="error-text">{error.message}</p>}
    </div>
  );
}
