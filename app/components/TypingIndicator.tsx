"use client";

export default function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div
        className="chat-bubble-assistant flex items-center gap-1 py-4 px-5"
        style={{ maxWidth: "100px" }}
      >
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}
