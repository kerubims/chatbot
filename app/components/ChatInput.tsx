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
      className="flex items-end gap-2 w-full bg-[#28282b] rounded-[24px] p-2 shadow-lg"
    >
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        disabled={disabled}
        rows={1}
        className="flex-1 bg-transparent text-white border-none focus:ring-0 resize-none py-2 px-4 text-[15px] placeholder-white/40"
        style={{
          minHeight: "40px",
          maxHeight: "150px",
          outline: "none",
        }}
      />
      
      <div className="flex items-center gap-1 pb-0.5 pr-0.5 shrink-0">
        <button
          type="button"
          onClick={insertActionStars}
          disabled={disabled}
          title="Tambah Action (*)"
          className="p-1 text-[#a78bfa] hover:text-white hover:bg-white/10 rounded-full transition-colors flex items-center justify-center font-bold text-[28px] leading-none mb-0.5"
          style={{ opacity: disabled ? 0.5 : 1, width: "36px", height: "36px" }}
        >
          *
        </button>
        
        <button
          type="button"
          disabled={disabled}
          title="Suggestion/Idea"
          className="p-1 text-[#a78bfa] hover:text-white hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
          style={{ opacity: disabled ? 0.5 : 1, width: "36px", height: "36px" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.3 1.5 1.5 2.5" />
            <path d="M9 18h6" />
            <path d="M10 22h4" />
          </svg>
        </button>
        
        <div className="w-1"></div> {/* Spacer */}

        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="bg-[#9f7aea] hover:bg-[#8b5cf6] text-white rounded-[14px] flex items-center justify-center transition-colors"
          style={{
            width: "40px",
            height: "40px",
            opacity: disabled || !input.trim() ? 0.5 : 1,
            cursor: disabled || !input.trim() ? "not-allowed" : "pointer",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </form>
  );
}
