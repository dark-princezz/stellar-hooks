import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { useFreighter } from "../hooks/useFreighter";

function WalletDemo() {
  const {
    isInstalled,
    isConnected,
    publicKey,
    isLoading,
    error,
    networkPassphraseWarning,
    connect,
    disconnect,
  } = useFreighter();

  return (
    <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: 8 }}>
      <h3><code>useFreighter</code> Interactive Demo</h3>

      <div style={{ margin: "1rem 0" }}>
        <p><strong>Extension Installed:</strong> {isInstalled ? "✅ Yes" : "❌ No"}</p>
        <p><strong>Status:</strong> {isConnected ? "Connected" : "Disconnected"}</p>
        {publicKey && <p><strong>Public Key:</strong> <code>{publicKey}</code></p>}
        {networkPassphraseWarning && <p style={{ color: "orange" }}>⚠️ {networkPassphraseWarning}</p>}
        {error && <p style={{ color: "red" }}>❌ {error.message}</p>}
      </div>

      {!isConnected ? (
        <button onClick={connect} disabled={isLoading || !isInstalled} style={{ padding: "0.5rem 1rem" }}>
          {isLoading ? "Connecting..." : "Connect Freighter Wallet"}
        </button>
      ) : (
        <button onClick={disconnect} style={{ padding: "0.5rem 1rem" }}>
          Disconnect
        </button>
      )}
    </div>
  );
}

const meta: Meta<typeof WalletDemo> = {
  title: "Hooks/useFreighter",
  component: WalletDemo,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof WalletDemo>;

export const Default: Story = {};
