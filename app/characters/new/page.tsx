"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewCharacterPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    avatar_url: "",
    persona: "",
    greeting: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.persona || !form.greeting) return;

    setSaving(true);
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        router.push("/characters");
      } else {
        alert("Failed to create character");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating character");
    } finally {
      setSaving(false);
    }
  };

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
        ✨ Create New Character
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Name */}
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
            placeholder="e.g. Luna, the mysterious sorceress"
            className="input-field"
            required
          />
        </div>

        {/* Avatar URL */}
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
            placeholder="https://example.com/avatar.png"
            className="input-field"
          />
        </div>

        {/* Persona */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Persona / System Prompt *
          </label>
          <p
            className="text-xs mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            Define the character&apos;s personality, background, speech style, and
            behavior. This is the secret instruction that shapes the AI&apos;s
            responses.
          </p>
          <textarea
            value={form.persona}
            onChange={(e) => setForm({ ...form, persona: e.target.value })}
            placeholder={`You are Luna, a mysterious sorceress from an ancient magical academy. You speak with elegance and occasional wit. You use *asterisks* to describe your actions and environment. You are deeply knowledgeable about arcane arts and enjoy teaching through riddles...`}
            className="input-field"
            rows={8}
            required
          />
        </div>

        {/* Greeting */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Greeting Message *
          </label>
          <p
            className="text-xs mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            The first message from the character when starting a new
            conversation.
          </p>
          <textarea
            value={form.greeting}
            onChange={(e) => setForm({ ...form, greeting: e.target.value })}
            placeholder={`*Luna looks up from her ancient tome, her violet eyes glowing softly in the candlelight* Ah, a visitor... I don't get many of those in my tower. *She closes the book with a gentle thud* Tell me, what brings you to seek the counsel of a sorceress?`}
            className="input-field"
            rows={5}
            required
          />
        </div>

        {/* Preview */}
        {form.name && (
          <div className="glass-card p-5">
            <h3
              className="text-sm font-semibold mb-3"
              style={{ color: "var(--text-muted)" }}
            >
              PREVIEW
            </h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="avatar">{form.name.charAt(0).toUpperCase()}</div>
              <div>
                <p className="font-semibold">{form.name}</p>
                <p
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  AI Character
                </p>
              </div>
            </div>
            {form.greeting && (
              <div className="chat-bubble-assistant text-sm">
                {form.greeting.substring(0, 200)}
                {form.greeting.length > 200 ? "..." : ""}
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex-1"
            style={{ opacity: saving ? 0.6 : 1 }}
          >
            <span>{saving ? "Creating..." : "🎭 Create Character"}</span>
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
