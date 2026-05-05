"use client";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  characterName?: string;
}

export default function ChatMessage({
  role,
  content,
  characterName,
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
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-3 animate-fade-in">
      <div className="chat-bubble-assistant">
        {characterName && (
          <p className="text-xs text-[var(--accent-primary)] font-semibold mb-1.5">
            {characterName}
          </p>
        )}
        <div className="whitespace-pre-wrap">{formatContent(content)}</div>
      </div>
    </div>
  );
}
