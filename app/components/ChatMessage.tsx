"use client";

import { useState } from "react";

interface ChatMessageProps {
  id: string;
  role: "user" | "assistant";
  content: string;
  characterName?: string;
  avatarUrl?: string | null;
  isStreaming?: boolean;
  isRegenerating?: boolean;
  onRegenerate?: (id: string) => void;
}

export default function ChatMessage({
  id,
  role,
  content,
  characterName,
  avatarUrl,
  isStreaming,
  isRegenerating,
  onRegenerate,
}: ChatMessageProps) {
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  // Parse *action* text to italic for roleplay
  const formatContent = (text: string) => {
    const parts = text.split(/(\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={i} className="text-[var(--accent-cyan)] italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const handleTranslate = async () => {
    if (translatedText) {
      setShowTranslation(!showTranslation);
      return;
    }

    setIsTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });
      const data = await res.json();
      if (data.translatedText) {
        setTranslatedText(data.translatedText);
        setShowTranslation(true);
      }
    } catch (err) {
      console.error("Translation failed", err);
    } finally {
      setIsTranslating(false);
    }
  };

  const displayContent = showTranslation && translatedText ? translatedText : content;

  if (role === "user") {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="chat-bubble-user">
          <div className="whitespace-pre-wrap">{formatContent(content)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start items-end gap-2 animate-fade-in relative group/message">
      <div className="chat-bubble-assistant relative">
        {characterName && (
          <div className="flex justify-between items-center mb-1.5">
            <p className="text-xs text-[var(--accent-primary)] font-semibold">
              {characterName}
            </p>
          </div>
        )}
        <div className="whitespace-pre-wrap">
          {isRegenerating && !displayContent && (
            <div className="flex items-center gap-2 text-[var(--accent-primary)] text-sm animate-pulse mb-1">
              <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Regenerating response...</span>
            </div>
          )}
          {formatContent(displayContent)}
          {isStreaming && (!isRegenerating || displayContent) && <span className="streaming-cursor">▊</span>}
        </div>
        
        {/* Action Buttons */}
        {!isStreaming && (
          <div className="absolute -right-[4.5rem] top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover/message:opacity-100 transition-opacity">
            <button
              onClick={handleTranslate}
              disabled={isTranslating}
              title={showTranslation ? "Show Original" : "Translate"}
              className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors active:scale-95 flex items-center justify-center backdrop-blur-sm"
            >
              {isTranslating ? (
                 <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 8 6 6" />
                  <path d="m4 14 6-6 2-3" />
                  <path d="M2 5h12" />
                  <path d="M7 2h1" />
                  <path d="m22 22-5-10-5 10" />
                  <path d="M14 18h6" />
                </svg>
              )}
            </button>
            {onRegenerate && (
              <button
                onClick={() => onRegenerate(id)}
                title="Regenerate"
                className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors active:scale-95 flex items-center justify-center backdrop-blur-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
