"use client";

import { useState, useEffect } from "react";

interface StoryChapter {
  id: string;
  chapter: number;
  content: string;
  created_at: string;
}

interface StoryViewerProps {
  sessionId: string;
  onClose: () => void;
}

export default function StoryViewer({ sessionId, onClose }: StoryViewerProps) {
  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [currentState, setCurrentState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/chapters`);
        if (res.ok) {
          const data = await res.json();
          setChapters(data.chapters || []);
          setCurrentState(data.currentState || null);
        }
      } catch (err) {
        console.error("Failed to load story chapters:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchChapters();
  }, [sessionId]);

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex flex-col items-center justify-end sm:justify-center p-0 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex justify-between items-center">
          <h2 className="text-lg font-bold">Story Journal</h2>
          <button 
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-white transition-colors p-2"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6 bg-[#16151e] rounded-b-2xl">
          {loading ? (
            <div className="text-center text-white/50 py-10">Loading journal...</div>
          ) : (
            <>
              {chapters.length === 0 ? (
                <div className="text-center py-6 pb-2 border-b border-white/5 mb-2">
                  <p className="text-[#8c8b99] font-medium text-[15px]">No chapters written yet.</p>
                  <p className="text-[#646370] text-sm mt-1">The story is automatically summarized every 20 messages.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6 mb-2">
                  {chapters.map((ch) => (
                    <div key={ch.id} className="flex flex-col gap-2">
                      <h3 className="text-[#9f7aea] font-semibold text-sm uppercase tracking-wider">
                        Chapter {ch.chapter}
                      </h3>
                      <p className="text-white/90 leading-relaxed whitespace-pre-wrap text-[15px]">
                        {ch.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Current State (if exists) */}
              {currentState && (
                <div className="p-5 bg-[#21202b] rounded-2xl shadow-inner mt-2">
                  <h3 className="text-[#71707d] font-bold text-[11px] uppercase tracking-wider mb-2.5">
                    CURRENT STATE (MEMORY)
                  </h3>
                  <p className="text-[14.5px] font-mono text-white/90 leading-[1.6] whitespace-pre-wrap">
                    {currentState}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
