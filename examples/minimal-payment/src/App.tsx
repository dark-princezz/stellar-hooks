import { useState } from "react";
import { StellarProvider, useFreighter, usePayment, useStellarBalance } from "stellar-hooks";

function PaymentDemo() {
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  
  const { isConnected, publicKey, connect, disconnect, isInstalled } = useFreighter();
  const { xlmBalance } = useStellarBalance(publicKey);
  const payment = usePayment();

  const handleSend = async () => {
    if (!destination || !amount) {
      alert("Please fill in destination and amount");
      return;
    }

    try {
      await payment.call({
        destination,
        amount,
        asset: "native",
      });
      alert("Payment sent successfully!");
      setDestination("");
      setAmount("");
    } catch (error) {
      console.error("Payment failed:", error);
      alert(`Payment failed: ${error instanceof Error ? error.message : "Unknown error"}`);
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
          <p>Connect your Freighter wallet to send payments on Stellar testnet.</p>
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
          <h2>Send XLM Payment</h2>
          <button onClick={disconnect} className="button secondary">
            Disconnect
          </button>
        </div>

        <div className="balance">
          <span className="label">Your Balance:</span>
          <span className="value">{xlmBalance?.balance || "Loading..."} XLM</span>
        </div>

        <div className="form">
          <div className="field">
            <label htmlFor="destination">Destination Address</label>
            <input
              id="destination"
              type="text"
              placeholder="G..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="amount">Amount (XLM)</label>
            <input
              id="amount"
              type="number"
              step="0.0000001"
              min="0"
              placeholder="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={payment.isLoading || !destination || !amount}
            className="button primary"
          >
            {payment.isLoading ? "Sending..." : "Send Payment"}
          </button>

          {payment.isSuccess && (
            <div className="success">
              <p>✓ Payment successful!</p>
              <p className="hash">Hash: {payment.hash}</p>
            </div>
          )}

          {payment.isError && (
            <div className="error">
              <p>✗ Payment failed</p>
              <p>{payment.error?.message}</p>
            </div>
          )}
        </div>

        <div className="info">
          <p className="public-key">Connected: {publicKey}</p>
          <p className="network">Network: Testnet</p>
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
          <p>Minimal Payment Example</p>
        </header>
        <PaymentDemo />
      </div>
    </StellarProvider>
  );
}

export default App;
