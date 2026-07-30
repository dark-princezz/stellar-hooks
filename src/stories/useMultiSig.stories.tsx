import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { useMultiSig } from "../hooks/useMultiSig";

function MultiSigDemo() {
  const {
    build,
    sign,
    submit,
    reset,
    unsignedXdr,
    signatureCount,
    status,
    hash,
    error,
    isLoading,
  } = useMultiSig();

  return (
    <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: 8 }}>
      <h3><code>useMultiSig</code> Interactive Demo</h3>
      <p>Status: <strong>{status}</strong></p>
      <p>Signature Count: <strong>{signatureCount}</strong></p>

      {unsignedXdr && (
        <div style={{ marginBottom: "1rem" }}>
          <p><strong>Unsigned / Signed XDR:</strong></p>
          <textarea
            readOnly
            rows={4}
            value={unsignedXdr}
            style={{ width: "100%", fontFamily: "monospace", fontSize: "0.8rem" }}
          />
        </div>
      )}

      {hash && <p style={{ color: "green" }}>Broadcast Hash: {hash}</p>}
      {error && <p style={{ color: "red" }}>Error: {error.message}</p>}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={() => build([], { memo: "Demo" })}
          disabled={isLoading}
          style={{ padding: "0.5rem 1rem" }}
        >
          Build TX
        </button>
        <button
          onClick={() => sign()}
          disabled={isLoading || !unsignedXdr}
          style={{ padding: "0.5rem 1rem" }}
        >
          Sign TX
        </button>
        <button
          onClick={() => unsignedXdr && submit(unsignedXdr)}
          disabled={isLoading || !unsignedXdr}
          style={{ padding: "0.5rem 1rem" }}
        >
          Submit TX
        </button>
        <button onClick={reset} style={{ padding: "0.5rem 1rem" }}>
          Reset
        </button>
      </div>
    </div>
  );
}

const meta: Meta<typeof MultiSigDemo> = {
  title: "Hooks/useMultiSig",
  component: MultiSigDemo,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof MultiSigDemo>;

export const Default: Story = {};
