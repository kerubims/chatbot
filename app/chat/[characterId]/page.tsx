"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import ChatMessage from "@/app/components/ChatMessage";
import ChatInput from "@/app/components/ChatInput";
import TypingIndicator from "@/app/components/TypingIndicator";
import SessionSidebar from "@/app/components/SessionSidebar";

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
  
  // Settings
  const [temperature, setTemperature] = useState(0.8);
  const [maxTokens, setMaxTokens] = useState(300);

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
          // Convert DB messages to useChat format
          const chatMessages = data.messages.map((msg: DbMessage) => ({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            parts: [{ type: "text" as const, text: msg.content }],
          }));
          setMessages(chatMessages);
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

  const handleSendMessage = async (text: string) => {
    if (!activeSessionId || isStreaming) return;
    
    setError(null);
    setIsStreaming(true);

    const userMessage = { 
      id: Date.now().toString(), 
      role: "user", 
      content: text,
      createdAt: new Date()
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          characterId,
          sessionId: activeSessionId,
          temperature,
          maxTokens,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const textResponse = await res.text();
      const assistantMessage = { 
        id: (Date.now() + 1).toString(), 
        role: "assistant", 
        content: textResponse,
        createdAt: new Date()
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("Gagal mengirim pesan", err);
      setError(err);
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

  // Extract text from message parts or content
  const getMessageText = (msg: any): string => {
    if (msg.parts) {
      return msg.parts
        .filter((p: any) => p.type === "text")
        .map((p: any) => ("text" in p ? p.text : ""))
        .join("");
    }
    return msg.content || "";
  };

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
        maxTokens={maxTokens}
        setMaxTokens={setMaxTokens}
      />

      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
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
          <div>
            <h2 className="font-semibold text-sm">{character.name}</h2>
            <p
              className="text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {isStreaming ? "typing..." : "online"}
            </p>
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
              content={getMessageText(msg)}
              characterName={
                msg.role === "assistant" ? character.name : undefined
              }
            />
          ))}
          {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
            <TypingIndicator />
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
          disabled={isStreaming || !activeSessionId}
        />
      </div>
    </div>
  );
}
