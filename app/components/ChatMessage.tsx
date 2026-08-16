"use client";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  characterName?: string;
  avatarUrl?: string | null;
  isStreaming?: boolean;
}

export default function ChatMessage({
  role,
  content,
  characterName,
  avatarUrl,
  isStreaming,
}: ChatMessageProps) {
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
    <div className="flex justify-start items-end gap-2 animate-fade-in">
      <div className="chat-bubble-assistant">
        {characterName && (
          <p className="text-xs text-[var(--accent-primary)] font-semibold mb-1.5">
            {characterName}
          </p>
        )}
        <div className="whitespace-pre-wrap">
          {formatContent(content)}
          {isStreaming && <span className="streaming-cursor">▊</span>}
        </div>
      </div>
    </div>
  );
}
