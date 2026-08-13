"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import ChatMessage from "@/app/components/ChatMessage";
import ChatInput from "@/app/components/ChatInput";
import TypingIndicator from "@/app/components/TypingIndicator";
import SessionSidebar from "@/app/components/SessionSidebar";
import AffinityBar from "@/app/components/AffinityBar";
import ExpToast from "@/app/components/ExpToast";
import LevelUpOverlay from "@/app/components/LevelUpOverlay";
import TokenCounter from "@/app/components/TokenCounter";
import StoryViewer from "@/app/components/StoryViewer";

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
  persona: string;
  greeting: string;
  sessions: Session[];
}

interface Session {
  id: string;
  title: string;
  created_at: string;
}

interface DbMessage {
  id: string;
  role: string;
  content: string;
}

interface UsageState {
  promptTokens: number;
  completionTokens: number;
  totalCost: number;
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ characterId: string }>;
}) {
  const { characterId } = use(params);
  const [character, setCharacter] = useState<Character | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);
  
  // Affinity State
  const [affinityLevel, setAffinityLevel] = useState(1);
  const [affinityExp, setAffinityExp] = useState(0);
  const [toastExp, setToastExp] = useState<number | null>(null);
  const [showLevelUp, setShowLevelUp] = useState<number | null>(null);
  
  // Usage / Token Tracking State
  const [usage, setUsage] = useState<UsageState>({
    promptTokens: 0,
    completionTokens: 0,
    totalCost: 0,
  });
  
  // Modals
  const [showStoryViewer, setShowStoryViewer] = useState(false);

  // Settings
  const [temperature, setTemperature] = useState(0.8);

  // Rate limit countdown timer
  useEffect(() => {
    if (rateLimitCountdown === null || rateLimitCountdown <= 0) {
      if (rateLimitCountdown === 0) setRateLimitCountdown(null);
      return;
    }
    const timer = setTimeout(() => setRateLimitCountdown(rateLimitCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [rateLimitCountdown]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, scrollToBottom, error]);

  // Fetch character data
  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        const res = await fetch(`/api/characters/${characterId}`);
        if (res.ok) {
          const data: Character = await res.json();
          setCharacter(data);
          setSessions(data.sessions || []);

          // Auto-select or create first session
          if (data.sessions && data.sessions.length > 0) {
            setActiveSessionId(data.sessions[0].id);
          } else {
            // Create first session automatically
            const sessionRes = await fetch("/api/sessions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ characterId }),
            });
            if (sessionRes.ok) {
              const session = await sessionRes.json();
              setSessions([session]);
              setActiveSessionId(session.id);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCharacter();
  }, [characterId]);

  // Fetch messages when session changes
  useEffect(() => {
    if (!activeSessionId) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/sessions/${activeSessionId}`);
        if (res.ok) {
          const data = await res.json();
          // Convert DB messages to chat format
          const chatMessages = data.messages.map((msg: DbMessage) => ({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
          }));
          setMessages(chatMessages);
          setAffinityLevel(data.affinity_level || 1);
          setAffinityExp(data.affinity_exp || 0);
          
          // Load session usage stats
          setUsage({
            promptTokens: data.total_prompt_tokens || 0,
            completionTokens: data.total_completion_tokens || 0,
            totalCost: data.total_cost_usd || 0,
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMessages();
  }, [activeSessionId, setMessages]);

  const handleNewSession = async () => {
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId }),
      });
      if (res.ok) {
        const session = await res.json();
        setSessions((prev) => [session, ...prev]);
        setActiveSessionId(session.id);
        // Reset usage for new session
        setUsage({ promptTokens: 0, completionTokens: 0, totalCost: 0 });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
        if (remaining.length === 0) setMessages([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ── SSE Streaming Message Handler ──────────────────────────
  const handleSendMessage = async (text: string) => {
    if (!activeSessionId || isStreaming) return;
    
    setError(null);
    setRateLimitCountdown(null);
    setIsStreaming(true);

    const userMessage = { 
      id: Date.now().toString(), 
      role: "user", 
      content: text,
      createdAt: new Date()
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    // Create a placeholder assistant message for streaming
    const assistantId = (Date.now() + 1).toString();
    const assistantMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: new Date(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          characterId,
          sessionId: activeSessionId,
          temperature,
        }),
      });

      // Handle rate limiting
      if (res.status === 429) {
        const data = await res.json();
        setRateLimitCountdown(data.retryAfter || 60);
        // Remove the placeholder assistant message
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        setIsStreaming(false);
        return;
      }

      if (!res.ok) {
        throw new Error(await res.text());
      }

      // Read SSE stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          try {
            const event = JSON.parse(trimmed.slice(6));

            if (event.type === "token") {
              // Append token to assistant message
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + event.content }
                    : m
                )
              );
            } else if (event.type === "done") {
              // Finalize message with parsed reply
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: event.reply, isStreaming: false }
                    : m
                )
              );

              // Update affinity
              setAffinityLevel(event.affinity_level);
              setAffinityExp(event.affinity_exp);

              if (event.exp_change !== 0) {
                setToastExp(event.exp_change);
              }
              if (event.leveledUp) {
                setShowLevelUp(event.affinity_level);
              }

              // Update usage stats
              if (event.usage) {
                setUsage((prev) => ({
                  promptTokens: prev.promptTokens + event.usage.prompt_tokens,
                  completionTokens: prev.completionTokens + event.usage.completion_tokens,
                  totalCost: prev.totalCost + (event.cost || 0),
                }));
              }
            } else if (event.type === "error") {
              throw new Error(event.message);
            }
          } catch (parseErr: any) {
            // Only throw if it's a real error event, not a parse issue
            if (parseErr.message && !trimmed.includes('"type":"token"')) {
              console.warn("SSE parse issue:", parseErr.message);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Gagal mengirim pesan", err);
      setError(err);
      // Remove the placeholder if error
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, isStreaming: false, content: m.content || "" }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </main>
    );
  }

  if (!character) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Character not found</p>
          <a
            href="/characters"
            className="btn-primary inline-block"
            style={{ textDecoration: "none" }}
          >
            <span>← Back to Characters</span>
          </a>
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <SessionSidebar
        sessions={sessions}
        activeSessionId={activeSessionId || undefined}
        onSelectSession={setActiveSessionId}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        characterName={character.name}
        temperature={temperature}
        setTemperature={setTemperature}
        usageStats={usage}
      />

      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {showLevelUp !== null && (
          <LevelUpOverlay
            newLevel={showLevelUp}
            onClose={() => setShowLevelUp(null)}
          />
        )}
        {toastExp !== null && (
          <ExpToast 
            key={Date.now()} // Force remount if multiple rapid updates
            expChange={toastExp} 
            onComplete={() => setToastExp(null)} 
          />
        )}

        {/* Chat Header */}
        <div
          className="flex items-center gap-3 px-6 py-4"
          style={{
            background: "var(--bg-secondary)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          {character.avatar_url ? (
            <img
              src={character.avatar_url}
              alt={character.name}
              className="avatar"
              style={{ width: "36px", height: "36px" }}
            />
          ) : (
            <div
              className="avatar"
              style={{ width: "36px", height: "36px", fontSize: "0.9rem" }}
            >
              {character.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h2 className="font-semibold text-sm">{character.name}</h2>
            <p
              className="text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {isStreaming ? "typing..." : "online"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeSessionId && (
              <button
                onClick={() => setShowStoryViewer(true)}
                className="flex items-center justify-center p-2 rounded-lg transition-colors hover:bg-[rgba(255,255,255,0.1)] text-[var(--text-muted)] hover:text-white"
                title="View Story Journal"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </button>
            )}
            <TokenCounter
              promptTokens={usage.promptTokens}
              completionTokens={usage.completionTokens}
              totalCost={usage.totalCost}
            />
            <AffinityBar level={affinityLevel} exp={affinityExp} />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {messages.length === 0 && !activeSessionId && (
            <div className="flex-1 flex items-center justify-center">
              <p style={{ color: "var(--text-muted)" }}>
                Start a new session to begin chatting
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role as "user" | "assistant"}
              content={msg.content || ""}
              characterName={
                msg.role === "assistant" ? character.name : undefined
              }
              isStreaming={msg.isStreaming}
            />
          ))}
          {isStreaming && messages[messages.length - 1]?.content === "" && (
            <TypingIndicator />
          )}

          {/* Rate limit warning */}
          {rateLimitCountdown !== null && rateLimitCountdown > 0 && (
            <div className="rate-limit-warning p-4 rounded-lg text-sm animate-fade-in"
              style={{
                background: "rgba(250, 204, 21, 0.1)",
                border: "1px solid rgba(250, 204, 21, 0.3)",
                color: "#facc15",
              }}
            >
              <p className="font-semibold mb-1">⏳ Too Many Messages</p>
              <p>Please wait <strong>{rateLimitCountdown}s</strong> before sending another message.</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-sm">
              <p className="font-semibold mb-1">Connection Error</p>
              <p>{error.message || "Failed to generate a response. Please try again."}</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSendMessage}
          disabled={isStreaming || !activeSessionId || (rateLimitCountdown !== null && rateLimitCountdown > 0)}
        />

        {/* Story Viewer Modal */}
        {showStoryViewer && activeSessionId && (
          <StoryViewer 
            sessionId={activeSessionId} 
            onClose={() => setShowStoryViewer(false)} 
          />
        )}
      </div>
    </div>
  );
}
