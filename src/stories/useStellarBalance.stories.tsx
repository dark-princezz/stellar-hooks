import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { useStellarBalance } from "../hooks/useStellarBalance";
import { asPublicKey } from "../types";

function BalanceDemo({ defaultAddress }: { defaultAddress: string }) {
  const [address, setAddress] = useState(defaultAddress);
  const { xlmBalance, balances, isLoading, error, refetch } = useStellarBalance(asPublicKey(address));

  return (
    <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: 8 }}>
      <h3><code>useStellarBalance</code> Interactive Demo</h3>

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="address-input">Stellar Account Public Key:</label>
        <input
          id="address-input"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
        />
      </div>

      {isLoading && <p>Loading balances from network...</p>}
      {error && <p style={{ color: "red" }}>Error: {error.message}</p>}

      {!isLoading && !error && (
        <div>
          <p><strong>Native XLM Balance:</strong> {xlmBalance?.balance ?? "0.0"} XLM</p>
          <h4>All Balances ({balances.length}):</h4>
          <ul>
            {balances.map((b, idx) => (
              <li key={idx}>
                {b.isNative ? "Native XLM" : `${b.assetCode} (${b.assetIssuer?.slice(0, 6)}...)`}: {b.balance}
              </li>
            ))}
          </ul>
          <button onClick={refetch} style={{ padding: "0.4rem 0.8rem" }}>
            Refresh Balances
          </button>
        </div>
      )}
    </div>
  );
}

const meta: Meta<typeof BalanceDemo> = {
  title: "Hooks/useStellarBalance",
  component: BalanceDemo,
  tags: ["autodocs"],
  argTypes: {
    defaultAddress: {
      control: "text",
      description: "Stellar Account Public Key to query",
    },
  },
};

export default meta;
type Story = StoryObj<typeof BalanceDemo>;

export const Default: Story = {
  args: {
    defaultAddress: "GAAZI4BCE7Y5L7S25K2LJKBJHW7X2UHLW4XY5R2DZPHFBUHE5PQ7L2UQ",
  },
};
