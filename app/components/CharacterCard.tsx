"use client";

import Link from "next/link";

interface CharacterCardProps {
  id: string;
  name: string;
  avatar_url?: string | null;
  persona: string;
  _count?: { sessions: number };
  onDelete: (id: string) => void;
}

export default function CharacterCard({
  id,
  name,
  avatar_url,
  persona,
  _count,
  onDelete,
}: CharacterCardProps) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="glass-card p-5 flex flex-col gap-4 animate-fade-in group">
      <div className="flex items-start gap-4">
        {avatar_url ? (
          <img src={avatar_url} alt={name} className="avatar" />
        ) : (
          <div className="avatar">{initial}</div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] truncate">
            {name}
          </h3>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {_count?.sessions || 0} sessions
          </p>
        </div>
      </div>

      <p className="text-sm text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
        {persona.substring(0, 150)}
        {persona.length > 150 ? "..." : ""}
      </p>

      <div className="flex gap-2 mt-auto pt-2">
        <Link
          href={`/chat/${id}`}
          className="btn-primary flex-1 text-center text-sm"
          style={{ textDecoration: "none" }}
        >
          <span>💬 Chat</span>
        </Link>
        <Link
          href={`/characters/${id}/edit`}
          className="btn-secondary text-sm px-3"
          style={{ textDecoration: "none" }}
        >
          ✏️
        </Link>
        <button
          onClick={() => {
            if (confirm(`Delete "${name}" and all their chat history?`)) {
              onDelete(id);
            }
          }}
          className="btn-danger text-sm px-3"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
