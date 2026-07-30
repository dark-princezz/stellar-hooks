import { useState } from "react";
import { StellarProvider, useFreighter, useStellarAccount, useTransaction } from "stellar-hooks";

function TestApp() {
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState("");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");

  const freighter = useFreighter({ autoConnect: false });
  const { account } = useStellarAccount(freighter.publicKey);
  const transaction = useTransaction();

  return (
    <div className="test-app" data-testid="app-loaded">
      <h1>Stellar Hooks E2E Test App</h1>

      {/* Freighter Connection Tests */}
      <section className="test-section">
        <h2>Freighter Connection</h2>
        <div data-testid="freighter-is-installed">{String(freighter.isInstalled)}</div>
        <div data-testid="freighter-is-connected">{String(freighter.isConnected)}</div>
        {freighter.publicKey && (
          <div data-testid="freighter-public-key">{freighter.publicKey}</div>
        )}
        <button
          data-testid="connect-button"
          onClick={() => freighter.connect()}
          disabled={!freighter.isInstalled || freighter.isConnected}
        >
          {freighter.isConnected ? "Connected" : "Connect Freighter"}
        </button>
      </section>

      {/* Message Signing Tests */}
      <section className="test-section">
        <h2>Message Signing</h2>
        <input
          data-testid="message-input"
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter message to sign"
        />
        <button
          data-testid="sign-message-button"
          onClick={async () => {
            if (message && freighter.isConnected) {
              try {
                const sig = await freighter.signMessage(message);
                setSignature(sig);
              } catch (error) {
                console.error("Signing failed:", error);
              }
            }
          }}
          disabled={!freighter.isConnected || !message}
        >
          Sign Message
        </button>
        {signature && (
          <div data-testid="signature-result">{signature}</div>
        )}
      </section>

      {/* Account Data Tests */}
      <section className="test-section">
        <h2>Account Data</h2>
        {account && (
          <div data-testid="account-data">
            <div data-testid="xlm-balance">
              {account.balances.find((b: any) => b.isNative)?.balance || "0"}
            </div>
            <div>Sequence: {account.sequence}</div>
            <div>Subentries: {account.subentryCount}</div>
          </div>
        )}
      </section>

      {/* Transaction Tests */}
      <section className="test-section">
        <h2>Payment Transaction</h2>
        <input
          data-testid="payment-destination"
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Destination address (G...)"
        />
        <input
          data-testid="payment-amount"
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (XLM)"
        />
        <button
          data-testid="submit-payment"
          onClick={async () => {
            if (destination && amount && freighter.isConnected) {
              // This would normally call useTransaction with payment operation
              // For e2e testing, we'll just simulate the transaction flow
              console.log("Payment transaction:", { destination, amount });
            }
          }}
          disabled={!freighter.isConnected || !destination || !amount}
        >
          Submit Payment
        </button>
        {transaction.status && (
          <div data-testid="transaction-status">{transaction.status}</div>
        )}
      </section>

      {/* Network Info */}
      <section className="test-section">
        <h2>Network Info</h2>
        <div>Network: {freighter.network || "Not detected"}</div>
        {freighter.networkPassphraseMismatch && (
          <div data-testid="network-mismatch">Network passphrase mismatch detected</div>
        )}
      </section>
    </div>
  );
}

function App() {
  return (
    <StellarProvider network="testnet">
      <TestApp />
    </StellarProvider>
  );
}

export default App;
