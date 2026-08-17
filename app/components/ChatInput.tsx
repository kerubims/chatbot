"use client";

import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  onSuggest?: () => void;
  isLoadingSuggestions?: boolean;
}

export default function ChatInput({ onSend, disabled, onSuggest, isLoadingSuggestions }: ChatInputProps) {
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

  // Expose setInput to parent via ref or similar if we want to set it from parent.
  // Actually, we can just pass the value down if we make it controlled, but currently it's internal state.
  // We can add an id to the textarea and let the parent set its value and trigger a React synthetic event, 
  // or we can add an imperative handle, or just listen to a window event. 
  // A cleaner way is to pass `value` and `onChange` from parent, but let's avoid huge refactors.
  // We'll use a global event or expose a method if needed, but wait, the plan is to populate it from the parent page.
  // Let's add a `value` prop override. If `value` is passed, update internal state.
  // Wait, let's just dispatch a custom event from the parent, or pass an `externalInput` prop that updates it.
  
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

  // Listen to a custom event to set input from outside (for suggestions)
  useEffect(() => {
    const handleSetInput = (e: CustomEvent<string>) => {
      setInput(e.detail);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    };
    window.addEventListener("setChatInput", handleSetInput as EventListener);
    return () => window.removeEventListener("setChatInput", handleSetInput as EventListener);
  }, []);

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
          onClick={onSuggest}
          disabled={disabled || isLoadingSuggestions || !onSuggest}
          title="Suggestion/Idea"
          className="p-1 text-[#a78bfa] hover:text-white hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
          style={{ opacity: disabled || isLoadingSuggestions ? 0.5 : 1, width: "36px", height: "36px" }}
        >
          {isLoadingSuggestions ? (
            <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.3 1.5 1.5 2.5" />
              <path d="M9 18h6" />
              <path d="M10 22h4" />
            </svg>
          )}
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
