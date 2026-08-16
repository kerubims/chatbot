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
  lastChatTokens?: number;
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
  isOpen?: boolean;
  onClose?: () => void;
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
  isOpen = true,
  onClose,
}: SessionSidebarProps) {

  const handleSelectSession = (id: string) => {
    onSelectSession(id);
    onClose?.();
  };

  const handleNewSession = () => {
    onNewSession();
    onClose?.();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-full z-50 flex flex-col
          w-[280px] transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 md:z-auto
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border-subtle)",
        }}
      >
        {/* Header */}
        <div
          className="p-4 flex flex-col gap-3"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center justify-between">
            <h2
              className="text-sm font-semibold truncate"
              style={{ color: "var(--text-secondary)" }}
            >
              {characterName}
            </h2>
            {/* Close button (mobile only) */}
            {onClose && (
              <button
                onClick={onClose}
                className="md:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button onClick={handleNewSession} className="btn-primary w-full text-sm">
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
                onClick={() => handleSelectSession(session.id)}
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
                <span style={{ color: "var(--text-muted)" }}>Session Tokens</span>
                <span style={{ color: "var(--text-primary)" }}>
                  {(usageStats.promptTokens + usageStats.completionTokens).toLocaleString()}
                </span>
              </div>
              {usageStats.lastChatTokens !== undefined && usageStats.lastChatTokens > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-muted)" }}>Last Chat Tokens</span>
                  <span style={{ color: "var(--text-primary)" }}>
                    {usageStats.lastChatTokens.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span style={{ color: "var(--text-muted)" }}>Session Cost</span>
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
    </>
  );
}
