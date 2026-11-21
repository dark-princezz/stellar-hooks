import React, { useState } from "react";
import { useInvoice } from "stellar-hooks";

interface Product {
  id: string;
  name: string;
  priceXlm: number;
  description: string;
}

const PRODUCTS: Product[] = [
  { id: "1", name: "Stellar Dev Hoodie", priceXlm: 25, description: "Cozy black hoodie with embroidered Stellar logo" },
  { id: "2", name: "Soroban Smart Contract Mug", priceXlm: 10, description: "Ceramic 12oz mug for caffeine & Rust contracts" },
  { id: "3", name: "Horizon Sticker Pack", priceXlm: 5, description: "Die-cut vinyl sticker set of Stellar and Soroban" },
];

const MERCHANT_ADDRESS = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

export default function App() {
  const [cart, setCart] = useState<Record<string, number>>({ "1": 1 });
  const [currentStep, setCurrentStep] = useState<"cart" | "checkout" | "status">("cart");
  const [orderId, setOrderId] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Compute total
  const totalAmount = Object.entries(cart).reduce((sum, [id, qty]) => {
    const prod = PRODUCTS.find((p) => p.id === id);
    return sum + (prod ? prod.priceXlm * qty : 0);
  }, 0);

  // Order invoice hook
  const {
    memo,
    status,
    receivedAmount,
    expectedAmount,
    isPaid,
    isPartial,
    isOverpaid,
    payments,
    checkNow,
    isLoading,
    reset,
  } = useInvoice({
    recipient: MERCHANT_ADDRESS,
    expectedAmount: totalAmount,
    memo: orderId ? `ORD-${orderId}` : undefined,
    enabled: currentStep === "checkout" || currentStep === "status",
    pollInterval: 3000,
  });

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => {
      const next = { ...prev };
      const current = next[id] || 0;
      const updated = current + delta;
      if (updated <= 0) {
        delete next[id];
      } else {
        next[id] = updated;
      }
      return next;
    });
  };

  const handleCheckout = () => {
    const newOrderId = Math.floor(100000 + Math.random() * 900000).toString();
    setOrderId(newOrderId);
    reset(`ORD-${newOrderId}`);
    setCurrentStep("checkout");
  };

  const paymentUri = `web+stellar:pay?destination=${MERCHANT_ADDRESS}&amount=${totalAmount}&memo=${encodeURIComponent(memo)}&memo_type=MEMO_TEXT`;

  const copyPaymentLink = async () => {
    try {
      await navigator.clipboard.writeText(paymentUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="container">
      <header className="header">
        <span className="badge">Example</span>
        <h1>Stellar Shop Checkout</h1>
        <p className="subtitle">
          Small shop checkout flow with cart, payment link, and live memo-based order reconciliation.
        </p>
      </header>

      {/* Step Navigation */}
      <nav className="steps-nav">
        <button
          onClick={() => setCurrentStep("cart")}
          className={`step-btn ${currentStep === "cart" ? "active" : ""}`}
        >
          1. Shopping Cart
        </button>
        <button
          onClick={() => totalAmount > 0 && setCurrentStep("checkout")}
          disabled={totalAmount <= 0}
          className={`step-btn ${currentStep === "checkout" ? "active" : ""}`}
        >
          2. Payment Link
        </button>
        <button
          onClick={() => Boolean(orderId) && setCurrentStep("status")}
          disabled={!orderId}
          className={`step-btn ${currentStep === "status" ? "active" : ""}`}
        >
          3. Order Status
        </button>
      </nav>

      {/* Cart View */}
      {currentStep === "cart" && (
        <section className="card">
          <h2>Your Cart</h2>
          <div className="catalog">
            {PRODUCTS.map((prod) => {
              const qty = cart[prod.id] || 0;
              return (
                <div key={prod.id} className="product-row">
                  <div className="product-info">
                    <strong>{prod.name}</strong>
                    <p>{prod.description}</p>
                    <span className="price">{prod.priceXlm} XLM</span>
                  </div>
                  <div className="qty-controls">
                    <button onClick={() => updateQuantity(prod.id, -1)} className="button small secondary">
                      -
                    </button>
                    <span className="qty">{qty}</span>
                    <button onClick={() => updateQuantity(prod.id, 1)} className="button small secondary">
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cart-total-bar">
            <span>Total:</span>
            <strong className="total-value">{totalAmount} XLM</strong>
          </div>

          <button
            onClick={handleCheckout}
            disabled={totalAmount <= 0}
            className="button primary full-width"
          >
            Proceed to Checkout ({totalAmount} XLM)
          </button>
        </section>
      )}

      {/* Payment Link View */}
      {currentStep === "checkout" && (
        <section className="card">
          <h2>Pay with Stellar</h2>
          <p className="desc">
            Scan the payment QR code or open your compatible Stellar wallet (Freighter, Lobstr, Albedo).
          </p>

          <div className="payment-summary">
            <div className="summary-row">
              <span>Order ID:</span>
              <code>#{orderId}</code>
            </div>
            <div className="summary-row">
              <span>Required Memo:</span>
              <code className="highlight-memo">{memo}</code>
            </div>
            <div className="summary-row">
              <span>Amount Due:</span>
              <strong className="amount">{totalAmount} XLM</strong>
            </div>
            <div className="summary-row">
              <span>Merchant Address:</span>
              <code title={MERCHANT_ADDRESS}>{MERCHANT_ADDRESS.slice(0, 8)}...{MERCHANT_ADDRESS.slice(-8)}</code>
            </div>
          </div>

          <div className="button-group">
            <a href={paymentUri} className="button primary">
              Open in Stellar Wallet
            </a>
            <button onClick={copyPaymentLink} className="button secondary">
              {copied ? "Link Copied!" : "Copy Payment Link"}
            </button>
          </div>

          <div className="status-banner">
            <p>
              Status: <strong>{status.toUpperCase()}</strong> ({receivedAmount} / {expectedAmount} XLM received)
            </p>
            <button onClick={() => setCurrentStep("status")} className="button small">
              View Live Order Status →
            </button>
          </div>
        </section>
      )}

      {/* Order Status View */}
      {currentStep === "status" && (
        <section className="card">
          <div className="section-header">
            <h2>Order Status: #{orderId}</h2>
            <button onClick={() => checkNow()} disabled={isLoading} className="button small">
              {isLoading ? "Checking..." : "Check Now"}
            </button>
          </div>

          <div className={`status-display ${status}`}>
            {status === "pending" && (
              <div className="status-content">
                <span className="spinner" />
                <h3>Awaiting Payment</h3>
                <p>Waiting for incoming transaction with memo <code>{memo}</code>.</p>
              </div>
            )}

            {status === "partial" && (
              <div className="status-content warning">
                <h3>⚠️ Partial Payment Received</h3>
                <p>
                  Received {receivedAmount} of {expectedAmount} XLM. Please send remaining balance with memo <code>{memo}</code>.
                </p>
              </div>
            )}

            {(status === "paid" || isPaid) && (
              <div className="status-content success">
                <h3>🎉 Payment Confirmed!</h3>
                <p>Full payment of {receivedAmount} XLM received and verified. Your order is now processing!</p>
              </div>
            )}

            {status === "overpaid" && (
              <div className="status-content info">
                <h3>ℹ️ Overpayment Detected</h3>
                <p>Received {receivedAmount} XLM (expected {expectedAmount} XLM). Excess will be refunded.</p>
              </div>
            )}
          </div>

          {payments.length > 0 && (
            <div className="payments-history">
              <h4>Received Transactions ({payments.length})</h4>
              <ul>
                {payments.map((p, idx) => (
                  <li key={idx} className="payment-item">
                    <span>Sender: <code>{p.from.slice(0, 6)}...{p.from.slice(-6)}</code></span>
                    <strong>+{p.amount} {p.assetCode}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="nav-footer">
            <button onClick={() => setCurrentStep("cart")} className="button secondary small">
              ← Return to Shop
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
