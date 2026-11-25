/**
 * @file DevToolsPanel.tsx
 * @description React DevTools-style panel for inspecting active hook instances and their state.
 * @package stellar-hooks
 * @license MIT
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import type { HookActivitySnapshot } from "../types";
import { useOptionalStellarHookDebugContext } from "../context";
import { subscribeToDevToolsActivity, clearDevToolsActivity } from "./devtoolsBridge";
import { safeJsonStringify } from "../utils/bigIntSerializer";

export interface DevToolsPanelProps {
  /** Optional custom hook snapshots. If omitted, uses active context and devtools bridge. */
  entries?: HookActivitySnapshot[];
  /** Optional title to show in the header bar. Default: "Stellar Hooks DevTools" */
  title?: string;
  /** Height of the panel. Default: "100%" or "550px" */
  height?: string | number;
  /** Width of the panel. Default: "100%" */
  width?: string | number;
  /** Dark mode theme toggle (default: true). */
  darkMode?: boolean;
  /** Callback fired when an instance is selected. */
  onSelectInstance?: (instance: HookActivitySnapshot | null) => void;
}

type StatusFilter = "all" | "idle" | "loading" | "success" | "error";

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  idle: { bg: "rgba(100, 116, 139, 0.2)", text: "#94a3b8", border: "rgba(100, 116, 139, 0.4)" },
  loading: { bg: "rgba(14, 165, 233, 0.2)", text: "#38bdf8", border: "rgba(14, 165, 233, 0.4)" },
  success: { bg: "rgba(34, 197, 94, 0.2)", text: "#4ade80", border: "rgba(34, 197, 94, 0.4)" },
  connected: { bg: "rgba(34, 197, 94, 0.2)", text: "#4ade80", border: "rgba(34, 197, 94, 0.4)" },
  ready: { bg: "rgba(34, 197, 94, 0.2)", text: "#4ade80", border: "rgba(34, 197, 94, 0.4)" },
  error: { bg: "rgba(239, 68, 68, 0.2)", text: "#f87171", border: "rgba(239, 68, 68, 0.4)" },
};

function getStatusStyle(status: string) {
  const normalized = status.toLowerCase();
  for (const [key, val] of Object.entries(STATUS_COLORS)) {
    if (normalized.includes(key)) {
      return val;
    }
  }
  return STATUS_COLORS.idle;
}

export function DevToolsPanel({
  entries: propEntries,
  title = "Stellar Hooks DevTools",
  height = 550,
  width = "100%",
  darkMode = true,
  onSelectInstance,
}: DevToolsPanelProps): React.JSX.Element {
  const debugContext = useOptionalStellarHookDebugContext();
  const [bridgeEntries, setBridgeEntries] = useState<HookActivitySnapshot[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Subscribe to devtools bridge if no explicit entries are provided
  useEffect(() => {
    if (propEntries) return;
    const unsubscribe = subscribeToDevToolsActivity((latest) => {
      setBridgeEntries(latest);
    });
    return unsubscribe;
  }, [propEntries]);

  // Combine entries from props, context, or bridge
  const allEntries: HookActivitySnapshot[] = useMemo(() => {
    if (propEntries) return propEntries;
    if (debugContext?.entries && debugContext.entries.length > 0) {
      return debugContext.entries;
    }
    return bridgeEntries;
  }, [propEntries, debugContext?.entries, bridgeEntries]);

  // Compute status counts
  const statusCounts = useMemo(() => {
    const counts = { all: allEntries.length, idle: 0, loading: 0, success: 0, error: 0 };
    for (const entry of allEntries) {
      const s = entry.status.toLowerCase();
      if (entry.lastError || s.includes("error") || s.includes("failed")) {
        counts.error++;
      } else if (s.includes("loading") || s.includes("pending") || s.includes("fetching")) {
        counts.loading++;
      } else if (s.includes("success") || s.includes("connected") || s.includes("ready")) {
        counts.success++;
      } else {
        counts.idle++;
      }
    }
    return counts;
  }, [allEntries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return allEntries.filter((entry) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.lastError && entry.lastError.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter === "all") return true;
      const s = entry.status.toLowerCase();
      if (statusFilter === "error") {
        return !!entry.lastError || s.includes("error") || s.includes("failed");
      }
      if (statusFilter === "loading") {
        return s.includes("loading") || s.includes("pending") || s.includes("fetching");
      }
      if (statusFilter === "success") {
        return s.includes("success") || s.includes("connected") || s.includes("ready");
      }
      if (statusFilter === "idle") {
        return (
          !entry.lastError &&
          !s.includes("error") &&
          !s.includes("loading") &&
          !s.includes("success") &&
          !s.includes("connected")
        );
      }
      return true;
    });
  }, [allEntries, searchQuery, statusFilter]);

  // Auto-select first entry if none selected
  const activeSelectedId = useMemo(() => {
    if (selectedId && filteredEntries.some((e) => e.id === selectedId)) {
      return selectedId;
    }
    return filteredEntries[0]?.id ?? null;
  }, [selectedId, filteredEntries]);

  const selectedEntry = useMemo(() => {
    return allEntries.find((e) => e.id === activeSelectedId) ?? null;
  }, [allEntries, activeSelectedId]);

  const handleSelect = useCallback(
    (entry: HookActivitySnapshot) => {
      setSelectedId(entry.id);
      onSelectInstance?.(entry);
    },
    [onSelectInstance]
  );

  const handleClear = useCallback(() => {
    clearDevToolsActivity();
    setSelectedId(null);
  }, []);

  const handleCopyState = useCallback(() => {
    if (!selectedEntry) return;
    const json = safeJsonStringify(selectedEntry, 2);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(json).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [selectedEntry]);

  const theme = darkMode
    ? {
        bg: "#0f172a",
        surface: "#1e293b",
        surfaceLight: "rgba(51, 65, 85, 0.4)",
        border: "rgba(148, 163, 184, 0.2)",
        text: "#f8fafc",
        textMuted: "#94a3b8",
        accent: "#38bdf8",
      }
    : {
        bg: "#f8fafc",
        surface: "#ffffff",
        surfaceLight: "rgba(241, 245, 249, 0.8)",
        border: "rgba(203, 213, 225, 0.8)",
        text: "#0f172a",
        textMuted: "#64748b",
        accent: "#0284c7",
      };

  return (
    <div
      data-testid="stellar-hooks-devtools-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height,
        width,
        background: theme.bg,
        color: theme.text,
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: 13,
        border: `1px solid ${theme.border}`,
        borderRadius: 8,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* ─── Top Header Toolbar ─── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: theme.surface,
          borderBottom: `1px solid ${theme.border}`,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#22c55e",
              boxShadow: "0 0 8px #22c55e",
              display: "inline-block",
            }}
          />
          <strong style={{ fontSize: 14, letterSpacing: "-0.01em" }}>{title}</strong>
          <span
            style={{
              fontSize: 11,
              padding: "2px 6px",
              borderRadius: 4,
              background: theme.surfaceLight,
              color: theme.textMuted,
            }}
          >
            {allEntries.length} active
          </span>
        </div>

        {/* Search & Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="search"
            placeholder="Filter hooks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "4px 8px",
              fontSize: 12,
              borderRadius: 6,
              border: `1px solid ${theme.border}`,
              background: theme.bg,
              color: theme.text,
              outline: "none",
              width: 140,
            }}
          />

          <button
            type="button"
            onClick={handleClear}
            title="Clear instances"
            style={{
              padding: "4px 8px",
              fontSize: 11,
              borderRadius: 6,
              border: `1px solid ${theme.border}`,
              background: theme.surfaceLight,
              color: theme.textMuted,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>
      </header>

      {/* ─── Filter Status Bar ─── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 14px",
          background: theme.bg,
          borderBottom: `1px solid ${theme.border}`,
          fontSize: 11,
        }}
      >
        <span style={{ color: theme.textMuted, marginRight: 4 }}>Filter:</span>
        {(["all", "loading", "success", "error", "idle"] as StatusFilter[]).map((tab) => {
          const active = statusFilter === tab;
          const count = statusCounts[tab];
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              style={{
                background: active ? theme.surface : "transparent",
                color: active ? theme.accent : theme.textMuted,
                border: active ? `1px solid ${theme.border}` : "1px solid transparent",
                borderRadius: 4,
                padding: "2px 8px",
                cursor: "pointer",
                fontWeight: active ? 600 : 400,
                textTransform: "capitalize",
              }}
            >
              {tab} ({count})
            </button>
          );
        })}
      </div>

      {/* ─── Split Content: Left (Hook List) | Right (Instance Details) ─── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
        {/* Left Hook Instances List */}
        <div
          style={{
            width: "42%",
            minWidth: 200,
            borderRight: `1px solid ${theme.border}`,
            overflowY: "auto",
            background: theme.bg,
          }}
        >
          {filteredEntries.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: theme.textMuted }}>
              No matching hook instances found.
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isSelected = entry.id === activeSelectedId;
              const statusStyle = getStatusStyle(entry.status);
              return (
                <div
                  key={entry.id}
                  onClick={() => handleSelect(entry)}
                  style={{
                    padding: "10px 12px",
                    borderBottom: `1px solid ${theme.border}`,
                    background: isSelected ? theme.surface : "transparent",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <strong
                      style={{
                        color: isSelected ? theme.accent : theme.text,
                        fontSize: 13,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {entry.name}
                    </strong>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 9999,
                        background: statusStyle.bg,
                        color: statusStyle.text,
                        border: `1px solid ${statusStyle.border}`,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        fontWeight: 600,
                      }}
                    >
                      {entry.status}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 11,
                      color: theme.textMuted,
                    }}
                  >
                    <span>{entry.id}</span>
                    <span>{entry.updatedAt ? new Date(entry.updatedAt).toLocaleTimeString() : ""}</span>
                  </div>
                  {entry.lastError ? (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 11,
                        color: "#f87171",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      ⚠️ {entry.lastError}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {/* Right Hook Inspector Pane */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 16,
            background: theme.surface,
          }}
        >
          {selectedEntry ? (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>{selectedEntry.name}</h3>
                  <code style={{ fontSize: 11, color: theme.textMuted }}>{selectedEntry.id}</code>
                </div>
                <button
                  type="button"
                  onClick={handleCopyState}
                  style={{
                    padding: "4px 10px",
                    fontSize: 11,
                    borderRadius: 6,
                    border: `1px solid ${theme.border}`,
                    background: theme.surfaceLight,
                    color: copied ? "#4ade80" : theme.text,
                    cursor: "pointer",
                  }}
                >
                  {copied ? "Copied!" : "Copy JSON"}
                </button>
              </div>

              {/* Error Banner */}
              {selectedEntry.lastError ? (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 6,
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "#fca5a5",
                    marginBottom: 16,
                    fontSize: 12,
                    wordBreak: "break-word",
                  }}
                >
                  <strong style={{ display: "block", marginBottom: 4, color: "#f87171" }}>
                    Last Error:
                  </strong>
                  {selectedEntry.lastError}
                </div>
              ) : null}

              {/* State & Metadata Inspector */}
              <div
                style={{
                  background: theme.bg,
                  borderRadius: 6,
                  border: `1px solid ${theme.border}`,
                  padding: 12,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: 12,
                }}
              >
                <div style={{ color: theme.textMuted, marginBottom: 8, fontSize: 11 }}>
                  // Instance Snapshot State
                </div>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {safeJsonStringify(
                    {
                      id: selectedEntry.id,
                      name: selectedEntry.name,
                      status: selectedEntry.status,
                      lastError: selectedEntry.lastError,
                      updatedAt: selectedEntry.updatedAt,
                    },
                    2
                  )}
                </pre>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: theme.textMuted,
                textAlign: "center",
              }}
            >
              <p style={{ margin: "0 0 6px" }}>Select a hook instance from the left panel to inspect its state.</p>
              <small>Active hooks update automatically when network or state changes occur.</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
