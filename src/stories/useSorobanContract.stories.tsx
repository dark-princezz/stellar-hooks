import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { useSorobanContract } from "../hooks/useSorobanContract";

function ContractDemo({ contractId: initialContractId, method: initialMethod }: { contractId: string; method: string }) {
  const [contractId, setContractId] = useState(initialContractId);
  const [method, setMethod] = useState(initialMethod);

  const { call, status, result, error, isLoading, reset } = useSorobanContract({
    contractId,
    method,
    args: [],
  });

  return (
    <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: 8 }}>
      <h3><code>useSorobanContract</code> Interactive Demo</h3>

      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="contract-id-input">Contract ID (C...):</label>
        <input
          id="contract-id-input"
          type="text"
          value={contractId}
          onChange={(e) => setContractId(e.target.value)}
          style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
        />
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="method-input">Method Name:</label>
        <input
          id="method-input"
          type="text"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
        />
      </div>

      <p>Status: <strong>{status}</strong></p>

      {result != null && <p style={{ color: "green" }}><strong>Result:</strong> {String(result)}</p>}
      {error && <p style={{ color: "red" }}><strong>Error:</strong> {error.message}</p>}

      <button onClick={() => call()} disabled={isLoading} style={{ padding: "0.5rem 1rem", marginRight: "0.5rem" }}>
        {isLoading ? "Invoking..." : `Invoke ${method}()`}
      </button>
      <button onClick={reset} style={{ padding: "0.5rem 1rem" }}>
        Reset
      </button>
    </div>
  );
}

const meta: Meta<typeof ContractDemo> = {
  title: "Hooks/useSorobanContract",
  component: ContractDemo,
  tags: ["autodocs"],
  argTypes: {
    contractId: { control: "text" },
    method: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof ContractDemo>;

export const Default: Story = {
  args: {
    contractId: "CCW67TSBXS2THGAOWHBV4YXGQDHQDIF5XDI333333333333333333333",
    method: "increment",
  },
};
