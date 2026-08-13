"use client";

import { useState } from "react";

interface TokenCounterProps {
  promptTokens: number;
  completionTokens: number;
  totalCost: number;
}

export default function TokenCounter({
  promptTokens,
  completionTokens,
  totalCost,
}: TokenCounterProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const totalTokens = promptTokens + completionTokens;

  // Color based on spending: green → yellow → red
  const getColor = () => {
    if (totalCost < 0.001) return "var(--accent-cyan)";
    if (totalCost < 0.01) return "#facc15"; // yellow
    return "#ef4444"; // red
  };

  const formatCost = (cost: number) => {
    if (cost < 0.0001) return "< $0.0001";
    return `$${cost.toFixed(4)}`;
  };

  return (
    <div
      className="token-counter"
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className="token-pill"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px",
          borderRadius: "20px",
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${getColor()}33`,
          fontSize: "11px",
          fontFamily: "var(--font-mono)",
          color: getColor(),
          cursor: "default",
          transition: "all var(--transition-fast)",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <span>{totalTokens.toLocaleString()} tok</span>
        <span style={{ opacity: 0.5 }}>•</span>
        <span>{formatCost(totalCost)}</span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="token-tooltip"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 14px",
            fontSize: "11px",
            whiteSpace: "nowrap",
            zIndex: 50,
            boxShadow: "var(--shadow-card)",
            animation: "fadeInUp 0.15s ease-out",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
              <span style={{ color: "var(--text-muted)" }}>Prompt</span>
              <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                {promptTokens.toLocaleString()}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
              <span style={{ color: "var(--text-muted)" }}>Completion</span>
              <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                {completionTokens.toLocaleString()}
              </span>
            </div>
            <div
              style={{
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: "4px",
                marginTop: "2px",
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>Total Cost</span>
              <span style={{ color: getColor(), fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                {formatCost(totalCost)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
