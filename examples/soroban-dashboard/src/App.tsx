import { useState } from "react";
import { StellarProvider, useFreighter, useSorobanContract } from "stellar-hooks";
import { xdr } from "@stellar/stellar-sdk";

// Simple counter contract interface
interface CounterContract {
  get_count: () => Promise<number>;
  increment: (amount: number) => Promise<number>;
  decrement: (amount: number) => Promise<number>;
}

function ContractDashboard() {
  const [contractId, setContractId] = useState("");
  const [incrementAmount, setIncrementAmount] = useState("1");
  const [decrementAmount, setDecrementAmount] = useState("1");
  
  const { isConnected, publicKey, connect, disconnect, isInstalled } = useFreighter();
  
  // Read operation - get current count
  const readContract = useSorobanContract<number>({
    contractId: contractId || "",
    method: "get_count",
    args: [],
    parseResult: (scVal) => scVal.u32().toNumber(),
  });

  // Write operation - increment
  const incrementContract = useSorobanContract<number>({
    contractId: contractId || "",
    method: "increment",
    args: [xdr.ScVal.scvU32(parseInt(incrementAmount) || 1)],
    parseResult: (scVal) => scVal.u32().toNumber(),
  });

  // Write operation - decrement
  const decrementContract = useSorobanContract<number>({
    contractId: contractId || "",
    method: "decrement",
    args: [xdr.ScVal.scvU32(parseInt(decrementAmount) || 1)],
    parseResult: (scVal) => scVal.u32().toNumber(),
  });

  const handleRead = async () => {
    if (!contractId) {
      alert("Please enter a contract ID");
      return;
    }
    try {
      await readContract.query();
    } catch (error) {
      console.error("Read failed:", error);
      alert(`Read failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleIncrement = async () => {
    if (!contractId) {
      alert("Please enter a contract ID");
      return;
    }
    try {
      await incrementContract.call();
      // Refresh the count after increment
      await readContract.query();
    } catch (error) {
      console.error("Increment failed:", error);
      alert(`Increment failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleDecrement = async () => {
    if (!contractId) {
      alert("Please enter a contract ID");
      return;
    }
    try {
      await decrementContract.call();
      // Refresh the count after decrement
      await readContract.query();
    } catch (error) {
      console.error("Decrement failed:", error);
      alert(`Decrement failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  if (!isInstalled) {
    return (
      <div className="container">
        <div className="card">
          <h2>Freighter Not Detected</h2>
          <p>Please install the Freighter wallet extension to use this demo.</p>
          <a
            href="https://freighter.app"
            target="_blank"
            rel="noopener noreferrer"
            className="button"
          >
            Install Freighter
          </a>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="container">
        <div className="card">
          <h2>Connect Your Wallet</h2>
          <p>Connect your Freighter wallet to interact with Soroban contracts.</p>
          <button onClick={connect} className="button">
            Connect Freighter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <h2>Soroban Contract Dashboard</h2>
          <button onClick={disconnect} className="button secondary">
            Disconnect
          </button>
        </div>

        <div className="form">
          <div className="field">
            <label htmlFor="contractId">Contract ID</label>
            <input
              id="contractId"
              type="text"
              placeholder="C..."
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
            />
            <p className="hint">
              Enter a Soroban contract ID (e.g., a counter contract)
            </p>
          </div>

          <div className="section">
            <h3>Read Operations</h3>
            <button
              onClick={handleRead}
              disabled={!contractId || readContract.isLoading}
              className="button"
            >
              {readContract.isLoading ? "Reading..." : "Get Count"}
            </button>

            {readContract.isSuccess && readContract.result !== null && (
              <div className="result">
                <p className="label">Current Count:</p>
                <p className="value">{readContract.result}</p>
              </div>
            )}

            {readContract.isError && (
              <div className="error">
                <p>✗ Read failed</p>
                <p>{readContract.error?.message}</p>
              </div>
            )}
          </div>

          <div className="section">
            <h3>Write Operations</h3>
            
            <div className="operation">
              <h4>Increment</h4>
              <div className="field">
                <label htmlFor="incrementAmount">Amount</label>
                <input
                  id="incrementAmount"
                  type="number"
                  min="1"
                  value={incrementAmount}
                  onChange={(e) => setIncrementAmount(e.target.value)}
                />
              </div>
              <button
                onClick={handleIncrement}
                disabled={!contractId || incrementContract.isLoading}
                className="button primary"
              >
                {incrementContract.isLoading ? "Incrementing..." : "Increment"}
              </button>

              {incrementContract.isSuccess && (
                <div className="success">
                  <p>✓ Increment successful!</p>
                  <p className="hash">New count: {incrementContract.result}</p>
                </div>
              )}

              {incrementContract.isError && (
                <div className="error">
                  <p>✗ Increment failed</p>
                  <p>{incrementContract.error?.message}</p>
                </div>
              )}
            </div>

            <div className="operation">
              <h4>Decrement</h4>
              <div className="field">
                <label htmlFor="decrementAmount">Amount</label>
                <input
                  id="decrementAmount"
                  type="number"
                  min="1"
                  value={decrementAmount}
                  onChange={(e) => setDecrementAmount(e.target.value)}
                />
              </div>
              <button
                onClick={handleDecrement}
                disabled={!contractId || decrementContract.isLoading}
                className="button primary"
              >
                {decrementContract.isLoading ? "Decrementing..." : "Decrement"}
              </button>

              {decrementContract.isSuccess && (
                <div className="success">
                  <p>✓ Decrement successful!</p>
                  <p className="hash">New count: {decrementContract.result}</p>
                </div>
              )}

              {decrementContract.isError && (
                <div className="error">
                  <p>✗ Decrement failed</p>
                  <p>{decrementContract.error?.message}</p>
                </div>
              )}
            </div>
          </div>

          <div className="info">
            <p className="public-key">Connected: {publicKey}</p>
            <p className="network">Network: Testnet</p>
            <p className="note">
              This dashboard demonstrates read and write operations on a Soroban contract.
              For testing, deploy a simple counter contract on Soroban testnet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <StellarProvider network="testnet">
      <div className="app">
        <header>
          <h1>Stellar Hooks</h1>
          <p>Soroban Contract Dashboard</p>
        </header>
        <ContractDashboard />
      </div>
    </StellarProvider>
  );
}

export default App;
