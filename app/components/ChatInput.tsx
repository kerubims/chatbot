"use client";

import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  const insertActionStars = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = input;
    
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);
    
    const newText = before + "*" + selected + "*" + after;
    setInput(newText);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + 1, end + 1);
      }
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      insertActionStars();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-3 items-end p-4"
      style={{
        background: "var(--bg-secondary)",
        borderTop: "1px solid var(--border-subtle)",
      }}
    >
      <button
        type="button"
        onClick={insertActionStars}
        disabled={disabled}
        title="Tambah Action (Ctrl+B)"
        style={{
          padding: "11px 12px",
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
          background: "transparent",
          color: "var(--text-muted)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: "bold",
          marginBottom: "1px" // slight alignment tweak
        }}
      >
        *
      </button>
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message... (Shift+Enter for new line)"
        disabled={disabled}
        rows={1}
        className="input-field flex-1"
        style={{
          minHeight: "44px",
          maxHeight: "150px",
          resize: "none",
        }}
      />
      <button
        type="submit"
        disabled={disabled || !input.trim()}
        className="btn-primary"
        style={{
          padding: "12px 20px",
          opacity: disabled || !input.trim() ? 0.5 : 1,
          cursor: disabled || !input.trim() ? "not-allowed" : "pointer",
        }}
      >
        <span>➤</span>
      </button>
    </form>
  );
}
