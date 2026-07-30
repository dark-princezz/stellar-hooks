import React, { useMemo, useState } from "react";
import { useOptionalStellarHookDebugContext } from "../context";

export interface HookActivityOverlayProps {
  /** Set to false to hide the overlay even in development. */
  enabled?: boolean;
  /** Render the overlay in production too. Defaults to false. */
  forceInProduction?: boolean;
  /** Maximum number of hook instances to show. Default: 12 */
  maxEntries?: number;
}

function isDevEnvironment(): boolean {
  return typeof process === "undefined" || process.env.NODE_ENV !== "production";
}

export function HookActivityOverlay({
  enabled = true,
  forceInProduction = false,
  maxEntries = 12,
}: HookActivityOverlayProps): React.JSX.Element | null {
  const debugContext = useOptionalStellarHookDebugContext();
  const [collapsed, setCollapsed] = useState(false);

  const entries = useMemo(
    () => (debugContext?.entries ?? []).slice(0, maxEntries),
    [debugContext?.entries, maxEntries],
  );

  if (!enabled || (!forceInProduction && !isDevEnvironment())) {
    return null;
  }

  if (!debugContext) {
    return null;
  }

  return (
    <aside
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 2147483647,
        width: 360,
        maxWidth: "calc(100vw - 32px)",
        borderRadius: 12,
        border: "1px solid rgba(148, 163, 184, 0.35)",
        background: "rgba(15, 23, 42, 0.94)",
        color: "#e2e8f0",
        boxShadow: "0 16px 48px rgba(15, 23, 42, 0.35)",
        backdropFilter: "blur(10px)",
        fontFamily:
          "ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
        fontSize: 12,
      }}
    >
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          border: "none",
          borderBottom: collapsed ? "none" : "1px solid rgba(148, 163, 184, 0.15)",
          background: "transparent",
          color: "inherit",
          cursor: "pointer",
          font: "inherit",
        }}
      >
        <span>stellar-hooks dev overlay</span>
        <span>{collapsed ? "+" : "-"}</span>
      </button>

      {!collapsed && (
        <div style={{ maxHeight: 320, overflowY: "auto", padding: "8px 10px 12px" }}>
          {entries.length === 0 ? (
            <p style={{ margin: 0, color: "#94a3b8" }}>
              No active hook instances.
            </p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "rgba(30, 41, 59, 0.72)",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 6,
                  }}
                >
                  <strong style={{ color: "#f8fafc" }}>{entry.name}</strong>
                  <span style={{ color: "#38bdf8" }}>{entry.status}</span>
                </div>
                <div style={{ color: "#94a3b8", marginBottom: entry.lastError ? 6 : 0 }}>
                  {entry.updatedAt.toLocaleTimeString()}
                </div>
                {entry.lastError ? (
                  <div style={{ color: "#fda4af", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {entry.lastError}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      )}
    </aside>
  );
}
