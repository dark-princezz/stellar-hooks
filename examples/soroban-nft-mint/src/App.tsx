import { useState, useCallback } from "react";
import { StellarProvider, useFreighter, useSorobanContract } from "stellar-hooks";
import { xdr, Address } from "@stellar/stellar-sdk";

// ---------------------------------------------------------------------------
// Helpers — encode Soroban ScVal arguments
// ---------------------------------------------------------------------------

/**
 * Encode a Stellar address (G... or C...) as an xdr.ScVal Address.
 */
function addressToScVal(address: string): xdr.ScVal {
  return xdr.ScVal.scvAddress(
    xdr.ScAddress.scAddressTypeAccount(
      xdr.AccountId.publicKeyTypeEd25519(
        Address.fromString(address).toScAddress().accountId().ed25519()
      )
    )
  );
}

/**
 * Encode an integer token_id as an xdr.ScVal U64.
 */
function u64ToScVal(value: bigint): xdr.ScVal {
  return xdr.ScVal.scvU64(new xdr.Uint64(value));
}

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

type TxStatus =
  | "idle"
  | "simulating"
  | "signing"
  | "submitting"
  | "polling"
  | "success"
  | "error";

const STATUS_LABELS: Record<TxStatus, string> = {
  idle: "Ready",
  simulating: "Simulating transaction…",
  signing: "Waiting for Freighter signature…",
  submitting: "Submitting to network…",
  polling: "Polling for confirmation…",
  success: "Transaction confirmed!",
  error: "Transaction failed",
};

const STATUS_COLOR: Record<TxStatus, string> = {
  idle: "#888",
  simulating: "#1976d2",
  signing: "#7b1fa2",
  submitting: "#f57c00",
  polling: "#0097a7",
  success: "#388e3c",
  error: "#d32f2f",
};

// ---------------------------------------------------------------------------
// NFT Mint panel — inner component (needs StellarProvider in scope)
// ---------------------------------------------------------------------------

function NftMintPanel() {
  const { isConnected, publicKey, connect, disconnect, isInstalled } =
    useFreighter();

  // Form state
  const [contractId, setContractId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [tokenId, setTokenId] = useState("1");

  // Derived lifecycle status — we track this manually so we can show
  // the "simulating → signing → submitting → polling" granularity the
  // hook itself doesn't expose as separate states.
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // Balance query state — separate from the mint state
  const [balanceRecipient, setBalanceRecipient] = useState("");
  const [balanceResult, setBalanceResult] = useState<bigint | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // -------------------------------------------------------------------
  // useSorobanContract: mint
  // ABI: mint(to: Address, token_id: U64) -> ()
  // -------------------------------------------------------------------
  const mintContract = useSorobanContract<void>({
    contractId: contractId || "",
    method: "mint",
    args: [
      recipient
        ? addressToScVal(recipient)
        : xdr.ScVal.scvVoid(),
      u64ToScVal(BigInt(parseInt(tokenId, 10) || 1)),
    ],
    parseResult: (_scVal) => undefined,
  });

  // -------------------------------------------------------------------
  // useSorobanContract: balance
  // ABI: balance(owner: Address) -> U64
  // -------------------------------------------------------------------
  const balanceContract = useSorobanContract<bigint>({
    contractId: contractId || "",
    method: "balance",
    args: [
      balanceRecipient
        ? addressToScVal(balanceRecipient)
        : xdr.ScVal.scvVoid(),
    ],
    parseResult: (scVal) => BigInt(scVal.u64().toString()),
  });

  // -------------------------------------------------------------------
  // Mint handler — walks through lifecycle stages manually
  // -------------------------------------------------------------------
  const handleMint = useCallback(async () => {
    if (!contractId.trim()) {
      alert("Please enter a contract ID.");
      return;
    }
    if (!recipient.trim()) {
      alert("Please enter a recipient address.");
      return;
    }
    const parsedId = parseInt(tokenId, 10);
    if (isNaN(parsedId) || parsedId < 0) {
      alert("Token ID must be a non-negative integer.");
      return;
    }

    setTxHash(null);
    setTxError(null);

    try {
      // 1. Simulate
      setTxStatus("simulating");
      await new Promise((r) => setTimeout(r, 50)); // allow React to repaint

      // 2. The hook's call() performs simulate→sign→submit→poll internally.
      //    We optimistically advance the status labels so the user can see
      //    the flow rather than a generic spinner.
      setTxStatus("signing");

      // call() resolves when the transaction is confirmed (or throws).
      const callPromise = mintContract.call();

      // Advance status labels while the promise is pending
      const signingDelay = setTimeout(() => setTxStatus("submitting"), 3000);
      const submittingDelay = setTimeout(() => setTxStatus("polling"), 7000);

      await callPromise;

      clearTimeout(signingDelay);
      clearTimeout(submittingDelay);

      setTxStatus("success");

      // Grab the transaction hash if the hook exposes it
      // (stellar-hooks may surface it via mintContract.result or a hash field)
      const hash =
        typeof mintContract.result === "string"
          ? mintContract.result
          : null;
      setTxHash(hash);

      // Auto-populate balance query with the same recipient
      setBalanceRecipient(recipient);
    } catch (err) {
      setTxStatus("error");
      setTxError(err instanceof Error ? err.message : String(err));
      console.error("Mint failed:", err);
    }
  }, [contractId, recipient, tokenId, mintContract]);

  // -------------------------------------------------------------------
  // Balance query handler
  // -------------------------------------------------------------------
  const handleQueryBalance = useCallback(async () => {
    if (!contractId.trim()) {
      alert("Please enter a contract ID.");
      return;
    }
    if (!balanceRecipient.trim()) {
      alert("Please enter an address to query.");
      return;
    }

    setBalanceResult(null);
    setBalanceError(null);
    setBalanceLoading(true);

    try {
      await balanceContract.query();
      if (balanceContract.result !== null && balanceContract.result !== undefined) {
        setBalanceResult(balanceContract.result);
      }
    } catch (err) {
      setBalanceError(err instanceof Error ? err.message : String(err));
      console.error("Balance query failed:", err);
    } finally {
      setBalanceLoading(false);
    }
  }, [contractId, balanceRecipient, balanceContract]);

  // -------------------------------------------------------------------
  // Render: Freighter not installed
  // -------------------------------------------------------------------
  if (!isInstalled) {
    return (
      <div className="container">
        <div className="card">
          <h2>Freighter Not Detected</h2>
          <p>
            Please install the Freighter wallet browser extension to use this
            demo.
          </p>
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

  // -------------------------------------------------------------------
  // Render: not connected
  // -------------------------------------------------------------------
  if (!isConnected) {
    return (
      <div className="container">
        <div className="card">
          <h2>Connect Your Wallet</h2>
          <p>
            Connect your Freighter wallet to mint NFTs on the Soroban testnet.
          </p>
          <button onClick={connect} className="button">
            Connect Freighter
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // Render: main UI
  // -------------------------------------------------------------------
  const isMinting = mintContract.isLoading || (txStatus !== "idle" && txStatus !== "success" && txStatus !== "error");

  return (
    <div className="container">
      <div className="card">
        {/* Header */}
        <div className="header">
          <h2>Soroban NFT Mint</h2>
          <button onClick={disconnect} className="button secondary">
            Disconnect
          </button>
        </div>

        <div className="info">
          <p className="public-key">Connected: {publicKey}</p>
          <p className="network">Network: Testnet</p>
        </div>

        {/* Contract ID */}
        <div className="form">
          <div className="field">
            <label htmlFor="contractId">NFT Contract ID</label>
            <input
              id="contractId"
              type="text"
              placeholder="C..."
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
            />
            <p className="hint">
              The Soroban contract ID of the deployed NFT contract (C…)
            </p>
          </div>

          {/* ── Mint section ─────────────────────────────────────────── */}
          <div className="section">
            <h3>Mint NFT</h3>

            <div className="field">
              <label htmlFor="recipient">Recipient Address</label>
              <input
                id="recipient"
                type="text"
                placeholder="G..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
              <p className="hint">
                Stellar public key of the NFT recipient (G…). Defaults to your
                own address if left blank.
              </p>
            </div>

            <div className="field">
              <label htmlFor="tokenId">Token ID</label>
              <input
                id="tokenId"
                type="number"
                min="0"
                step="1"
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
              />
              <p className="hint">
                Unique integer identifier for the NFT (U64). Must not already
                exist in the contract.
              </p>
            </div>

            {/* Lifecycle status badge */}
            {txStatus !== "idle" && (
              <div
                className="status-badge"
                style={{ borderColor: STATUS_COLOR[txStatus], color: STATUS_COLOR[txStatus] }}
              >
                <span className="status-dot" style={{ background: STATUS_COLOR[txStatus] }} />
                {STATUS_LABELS[txStatus]}
              </div>
            )}

            <button
              onClick={handleMint}
              disabled={isMinting || !contractId}
              className="button primary"
              style={{ marginTop: "12px" }}
            >
              {isMinting ? "Minting…" : "Mint NFT"}
            </button>

            {/* Success */}
            {txStatus === "success" && (
              <div className="success">
                <p>✓ NFT minted successfully!</p>
                {txHash && (
                  <p className="hash">
                    Tx Hash:{" "}
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {txHash}
                    </a>
                  </p>
                )}
              </div>
            )}

            {/* Error */}
            {txStatus === "error" && txError && (
              <div className="error">
                <p>✗ Mint failed</p>
                <p className="hash">{txError}</p>
              </div>
            )}
          </div>

          {/* ── Balance query section ────────────────────────────────── */}
          <div className="section">
            <h3>Query NFT Balance</h3>
            <p style={{ color: "#666", fontSize: "14px", marginBottom: "12px" }}>
              Query how many NFTs an address holds. This is a read-only
              simulation — no transaction is submitted.
            </p>

            <div className="field">
              <label htmlFor="balanceRecipient">Owner Address</label>
              <input
                id="balanceRecipient"
                type="text"
                placeholder="G..."
                value={balanceRecipient}
                onChange={(e) => {
                  setBalanceRecipient(e.target.value);
                  setBalanceResult(null);
                  setBalanceError(null);
                }}
              />
            </div>

            <button
              onClick={handleQueryBalance}
              disabled={balanceLoading || !contractId || !balanceRecipient}
              className="button"
            >
              {balanceLoading ? "Querying…" : "Query Balance"}
            </button>

            {/* Balance result */}
            {balanceResult !== null && (
              <div className="result">
                <p className="label">NFT Balance</p>
                <p className="value">{balanceResult.toString()}</p>
              </div>
            )}

            {/* Balance error */}
            {balanceError && (
              <div className="error">
                <p>✗ Query failed</p>
                <p className="hash">{balanceError}</p>
              </div>
            )}
          </div>

          {/* ── Info footer ──────────────────────────────────────────── */}
          <div className="info" style={{ marginTop: "20px" }}>
            <p className="note">
              This demo assumes a Soroban NFT contract with{" "}
              <code>mint(to: Address, token_id: U64)</code> and{" "}
              <code>balance(owner: Address) → U64</code> functions. Deploy a
              compatible contract on Soroban testnet before using this app.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root App — wraps everything in StellarProvider
// ---------------------------------------------------------------------------

function App() {
  return (
    <StellarProvider network="testnet">
      <div className="app">
        <header>
          <h1>Stellar Hooks</h1>
          <p>Soroban NFT Minting Example</p>
        </header>
        <NftMintPanel />
      </div>
    </StellarProvider>
  );
}

export default App;
