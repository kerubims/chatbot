"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function EditCharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    avatar_url: "",
    persona: "",
    greeting: "",
  });

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        const res = await fetch(`/api/characters/${id}`);
        if (res.ok) {
          const data = await res.json();
          setForm({
            name: data.name,
            avatar_url: data.avatar_url || "",
            persona: data.persona,
            greeting: data.greeting,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCharacter();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/characters/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        router.push("/characters");
      } else {
        alert("Failed to update character");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 md:p-10 max-w-3xl mx-auto">
      <Link
        href="/characters"
        className="text-sm mb-6 inline-block"
        style={{ color: "var(--text-muted)", textDecoration: "none" }}
      >
        ← Back to Characters
      </Link>

      <h1
        className="text-3xl font-bold mb-8"
        style={{
          background:
            "linear-gradient(135deg, var(--accent-primary), var(--accent-pink))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        ✏️ Edit Character
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Character Name *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input-field"
            required
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Avatar URL (optional)
          </label>
          <input
            type="url"
            value={form.avatar_url}
            onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
            className="input-field"
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Persona / System Prompt *
          </label>
          <textarea
            value={form.persona}
            onChange={(e) => setForm({ ...form, persona: e.target.value })}
            className="input-field"
            rows={8}
            required
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Greeting Message *
          </label>
          <textarea
            value={form.greeting}
            onChange={(e) => setForm({ ...form, greeting: e.target.value })}
            className="input-field"
            rows={5}
            required
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex-1"
            style={{ opacity: saving ? 0.6 : 1 }}
          >
            <span>{saving ? "Saving..." : "💾 Save Changes"}</span>
          </button>
          <Link
            href="/characters"
            className="btn-secondary"
            style={{ textDecoration: "none" }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
