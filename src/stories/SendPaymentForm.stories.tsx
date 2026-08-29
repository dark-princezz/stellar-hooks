/**
 * SendPaymentForm — Example app demonstrating usePayment with form validation
 * and distinct pending / success / error UI states.
 *
 * Covers:
 *  - Live field validation (destination, amount, memo length)
 *  - Asset type toggle (native XLM vs. custom credit asset)
 *  - Wallet connection gate via useFreighter
 *  - Pending spinner while isLoading (building → signing → submitting → polling)
 *  - Success banner with transaction hash and explorer link
 *  - Error banner with structured StellarTransactionError details
 *  - Reset to re-send
 */
import React, { useState, useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { usePayment } from "../hooks/usePayment";
import { useFreighter } from "../hooks/useFreighter";
import { unsafeAsPublicKey, unsafeAsAssetIssuer } from "../types";
import type { PaymentAsset } from "../hooks/usePayment";
import type { StellarTransactionError } from "../types";

// ─── Constants ────────────────────────────────────────────────────────────────

const TESTNET_EXPLORER = "https://stellar.expert/explorer/testnet/tx";
const MAINNET_EXPLORER = "https://stellar.expert/explorer/public/tx";

/** Max memo text length enforced by Stellar protocol */
const MAX_MEMO_BYTES = 28;

// ─── Validation ───────────────────────────────────────────────────────────────

interface FormErrors {
  destination?: string;
  amount?: string;
  issuer?: string;
  code?: string;
  memo?: string;
}

function validatePublicKeyFormat(value: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(value.trim());
}

function validateForm(
  destination: string,
  amount: string,
  assetType: "native" | "credit",
  assetCode: string,
  assetIssuer: string,
  memo: string,
): FormErrors {
  const errors: FormErrors = {};

  if (!destination.trim()) {
    errors.destination = "Recipient address is required.";
  } else if (!validatePublicKeyFormat(destination)) {
    errors.destination = "Must be a valid Stellar public key (G…, 56 characters).";
  }

  if (!amount.trim()) {
    errors.amount = "Amount is required.";
  } else if (isNaN(Number(amount)) || Number(amount) <= 0) {
    errors.amount = "Amount must be a positive number.";
  } else if (!/^\d+(\.\d{1,7})?$/.test(amount.trim())) {
    errors.amount = "Maximum 7 decimal places allowed.";
  }

  if (assetType === "credit") {
    if (!assetCode.trim()) {
      errors.code = "Asset code is required.";
    } else if (!/^[A-Za-z0-9]{1,12}$/.test(assetCode.trim())) {
      errors.code = "Asset code must be 1–12 alphanumeric characters.";
    }

    if (!assetIssuer.trim()) {
      errors.issuer = "Issuer address is required.";
    } else if (!validatePublicKeyFormat(assetIssuer)) {
      errors.issuer = "Must be a valid Stellar public key (G…, 56 characters).";
    }
  }

  if (memo.trim() && new TextEncoder().encode(memo).length > MAX_MEMO_BYTES) {
    errors.memo = `Memo must be ${MAX_MEMO_BYTES} bytes or fewer.`;
  }

  return errors;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span
      role="alert"
      style={{ display: "block", color: "#b91c1c", fontSize: "0.78rem", marginTop: "0.25rem" }}
    >
      {message}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle:       "#6b7280",
    building:   "#d97706",
    signing:    "#7c3aed",
    submitting: "#2563eb",
    polling:    "#0891b2",
    success:    "#16a34a",
    error:      "#dc2626",
  };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.15rem 0.55rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: 600,
        background: colors[status] ?? "#6b7280",
        color: "#fff",
        letterSpacing: "0.03em",
      }}
    >
      {status}
    </span>
  );
}

function SuccessBanner({ hash, network }: { hash: string; network: "testnet" | "mainnet" }) {
  const base = network === "mainnet" ? MAINNET_EXPLORER : TESTNET_EXPLORER;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: "#f0fdf4",
        border: "1px solid #86efac",
        borderRadius: 8,
        padding: "1rem",
        marginTop: "1rem",
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, color: "#15803d" }}>✅ Payment confirmed</p>
      <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", wordBreak: "break-all" }}>
        <strong>TX Hash:</strong>{" "}
        <a
          href={`${base}/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#15803d" }}
        >
          {hash}
        </a>
      </p>
    </div>
  );
}

function ErrorBanner({ error }: { error: StellarTransactionError }) {
  return (
    <div
      role="alert"
      style={{
        background: "#fef2f2",
        border: "1px solid #fca5a5",
        borderRadius: 8,
        padding: "1rem",
        marginTop: "1rem",
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, color: "#b91c1c" }}>❌ Payment failed</p>
      <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "#7f1d1d" }}>
        <strong>Type:</strong> {error.type}
      </p>
      <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#7f1d1d" }}>
        <strong>Reason:</strong> {error.message}
      </p>
      {error.type === "transaction" && (
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#7f1d1d" }}>
          <strong>Result code:</strong> <code>{error.resultCode}</code>
        </p>
      )}
    </div>
  );
}

function PendingOverlay({ status }: { status: string }) {
  const labels: Record<string, string> = {
    building:   "Building transaction…",
    signing:    "Waiting for wallet signature…",
    submitting: "Submitting to network…",
    polling:    "Waiting for confirmation…",
  };
  const label = labels[status];
  if (!label) return null;

  return (
    <div
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        padding: "0.75rem 1rem",
        background: "#eff6ff",
        border: "1px solid #93c5fd",
        borderRadius: 8,
        marginTop: "1rem",
        fontSize: "0.88rem",
        color: "#1d4ed8",
      }}
    >
      {/* Simple CSS spinner — no external dependency */}
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: 16,
          height: 16,
          border: "2px solid #93c5fd",
          borderTopColor: "#1d4ed8",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          flexShrink: 0,
        }}
      />
      {label}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Main Form Component ──────────────────────────────────────────────────────

interface SendPaymentFormProps {
  /** Pre-fill the destination field (useful for Storybook controls) */
  defaultDestination?: string;
  /** Pre-fill the amount field */
  defaultAmount?: string;
  /** Which Stellar network the Storybook preview is targeting */
  network?: "testnet" | "mainnet";
}

function SendPaymentForm({
  defaultDestination = "",
  defaultAmount = "10",
  network = "testnet",
}: SendPaymentFormProps) {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [destination, setDestination] = useState(defaultDestination);
  const [amount, setAmount] = useState(defaultAmount);
  const [memo, setMemo] = useState("");
  const [assetType, setAssetType] = useState<"native" | "credit">("native");
  const [assetCode, setAssetCode] = useState("USDC");
  const [assetIssuer, setAssetIssuer] = useState("");
  const [touched, setTouched] = useState<Partial<Record<string, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // ── Wallet connection ───────────────────────────────────────────────────────
  const { isInstalled, isConnected, publicKey, isLoading: walletLoading, connect, networkPassphraseWarning } = useFreighter();

  // ── Validation ──────────────────────────────────────────────────────────────
  const errors = useMemo(
    () => validateForm(destination, amount, assetType, assetCode, assetIssuer, memo),
    [destination, amount, assetType, assetCode, assetIssuer, memo],
  );

  const isFormValid = Object.keys(errors).length === 0;

  const showError = (field: string) => Boolean((touched[field] || submitAttempted) && errors[field as keyof FormErrors]);

  // ── Resolved asset ──────────────────────────────────────────────────────────
  const asset: PaymentAsset = useMemo(
    () =>
      assetType === "native"
        ? { type: "native" }
        : { type: "credit", code: assetCode.trim().toUpperCase(), issuer: unsafeAsAssetIssuer(assetIssuer.trim()) },
    [assetType, assetCode, assetIssuer],
  );

  // ── usePayment ──────────────────────────────────────────────────────────────
  const { submit, status, hash, error, isLoading, isSuccess, isError, reset } = usePayment({
    destination: unsafeAsPublicKey(destination.trim()),
    asset,
    amount: amount.trim(),
    memo: memo.trim() || undefined,
  });

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!isFormValid || !isConnected) return;
    await submit();
  }

  function handleReset() {
    reset();
    setSubmitAttempted(false);
    setTouched({});
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const isTerminal = isSuccess || isError;

  return (
    <div
      style={{
        border: "1px solid #d1d5db",
        borderRadius: 10,
        padding: "1.5rem",
        maxWidth: 520,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem" }}>Send Payment</h3>
        <StatusBadge status={status} />
      </div>

      {/* ── Wallet gate ─────────────────────────────────────────────────────── */}
      {!isConnected && (
        <div
          style={{
            background: "#fefce8",
            border: "1px solid #fde047",
            borderRadius: 8,
            padding: "0.75rem 1rem",
            marginBottom: "1.25rem",
            fontSize: "0.88rem",
          }}
        >
          {!isInstalled ? (
            <p style={{ margin: 0 }}>
              ⚠️ Freighter wallet extension not detected.{" "}
              <a href="https://freighter.app" target="_blank" rel="noopener noreferrer">
                Install Freighter
              </a>{" "}
              to sign transactions.
            </p>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <span>🔌 Connect your wallet to send payments.</span>
              <button
                type="button"
                onClick={connect}
                disabled={walletLoading}
                style={{
                  padding: "0.3rem 0.8rem",
                  borderRadius: 6,
                  border: "1px solid #ca8a04",
                  background: "#fef9c3",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                {walletLoading ? "Connecting…" : "Connect Freighter"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Network mismatch warning */}
      {networkPassphraseWarning && (
        <div
          role="alert"
          style={{
            background: "#fff7ed",
            border: "1px solid #fdba74",
            borderRadius: 8,
            padding: "0.6rem 1rem",
            marginBottom: "1rem",
            fontSize: "0.82rem",
            color: "#9a3412",
          }}
        >
          ⚠️ {networkPassphraseWarning}
        </div>
      )}

      {/* Connected account */}
      {isConnected && publicKey && (
        <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "#6b7280" }}>
          <strong>Signing as:</strong>{" "}
          <code style={{ wordBreak: "break-all" }}>{publicKey}</code>
        </p>
      )}

      {/* ── Payment form ─────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} noValidate>
        {/* Destination */}
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="sf-destination" style={{ display: "block", fontWeight: 600, fontSize: "0.88rem", marginBottom: "0.3rem" }}>
            Recipient address <span aria-hidden="true" style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            id="sf-destination"
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            onBlur={() => handleBlur("destination")}
            placeholder="G…"
            disabled={isLoading || isTerminal}
            aria-invalid={showError("destination")}
            aria-describedby={showError("destination") ? "sf-destination-error" : undefined}
            style={{
              width: "100%",
              padding: "0.5rem 0.6rem",
              borderRadius: 6,
              border: `1px solid ${showError("destination") ? "#f87171" : "#d1d5db"}`,
              fontSize: "0.88rem",
              boxSizing: "border-box",
              fontFamily: "monospace",
            }}
          />
          {showError("destination") && <FieldError message={errors.destination} />}
        </div>

        {/* Asset type toggle */}
        <div style={{ marginBottom: "1rem" }}>
          <fieldset style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "0.75rem 1rem" }}>
            <legend style={{ fontWeight: 600, fontSize: "0.88rem", padding: "0 0.25rem" }}>Asset</legend>
            <div style={{ display: "flex", gap: "1.5rem", marginBottom: assetType === "credit" ? "0.75rem" : 0 }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.88rem" }}>
                <input
                  type="radio"
                  name="assetType"
                  value="native"
                  checked={assetType === "native"}
                  onChange={() => setAssetType("native")}
                  disabled={isLoading || isTerminal}
                />
                Native XLM
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.88rem" }}>
                <input
                  type="radio"
                  name="assetType"
                  value="credit"
                  checked={assetType === "credit"}
                  onChange={() => setAssetType("credit")}
                  disabled={isLoading || isTerminal}
                />
                Credit asset
              </label>
            </div>

            {assetType === "credit" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem", marginTop: "0.5rem" }}>
                <div>
                  <label htmlFor="sf-code" style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.2rem" }}>
                    Code <span aria-hidden="true" style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    id="sf-code"
                    type="text"
                    value={assetCode}
                    onChange={(e) => setAssetCode(e.target.value.toUpperCase())}
                    onBlur={() => handleBlur("code")}
                    placeholder="USDC"
                    maxLength={12}
                    disabled={isLoading || isTerminal}
                    aria-invalid={showError("code")}
                    style={{
                      width: "100%",
                      padding: "0.45rem 0.6rem",
                      borderRadius: 6,
                      border: `1px solid ${showError("code") ? "#f87171" : "#d1d5db"}`,
                      fontSize: "0.85rem",
                      boxSizing: "border-box",
                    }}
                  />
                  {showError("code") && <FieldError message={errors.code} />}
                </div>
                <div>
                  <label htmlFor="sf-issuer" style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.2rem" }}>
                    Issuer <span aria-hidden="true" style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    id="sf-issuer"
                    type="text"
                    value={assetIssuer}
                    onChange={(e) => setAssetIssuer(e.target.value)}
                    onBlur={() => handleBlur("issuer")}
                    placeholder="G… (issuer address)"
                    disabled={isLoading || isTerminal}
                    aria-invalid={showError("issuer")}
                    style={{
                      width: "100%",
                      padding: "0.45rem 0.6rem",
                      borderRadius: 6,
                      border: `1px solid ${showError("issuer") ? "#f87171" : "#d1d5db"}`,
                      fontSize: "0.85rem",
                      fontFamily: "monospace",
                      boxSizing: "border-box",
                    }}
                  />
                  {showError("issuer") && <FieldError message={errors.issuer} />}
                </div>
              </div>
            )}
          </fieldset>
        </div>

        {/* Amount */}
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="sf-amount" style={{ display: "block", fontWeight: 600, fontSize: "0.88rem", marginBottom: "0.3rem" }}>
            Amount{" "}
            <span style={{ color: "#6b7280", fontWeight: 400 }}>
              ({assetType === "native" ? "XLM" : assetCode || "asset"})
            </span>{" "}
            <span aria-hidden="true" style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            id="sf-amount"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => handleBlur("amount")}
            placeholder="0.0000000"
            min="0.0000001"
            step="any"
            disabled={isLoading || isTerminal}
            aria-invalid={showError("amount")}
            aria-describedby={showError("amount") ? "sf-amount-error" : undefined}
            style={{
              width: "100%",
              padding: "0.5rem 0.6rem",
              borderRadius: 6,
              border: `1px solid ${showError("amount") ? "#f87171" : "#d1d5db"}`,
              fontSize: "0.88rem",
              boxSizing: "border-box",
            }}
          />
          {showError("amount") && <FieldError message={errors.amount} />}
        </div>

        {/* Memo (optional) */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label htmlFor="sf-memo" style={{ display: "block", fontWeight: 600, fontSize: "0.88rem", marginBottom: "0.3rem" }}>
            Memo{" "}
            <span style={{ color: "#6b7280", fontWeight: 400 }}>
              (optional · {MAX_MEMO_BYTES - new TextEncoder().encode(memo).length} bytes left)
            </span>
          </label>
          <input
            id="sf-memo"
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            onBlur={() => handleBlur("memo")}
            placeholder="e.g. Thanks!"
            disabled={isLoading || isTerminal}
            aria-invalid={showError("memo")}
            style={{
              width: "100%",
              padding: "0.5rem 0.6rem",
              borderRadius: 6,
              border: `1px solid ${showError("memo") ? "#f87171" : "#d1d5db"}`,
              fontSize: "0.88rem",
              boxSizing: "border-box",
            }}
          />
          {showError("memo") && <FieldError message={errors.memo} />}
        </div>

        {/* Validation summary (shown only on submit attempt when form is invalid) */}
        {submitAttempted && !isFormValid && (
          <p role="alert" style={{ color: "#b91c1c", fontSize: "0.82rem", marginBottom: "0.75rem" }}>
            Please fix the errors above before sending.
          </p>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {!isTerminal && (
            <button
              type="submit"
              disabled={isLoading || !isConnected || !isInstalled}
              style={{
                padding: "0.55rem 1.25rem",
                borderRadius: 6,
                border: "none",
                background: isLoading ? "#93c5fd" : !isConnected ? "#d1d5db" : "#2563eb",
                color: !isConnected ? "#6b7280" : "#fff",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: isLoading || !isConnected ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
            >
              {isLoading ? "Sending…" : "Send Payment"}
            </button>
          )}

          {isTerminal && (
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: "0.55rem 1.25rem",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                background: "#f9fafb",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              Send Another
            </button>
          )}
        </div>
      </form>

      {/* ── Status feedback ──────────────────────────────────────────────────── */}
      <PendingOverlay status={status} />
      {isSuccess && hash && <SuccessBanner hash={hash} network={network} />}
      {isError && error && <ErrorBanner error={error} />}
    </div>
  );
}

// ─── Storybook Meta ───────────────────────────────────────────────────────────

const meta: Meta<typeof SendPaymentForm> = {
  title: "Examples/SendPaymentForm",
  component: SendPaymentForm,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A complete send-payment form showing how to combine `usePayment` with `useFreighter` for wallet connection, client-side field validation, and distinct pending / success / error UI states.",
      },
    },
  },
  argTypes: {
    defaultDestination: {
      control: "text",
      description: "Pre-fill the recipient address field",
    },
    defaultAmount: {
      control: "text",
      description: "Pre-fill the amount field",
    },
    network: {
      control: { type: "radio" },
      options: ["testnet", "mainnet"],
      description: "Controls which Stellar Explorer URL is used for the success hash link",
    },
  },
};

export default meta;
type Story = StoryObj<typeof SendPaymentForm>;

/** Empty form — shows validation when you hit Send without filling anything in. */
export const Default: Story = {
  args: {
    defaultDestination: "",
    defaultAmount: "10",
    network: "testnet",
  },
};

/** Form pre-filled with a testnet address so you can try submitting immediately. */
export const PreFilledTestnet: Story = {
  name: "Pre-filled (testnet)",
  args: {
    defaultDestination: "GA2C5RFPE6GCKMY3US5PAB6VVVRIGXZHYTXP25WZDPB26DKP42YX5W53",
    defaultAmount: "5",
    network: "testnet",
  },
};

/** Demonstrates the credit-asset path (USDC on testnet issuer). */
export const CreditAsset: Story = {
  name: "Credit Asset (USDC)",
  args: {
    defaultDestination: "GA2C5RFPE6GCKMY3US5PAB6VVVRIGXZHYTXP25WZDPB26DKP42YX5W53",
    defaultAmount: "25",
    network: "testnet",
  },
};
