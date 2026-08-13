"use client";

interface Session {
  id: string;
  title: string;
  created_at: string;
}

interface UsageStats {
  promptTokens: number;
  completionTokens: number;
  totalCost: number;
}

interface SessionSidebarProps {
  sessions: Session[];
  activeSessionId?: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  characterName: string;
  temperature: number;
  setTemperature: (v: number) => void;
  usageStats?: UsageStats;
}

export default function SessionSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  characterName,
  temperature,
  setTemperature,
  usageStats,
}: SessionSidebarProps) {
  return (
    <div
      className="flex flex-col h-full"
      style={{
        width: "280px",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      {/* Header */}
      <div
        className="p-4 flex flex-col gap-3"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <h2
          className="text-sm font-semibold truncate"
          style={{ color: "var(--text-secondary)" }}
        >
          {characterName}
        </h2>
        <button onClick={onNewSession} className="btn-primary w-full text-sm">
          <span>+ New Session</span>
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {sessions.length === 0 && (
          <p
            className="text-sm text-center py-8"
            style={{ color: "var(--text-muted)" }}
          >
            No sessions yet
          </p>
        )}
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center gap-2 group"
            style={{ position: "relative" }}
          >
            <button
              onClick={() => onSelectSession(session.id)}
              className="flex-1 text-left px-3 py-2.5 rounded-lg text-sm transition-all truncate"
              style={{
                background:
                  session.id === activeSessionId
                    ? "var(--bg-card-hover)"
                    : "transparent",
                color:
                  session.id === activeSessionId
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                border:
                  session.id === activeSessionId
                    ? "1px solid var(--border-active)"
                    : "1px solid transparent",
              }}
            >
              {session.title}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Delete this session?")) {
                  onDeleteSession(session.id);
                }
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1.5 py-1 rounded"
              style={{
                color: "#ef4444",
                position: "absolute",
                right: "4px",
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div
        className="p-4 flex flex-col gap-4"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Creativity (Temp)
            </label>
            <span className="text-[10px] font-mono text-[var(--accent-primary)]">
              {(temperature ?? 0.8).toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.5"
            step="0.1"
            value={temperature ?? 0.8}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full accent-[var(--accent-primary)] h-1 bg-[var(--bg-card)] rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Usage Stats */}
      {usageStats && (
        <div
          className="p-4 flex flex-col gap-2"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Session Usage
          </label>
          <div className="flex flex-col gap-1" style={{ fontSize: "11px", fontFamily: "var(--font-mono)" }}>
            <div className="flex justify-between">
              <span style={{ color: "var(--text-muted)" }}>Tokens</span>
              <span style={{ color: "var(--text-primary)" }}>
                {(usageStats.promptTokens + usageStats.completionTokens).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--text-muted)" }}>Cost</span>
              <span style={{ color: "var(--accent-cyan)" }}>
                {usageStats.totalCost < 0.0001 
                  ? "< $0.0001" 
                  : `$${usageStats.totalCost.toFixed(4)}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Back link */}
      <div
        className="p-3"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <a
          href="/characters"
          className="text-sm flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
          style={{
            color: "var(--text-muted)",
            textDecoration: "none",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--text-primary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--text-muted)")
          }
        >
          ← Back to Characters
        </a>
      </div>
    </div>
  );
}
