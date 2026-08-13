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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        
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
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
          {loading ? (
            <div className="text-center text-[var(--text-muted)] py-10">Loading journal...</div>
          ) : chapters.length === 0 ? (
            <div className="text-center text-[var(--text-muted)] py-10">
              <p>No chapters written yet.</p>
              <p className="text-sm mt-2">The story is automatically summarized every 20 messages.</p>
            </div>
          ) : (
            <>
              {/* Chapters List */}
              <div className="flex flex-col gap-6">
                {chapters.map((ch) => (
                  <div key={ch.id} className="flex flex-col gap-2">
                    <h3 className="text-[var(--accent-cyan)] font-semibold text-sm uppercase tracking-wider">
                      Chapter {ch.chapter}
                    </h3>
                    <p className="text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap text-sm">
                      {ch.content}
                    </p>
                  </div>
                ))}
              </div>

              {/* Current State (if exists) */}
              {currentState && (
                <div className="mt-4 p-4 bg-[rgba(255,255,255,0.03)] border border-[var(--border-subtle)] rounded-lg">
                  <h3 className="text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider mb-2">
                    Current State (Memory)
                  </h3>
                  <p className="text-sm font-mono text-[var(--text-primary)] leading-relaxed">
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
