/**
 * ClaimableBalancesInbox — Example app listing and claiming pending claimable balances
 * for a connected account.
 *
 * Covers:
 *  - Fetching all claimable balances for a public key from Horizon
 *  - Parsing and displaying predicates (unconditional, time-bound, conditional)
 *  - Filtering balances by claimability ("claimable now" vs locked)
 *  - Claim flow with useClaimBalance hook and status states (pending/success/error)
 *  - Balance details: amount, asset, sponsor, last modified ledger, claimants
 *  - Empty state, loading state, and error state handling
 *  - Refresh button to poll for new balances
 */
import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { useClaimableBalances } from "../hooks/useClaimableBalance";
import { useFreighter } from "../hooks/useFreighter";
import { asPublicKey } from "../types";
import type { ClaimableBalanceRecord } from "../hooks/useClaimableBalance";

// ─── Constants ────────────────────────────────────────────────────────────────

const TESTNET_EXPLORER = "https://stellar.expert/explorer/testnet";
const MAINNET_EXPLORER = "https://stellar.expert/explorer/public";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PredicateBadge({ predicate }: { predicate?: ClaimableBalanceRecord["claimants"][number]["parsedPredicate"] }) {
  if (!predicate) {
    return (
      <span style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", background: "#e5e7eb", borderRadius: "9999px" }}>
        unknown
      </span>
    );
  }

  let label = "unknown";
  let color = "#9ca3af";

  switch (predicate.type) {
    case "unconditional":
      label = "unconditional";
      color = "#10b981";
      break;
    case "time-bound":
      if (predicate.absBefore) {
        label = `time-bound (${predicate.absBefore})`;
      } else if (predicate.absBeforeEpoch) {
        label = `time-bound (${predicate.absBeforeEpoch})`;
      } else if (predicate.relBefore !== undefined) {
        label = `time-bound (+${predicate.relBefore}s)`;
      }
      color = predicate.isClaimable ? "#f59e0b" : "#ef4444";
      break;
    case "conditional":
      label = "conditional";
      color = predicate.isClaimable ? "#8b5cf6" : "#dc2626";
      break;
  }

  return (
    <span
      style={{
        fontSize: "0.75rem",
        padding: "0.25rem 0.5rem",
        background: color,
        borderRadius: "9999px",
        color: "#fff",
      }}
    >
      {label}
    </span>
  );
}

function ClaimantRow({ claimant }: { claimant: ClaimableBalanceRecord["claimants"][number] }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.5rem",
        background: claimant.isClaimable ? "#f0fdf4" : "#fff7ed",
        borderRadius: 6,
        marginTop: "0.25rem",
        fontSize: "0.85rem",
      }}
    >
      <div style={{ flex: 1, fontFamily: "monospace" }}>{claimant.destination}</div>
      <PredicateBadge predicate={claimant.parsedPredicate} />
      {claimant.isClaimable ? (
        <span style={{ color: "#16a34a", fontSize: "0.78rem", fontWeight: 600 }}>CLAIMABLE</span>
      ) : (
        <span style={{ color: "#dc2626", fontSize: "0.78rem", fontWeight: 600 }}>LOCKED</span>
      )}
    </div>
  );
}

function BalanceCard({
  balance,
  onClaim,
  isClaiming,
  network,
}: {
  balance: ClaimableBalanceRecord;
  onClaim: (id: string) => Promise<void>;
  isClaiming: boolean;
  network: "testnet" | "mainnet";
}) {
  const [status, setStatus] = useState<"idle" | "claiming" | "success" | "error">("idle");
  const [claimError, setClaimError] = useState<string | null>(null);

  async function handleClaim() {
    if (status === "claiming") return;
    setStatus("claiming");
    setClaimError(null);
    try {
      await onClaim(balance.id);
      setStatus("success");
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : "Claim failed");
      setStatus("error");
    }
  }

  const base = network === "mainnet" ? MAINNET_EXPLORER : TESTNET_EXPLORER;
  const explorerUrl = `${base}/cb/${balance.id}`;

  return (
    <div
      style={{
        border: "1px solid #d1d5db",
        borderRadius: 10,
        padding: "1rem",
        marginBottom: "0.75rem",
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <div>
          <h4 style={{ margin: 0, fontSize: "0.9rem" }}>
            Claimable Balance <span style={{ fontFamily: "monospace" }}>{balance.id.slice(0, 12)}…</span>
          </h4>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "#6b7280" }}>
            Sponsor: <span style={{ fontFamily: "monospace" }}>{balance.sponsor.slice(0, 12)}…</span> •
            Ledger: {balance.lastModifiedLedger}
          </p>
        </div>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: "0.8rem", color: "#2563eb", textDecoration: "none" }}
        >
          View on Explorer →
        </a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <div>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280" }}>Amount</p>
          <p style={{ margin: "0.15rem 0 0", fontWeight: 600, fontSize: "1rem" }}>{balance.amount}</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280" }}>Asset</p>
          <p style={{ margin: "0.15rem 0 0", fontWeight: 600, fontSize: "1rem", fontFamily: "monospace" }}>
            {balance.asset}
          </p>
        </div>
      </div>

      <div style={{ marginTop: "0.5rem" }}>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Claimants ({balance.claimants.length}):</p>
        {balance.claimants.map((c, idx) => (
          <ClaimantRow key={idx} claimant={c} />
        ))}
      </div>

      {status === "success" ? (
        <div
          role="status"
          style={{
            marginTop: "0.75rem",
            padding: "0.5rem",
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: 6,
            fontSize: "0.85rem",
            color: "#16a34a",
            fontWeight: 600,
          }}
        >
          ✅ Claimed successfully
        </div>
      ) : null}

      {claimError ? (
        <div
          role="alert"
          style={{
            marginTop: "0.5rem",
            padding: "0.5rem",
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: 6,
            fontSize: "0.85rem",
            color: "#b91c1c",
          }}
        >
          ❌ Claim failed: {claimError}
        </div>
      ) : null}

      <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <button
          onClick={handleClaim}
          disabled={status === "claiming" || status === "success"}
          style={{
            padding: "0.4rem 1rem",
            borderRadius: 6,
            border: "none",
            background: status === "claiming" || status === "success" ? "#d1d5db" : "#2563eb",
            color: status === "claiming" || status === "success" ? "#6b7280" : "#fff",
            fontWeight: 600,
            fontSize: "0.88rem",
            cursor: status === "claiming" || status === "success" ? "not-allowed" : "pointer",
          }}
        >
          {status === "claiming" ? "Claiming…" : status === "success" ? "Claimed" : "Claim"}
        </button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
      <div
        style={{
          display: "inline-block",
          width: 24,
          height: 24,
          border: "3px solid #e5e7eb",
          borderTopColor: "#2563eb",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          marginBottom: "0.75rem",
        }}
      />
      <p style={{ margin: 0, fontSize: "0.9rem" }}>Fetching claimable balances…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
      <p style={{ margin: 0, fontSize: "0.9rem" }}>No claimable balances found for this account.</p>
      <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "#9ca3af" }}>
        Create one using <code>useCreateClaimableBalance</code> first.
      </p>
    </div>
  );
}

function ErrorState({ error }: { error: Error }) {
  return (
    <div
      style={{
        padding: "1rem",
        background: "#fef2f2",
        border: "1px solid #fca5a5",
        borderRadius: 10,
        color: "#b91c1c",
        marginBottom: "1rem",
      }}
    >
      <p style={{ margin: 0, fontWeight: 600 }}>Failed to load balances</p>
      <p style={{ margin: "0.5rem 0 0", fontSize: "0.88rem" }}>{error.message}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ClaimableBalancesInboxProps {
  defaultPublicKey?: string;
  network?: "testnet" | "mainnet";
}

function ClaimableBalancesInbox({
  defaultPublicKey = "GBL5T5MLZ57JTBNS643LEJBKAKSOTJCCZVY54FTNZHDSNA56NS6LM3WG",
  network = "testnet",
}: ClaimableBalancesInboxProps) {
  const [publicKey, setPublicKey] = useState(defaultPublicKey);
  const [showFilters, setShowFilters] = useState(false);
  const [filterClaimable, setFilterClaimable] = useState(true);
  const [filterLocked, setFilterLocked] = useState(true);

  const {
    isInstalled,
    isConnected,
    publicKey: walletPublicKey,
    isLoading: walletLoading,
    connect,
  } = useFreighter();

  // Use wallet public key if connected, otherwise use provided default
  const activePublicKey = isConnected && walletPublicKey ? walletPublicKey : publicKey;

  const {
    balances,
    isLoading,
    error,
    refetch,
  } = useClaimableBalances(activePublicKey);

  // Filter balances
  const filteredBalances = balances.filter((b) => {
    const userClaimant = b.claimants.find((c) => c.destination === activePublicKey);
    if (!userClaimant) return filterClaimable; // no user claimant — show by default
    if (filterClaimable && userClaimant.isClaimable) return true;
    if (filterLocked && !userClaimant.isClaimable) return true;
    return false;
  });

  // Claim handler
  const { claim } = useClaimableBalances(activePublicKey);

  async function handleClaimBalance(balanceId: string) {
    await claim(balanceId);
    // Refetch balances after successful claim to update the list
    setTimeout(refetch, 500);
  }

  function handleRefresh() {
    refetch();
  }

  return (
    <div
      style={{
        border: "1px solid #d1d5db",
        borderRadius: 10,
        padding: "1.5rem",
        maxWidth: 720,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem" }}>Claimable Balances Inbox</h3>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          style={{
            padding: "0.4rem 0.8rem",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            background: "#f9fafb",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
        >
          {isLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Public key input */}
      <div style={{ marginBottom: "1.25rem" }}>
        <label htmlFor="cb-publickey" style={{ display: "block", fontWeight: 600, fontSize: "0.88rem", marginBottom: "0.3rem" }}>
          Account Public Key
        </label>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            id="cb-publickey"
            type="text"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            disabled={isConnected}
            placeholder="G…"
            style={{
              flex: 1,
              padding: "0.5rem 0.6rem",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              fontSize: "0.88rem",
              fontFamily: "monospace",
              disabled: isConnected ? "not-allowed" : undefined,
            }}
          />
          <button
            type="button"
            onClick={() => setPublicKey("")}
            disabled={isConnected}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              background: "#f3f4f6",
              fontSize: "0.85rem",
              cursor: isConnected ? "not-allowed" : "pointer",
            }}
          >
            Reset
          </button>
          {isConnected && <span style={{ fontSize: "0.8rem", color: "#10b981" }}>✅ Connected</span>}
        </div>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "#6b7280" }}>
          {isConnected
            ? "Using your connected wallet address"
            : "Enter any account to view its claimable balances"}
        </p>
      </div>

      {/* Wallet connection gate */}
      {!isConnected && !isInstalled && (
        <div
          style={{
            background: "#fefce8",
            border: "1px solid #fde047",
            borderRadius: 8,
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            fontSize: "0.88rem",
          }}
        >
          ⚠️ Freighter wallet extension not detected.{" "}
          <a href="https://freighter.app" target="_blank" rel="noopener noreferrer">
            Install Freighter
          </a>{" "}
          to claim balances.
        </div>
      )}

      {!isConnected && isInstalled && (
        <div style={{ marginBottom: "1rem" }}>
          <button
            type="button"
            onClick={connect}
            disabled={walletLoading}
            style={{
              padding: "0.4rem 1rem",
              borderRadius: 6,
              border: "1px solid #ca8a04",
              background: "#fef9c3",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: walletLoading ? "not-allowed" : "pointer",
            }}
          >
            {walletLoading ? "Connecting…" : "Connect Freighter Wallet"}
          </button>
        </div>
      )}

      {/* Filter toggle */}
      {filteredBalances.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: "0.25rem 0.6rem",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              background: "#f9fafb",
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            {showFilters ? "Hide filters" : "Show filters"}
          </button>
          {showFilters && (
            <div
              style={{
                marginTop: "0.5rem",
                display: "flex",
                gap: "1rem",
                fontSize: "0.85rem",
                padding: "0.5rem",
                background: "#f9fafb",
                borderRadius: 6,
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <input
                  type="checkbox"
                  checked={filterClaimable}
                  onChange={(e) => setFilterClaimable(e.target.checked)}
                />
                Claimable
                <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  ({filteredBalances.filter((b) => b.claimants.some((c) => c.isClaimable)).length})
                </span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <input
                  type="checkbox"
                  checked={filterLocked}
                  onChange={(e) => setFilterLocked(e.target.checked)}
                />
                Locked
                <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  ({filteredBalances.filter((b) => !b.claimants.some((c) => c.isClaimable)).length})
                </span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} />
      ) : filteredBalances.length === 0 ? (
        <EmptyState />
      ) : (
        filteredBalances.map((balance, idx) => (
          <BalanceCard
            key={balance.id}
            balance={balance}
            onClaim={handleClaimBalance}
            isClaiming={false}
            network={network}
          />
        ))
      )}

      {/* Stats */}
      {filteredBalances.length > 0 && (
        <div
          style={{
            marginTop: "1.5rem",
            padding: "0.75rem 1rem",
            background: "#f3f4f6",
            borderRadius: 8,
            fontSize: "0.85rem",
            color: "#374151",
          }}
        >
          <strong>Total balances:</strong> {filteredBalances.length} •{" "}
          <strong>Total locked:</strong> {filteredBalances.filter((b) => !b.claimants.some((c) => c.isClaimable)).length} •{" "}
          <strong>Total claimable:</strong> {filteredBalances.filter((b) => b.claimants.some((c) => c.isClaimable)).length}
        </div>
      )}
    </div>
  );
}

// ─── Storybook Meta ───────────────────────────────────────────────────────────

const meta: Meta<typeof ClaimableBalancesInbox> = {
  title: "Examples/ClaimableBalancesInbox",
  component: ClaimableBalancesInbox,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A full-featured claimable balances inbox that lists, filters, and claims pending claimable balances for a connected account. " +
          "Demonstrates useClaimableBalances for fetching and useClaimBalance for claiming.",
      },
    },
  },
  argTypes: {
    defaultPublicKey: {
      control: "text",
      description: "Pre-fill the account public key field",
    },
    network: {
      control: { type: "radio" },
      options: ["testnet", "mainnet"],
      description: "Controls which Stellar Explorer URL is used for balance links",
    },
  },
};

export default meta;
type Story = StoryObj<typeof ClaimableBalancesInbox>;

/** Default inbox using the Storybook default test account. */
export const Default: Story = {
  args: {
    defaultPublicKey: "GBL5T5MLZ57JTBNS643LEJBKAKSOTJCCZVY54FTNZHDSNA56NS6LM3WG",
    network: "testnet",
  },
};

/** Custom test account with a known testnet public key. */
export const CustomAccount: Story = {
  name: "Custom Account",
  args: {
    defaultPublicKey: "GBL5T5MLZ57JTBNS643LEJBKAKSOTJCCZVY54FTNZHDSNA56NS6LM3WG",
    network: "mainnet",
  },
};
