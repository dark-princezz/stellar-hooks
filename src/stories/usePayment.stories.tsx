import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { usePayment } from "../hooks/usePayment";
import { asPublicKey } from "../types";

function PaymentDemo({ defaultDestination, defaultAmount }: { defaultDestination: string; defaultAmount: string }) {
  const [destination, setDestination] = useState(defaultDestination);
  const [amount, setAmount] = useState(defaultAmount);

  const { submit, status, hash, error, isLoading, reset } = usePayment({
    destination: asPublicKey(destination),
    asset: { type: "native" },
    amount,
  });

  return (
    <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: 8 }}>
      <h3><code>usePayment</code> Interactive Demo</h3>

      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="payment-dest">Recipient Account (G...):</label>
        <input
          id="payment-dest"
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
        />
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="payment-amt">Amount (XLM):</label>
        <input
          id="payment-amt"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
        />
      </div>

      <p>Status: <strong>{status}</strong></p>
      {hash && <p style={{ color: "green" }}>Tx Hash: {hash}</p>}
      {error && <p style={{ color: "red" }}>Error: {error.message}</p>}

      <button onClick={() => submit()} disabled={isLoading} style={{ padding: "0.5rem 1rem", marginRight: "0.5rem" }}>
        {isLoading ? "Sending..." : "Submit Payment"}
      </button>
      <button onClick={reset} style={{ padding: "0.5rem 1rem" }}>
        Reset
      </button>
    </div>
  );
}

const meta: Meta<typeof PaymentDemo> = {
  title: "Hooks/usePayment",
  component: PaymentDemo,
  tags: ["autodocs"],
  argTypes: {
    defaultDestination: { control: "text" },
    defaultAmount: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof PaymentDemo>;

export const Default: Story = {
  args: {
    defaultDestination: "GA2C5RFPE6GCKMY3US5PAB6VVVRIGXZHYTXP25WZDPB26DKP42YX5W53",
    defaultAmount: "10",
  },
};
