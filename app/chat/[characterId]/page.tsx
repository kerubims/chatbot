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

interface UsageStats {
  promptTokens: number;
  completionTokens: number;
  totalCost: number;
  lastChatTokens: number;
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
  const [usage, setUsage] = useState<UsageStats>({
    promptTokens: 0,
    completionTokens: 0,
    totalCost: 0,
    lastChatTokens: 0,
  });
  
  // Modals
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);

  // Suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Settings
  const [temperature, setTemperature] = useState(0.8);
  
  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
            lastChatTokens: 0,
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
        setUsage({ promptTokens: 0, completionTokens: 0, totalCost: 0, lastChatTokens: 0 });
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
    setSuggestions([]); // Clear suggestions on new message
    setShowSuggestions(false);

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
                  lastChatTokens: event.usage.total_tokens || 0,
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

  const handleSuggest = async () => {
    if (suggestions.length > 0) {
      // Toggle visibility if already loaded
      setShowSuggestions(!showSuggestions);
      return;
    }
    await handleRefreshSuggestions();
  };

  const handleRefreshSuggestions = async () => {
    if (!activeSessionId || !characterId || isStreaming) return;
    
    setIsLoadingSuggestions(true);
    setShowSuggestions(true);
    setSuggestions([]);
    
    try {
      const res = await fetch("/api/chat/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSessionId,
          characterId,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        
        // Update usage stats if returned
        if (data.usage) {
          setUsage((prev) => ({
            promptTokens: prev.promptTokens + (data.usage.prompt_tokens || 0),
            completionTokens: prev.completionTokens + (data.usage.completion_tokens || 0),
            totalCost: prev.totalCost + (data.cost || 0),
            lastChatTokens: prev.lastChatTokens, // keep last chat unchanged
          }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch suggestions", err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    // Dispatch event to ChatInput to set its text
    window.dispatchEvent(new CustomEvent("setChatInput", { detail: suggestion }));
    // Note: Do not hide suggestions here, so the user can easily switch to another suggestion.
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
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
        
        {/* Full-Screen Character Background */}
        {character.avatar_url ? (
          <div className="absolute inset-0 z-0">
            <img
              src={character.avatar_url}
              alt=""
              className="w-full h-full object-cover"
            />
            {/* Gradient overlays for readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-mesh" />
        )}

        {/* Overlays */}
        {showLevelUp !== null && (
          <LevelUpOverlay
            newLevel={showLevelUp}
            onClose={() => setShowLevelUp(null)}
          />
        )}
        {toastExp !== null && (
          <ExpToast 
            key={Date.now()}
            expChange={toastExp} 
            onComplete={() => setToastExp(null)} 
          />
        )}

        {/* Chat Header (Glassmorphism) */}
        <div
          className="flex items-center gap-2 px-3 sm:px-4 py-2.5 relative z-10"
          style={{
            background: "rgba(0, 0, 0, 0.35)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          {/* Back / Hamburger (mobile) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0 md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          {/* Hamburger (desktop) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0 hidden md:flex"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>

          {/* Character Name */}
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm text-white truncate">{character.name}</h2>
            <p className="text-[11px] text-white/50">
              {isStreaming ? "typing..." : "online"}
            </p>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-1.5">
            {/* Kept empty or for future header items */}
          </div>
        </div>

        {/* Affinity Bar (thin strip below header) */}
        <div className="relative z-10 px-3 sm:px-4 py-1.5" style={{ background: "rgba(0,0,0,0.2)" }}>
          <AffinityBar level={affinityLevel} exp={affinityExp} />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 flex flex-col gap-3 relative z-10">
          {messages.length === 0 && !activeSessionId && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-white/50 text-sm">Start a new session to begin chatting</p>
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
              avatarUrl={msg.role === "assistant" ? character.avatar_url : undefined}
              isStreaming={msg.isStreaming}
            />
          ))}
          {isStreaming && messages[messages.length - 1]?.content === "" && (
            <TypingIndicator />
          )}

          {/* Rate limit warning */}
          {rateLimitCountdown !== null && rateLimitCountdown > 0 && (
            <div className="p-3 rounded-xl text-sm animate-fade-in"
              style={{
                background: "rgba(250, 204, 21, 0.15)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(250, 204, 21, 0.3)",
                color: "#facc15",
              }}
            >
              <p className="font-semibold mb-1">⏳ Too Many Messages</p>
              <p>Please wait <strong>{rateLimitCountdown}s</strong> before sending another message.</p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl text-sm" style={{
              background: "rgba(239, 68, 68, 0.15)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#f87171",
            }}>
              <p className="font-semibold mb-1">Connection Error</p>
              <p>{error.message || "Failed to generate a response. Please try again."}</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area & Action Buttons */}
        <div className="relative z-10 px-3 sm:px-4 pb-3 sm:pb-4 flex flex-col gap-2.5">
          {/* Horizontal scrollable action buttons */}
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pt-2 px-1">
            <button
              onClick={() => setShowStoryViewer(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[14px] text-[12px] font-medium whitespace-nowrap text-white transition-transform active:scale-95 shadow-sm"
              style={{ backgroundColor: "#9b8b98" }}
            >
              <span>📖</span> Story Journal
            </button>
            <button
              onClick={() => setShowTokenModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[14px] text-[12px] font-medium whitespace-nowrap text-white transition-transform active:scale-95 shadow-sm"
              style={{ backgroundColor: "#9b8b98" }}
            >
              <span>🪙</span> Token Usage
            </button>
            <button
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[14px] text-[12px] font-medium whitespace-nowrap text-white/90 transition-transform active:scale-95 shadow-sm opacity-90"
              style={{ backgroundColor: "#9b8b98" }}
            >
              <span>🖼️</span> Photo
            </button>
            <button
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[14px] text-[12px] font-medium whitespace-nowrap text-white/90 transition-transform active:scale-95 shadow-sm opacity-90"
              style={{ backgroundColor: "#9b8b98" }}
            >
              <span>👕</span> Dress up
            </button>
            <button
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[14px] text-[12px] font-medium whitespace-nowrap text-white/90 transition-transform active:scale-95 shadow-sm opacity-90"
              style={{ backgroundColor: "#9b8b98" }}
            >
              <span>🎁</span> Gift
            </button>
          </div>

          {/* Suggestion Chips */}
          {suggestions.length > 0 && showSuggestions && (
            <div className="flex flex-wrap gap-2 px-1 pb-1 animate-fade-in items-center">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="bg-[#28282b]/80 hover:bg-[#3f3f46] text-[#a78bfa] border border-[#a78bfa]/30 px-3 py-1.5 rounded-full text-[13px] text-left transition-colors truncate max-w-full shadow-sm"
                >
                  {suggestion}
                </button>
              ))}
              <button
                onClick={handleRefreshSuggestions}
                disabled={isLoadingSuggestions}
                title="Refresh Suggestions"
                className="p-1.5 text-[#a78bfa] hover:text-white hover:bg-white/10 rounded-full transition-colors ml-1 shrink-0 flex items-center justify-center"
                style={{ opacity: isLoadingSuggestions ? 0.5 : 1 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isLoadingSuggestions ? "animate-spin" : ""}>
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l5.67-5.67"/>
                </svg>
              </button>
            </div>
          )}

          <ChatInput
            onSend={handleSendMessage}
            disabled={isStreaming || !activeSessionId || (rateLimitCountdown !== null && rateLimitCountdown > 0)}
            onSuggest={handleSuggest}
            isLoadingSuggestions={isLoadingSuggestions}
          />
        </div>

        {/* Story Viewer Modal */}
        {showStoryViewer && activeSessionId && (
          <StoryViewer 
            sessionId={activeSessionId} 
            onClose={() => setShowStoryViewer(false)} 
          />
        )}

        {/* Token Usage Modal */}
        {showTokenModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
            onClick={() => setShowTokenModal(false)}
          >
            <div 
              className="bg-[#11141e] border border-white/5 rounded-2xl shadow-2xl w-full max-w-sm p-4 animate-pop-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="font-bold text-xl text-white tracking-wide">Token Usage</h3>
                <button 
                  onClick={() => setShowTokenModal(false)}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              
              {/* Inner Card */}
              <div className="bg-[#172033] border border-slate-700/50 rounded-xl p-5">
                <h4 className="text-white/90 text-lg font-medium mb-4">Usage Breakdown</h4>
                
                <div className="flex flex-col gap-3.5">
                  {/* Prompt Tokens */}
                  <div className="flex justify-between items-center text-slate-300">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center border border-slate-500 rounded px-1.5 py-0.5 text-[11px] font-mono text-slate-400">
                        &gt;_
                      </div>
                      <span className="text-[15px]">Prompt Tokens</span>
                    </div>
                    <span className="text-white font-mono font-semibold text-[15px]">{usage.promptTokens.toLocaleString()}</span>
                  </div>
                  
                  {/* Completion Tokens */}
                  <div className="flex justify-between items-center text-slate-300">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center text-slate-400">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      </div>
                      <span className="text-[15px]">Completion Tokens</span>
                    </div>
                    <span className="text-white font-mono font-semibold text-[15px]">{usage.completionTokens.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="w-full h-px bg-slate-700/50 my-5" />
                
                {/* Total Cost */}
                <div className="flex justify-between items-center">
                  <span className="text-white text-[15px] font-medium tracking-wide">Total Cost</span>
                  <span className="text-[#22d3ee] font-mono text-[22px] font-bold" style={{ textShadow: "0 0 12px rgba(34, 211, 238, 0.6)" }}>
                    {usage.totalCost < 0.0001 ? "< $0.0001" : `$${usage.totalCost.toFixed(4)}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

