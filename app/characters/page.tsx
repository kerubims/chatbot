"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CharacterCard from "@/app/components/CharacterCard";

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
  persona: string;
  greeting: string;
  _count: { sessions: number };
}

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCharacters = async () => {
    try {
      const res = await fetch("/api/characters");
      const data = await res.json();
      setCharacters(data);
    } catch (err) {
      console.error("Failed to fetch characters:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharacters();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/characters/${id}`, { method: "DELETE" });
      setCharacters((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  return (
    <main className="min-h-screen p-6 md:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/"
            className="text-sm mb-2 inline-block"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            ← Home
          </Link>
          <h1
            className="text-3xl font-bold"
            style={{
              background:
                "linear-gradient(135deg, var(--accent-primary), var(--accent-pink))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            🎭 Character Hub
          </h1>
          <p className="mt-1" style={{ color: "var(--text-secondary)" }}>
            Create and manage your AI characters
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="btn-secondary"
            style={{ textDecoration: "none" }}
          >
            👤 Profile
          </Link>
          <Link
            href="/characters/new"
            className="btn-primary"
            style={{ textDecoration: "none" }}
          >
            <span>+ New Character</span>
          </Link>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div
            className="text-lg"
            style={{ color: "var(--text-muted)" }}
          >
            Loading characters...
          </div>
        </div>
      ) : characters.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-5xl mb-4">🎭</div>
          <h2 className="text-xl font-semibold mb-2">No characters yet</h2>
          <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
            Create your first AI character to start roleplaying!
          </p>
          <Link
            href="/characters/new"
            className="btn-primary inline-block"
            style={{ textDecoration: "none" }}
          >
            <span>+ Create Character</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {characters.map((character) => (
            <CharacterCard
              key={character.id}
              {...character}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </main>
  );
}
