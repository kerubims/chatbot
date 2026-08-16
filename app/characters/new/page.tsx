"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const GENDER_OPTIONS = [
  "Not specified",
  "Male",
  "Female",
  "Non-binary",
  "Other",
];

export default function NewCharacterPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "advanced">("basic");
  const [form, setForm] = useState({
    name: "",
    avatar_url: "",
    gender: "Not specified",
    backstory: "",
    key_memories: "",
    scenario: "",
    response_directives: "",
    example_dialogue: "",
    greeting: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.backstory || !form.greeting) return;

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      if (data.success) {
        setForm({ ...form, avatar_url: data.url });
      } else {
        alert("Failed to upload image: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading image");
    } finally {
      setUploading(false);
      // Reset input so the same file can be uploaded again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const tabs = [
    { id: "basic" as const, label: "🎭 Basic" },
    { id: "advanced" as const, label: "⚙️ Advanced" },
  ];

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
        className="text-3xl font-bold mb-6"
        style={{
          background:
            "linear-gradient(135deg, var(--accent-primary), var(--accent-pink))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        ✨ Create New Character
      </h1>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-6 p-1 rounded-xl"
        style={{ background: "var(--bg-card)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all cursor-pointer"
            style={{
              background:
                activeTab === tab.id
                  ? "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))"
                  : "transparent",
              color:
                activeTab === tab.id ? "white" : "var(--text-secondary)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* ─── BASIC TAB ─── */}
        {activeTab === "basic" && (
          <>
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

            {/* Avatar URL & Upload */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Avatar URL (optional)
              </label>
              <div className="flex gap-2">
                {form.avatar_url && (
                  <img src={form.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-[var(--border-subtle)]" />
                )}
                <input
                  type="text"
                  value={form.avatar_url}
                  onChange={(e) =>
                    setForm({ ...form, avatar_url: e.target.value })
                  }
                  placeholder="https://example.com/avatar.png"
                  className="input-field flex-1"
                />
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap"
                  style={{
                    background: "var(--bg-card)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                    opacity: uploading ? 0.6 : 1
                  }}
                >
                  {uploading ? "Uploading..." : "📁 Upload Image"}
                </button>
              </div>
            </div>

            {/* Gender */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Gender
              </label>
              <div className="flex flex-wrap gap-2">
                {GENDER_OPTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setForm({ ...form, gender: g })}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
                    style={{
                      background:
                        form.gender === g
                          ? "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))"
                          : "var(--bg-card)",
                      color:
                        form.gender === g
                          ? "white"
                          : "var(--text-secondary)",
                      border:
                        form.gender === g
                          ? "1px solid var(--accent-primary)"
                          : "1px solid var(--border-subtle)",
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Backstory */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Backstory *
              </label>
              <p
                className="text-xs mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Core personality, history, motivations, and behavioral
                traits. This is the heart of your character.
              </p>
              <textarea
                value={form.backstory}
                onChange={(e) =>
                  setForm({ ...form, backstory: e.target.value })
                }
                placeholder={`Luna is a mysterious sorceress from an ancient magical academy. She was exiled after discovering forbidden knowledge about the nature of reality. She speaks with elegance and occasional dry wit. She is deeply knowledgeable about arcane arts and enjoys testing others through riddles and moral dilemmas. She has a scar across her left eye from a magical duel she refuses to discuss.`}
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
                The first message when starting a new conversation.
              </p>
              <textarea
                value={form.greeting}
                onChange={(e) =>
                  setForm({ ...form, greeting: e.target.value })
                }
                placeholder={`*Luna looks up from her ancient tome, her violet eyes glowing softly in the candlelight* Ah, a visitor... I don't get many of those in my tower. *She closes the book with a gentle thud* Tell me, what brings you to seek the counsel of a sorceress?`}
                className="input-field"
                rows={5}
                required
              />
            </div>
          </>
        )}

        {/* ─── ADVANCED TAB ─── */}
        {activeTab === "advanced" && (
          <>
            {/* Key Memories */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Key Memories
                <span
                  className="ml-2 text-xs font-normal"
                  style={{ color: "var(--text-muted)" }}
                >
                  (optional)
                </span>
              </label>
              <p
                className="text-xs mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Important facts that must always be remembered. Relationships,
                secrets, important events.
              </p>
              <textarea
                value={form.key_memories}
                onChange={(e) =>
                  setForm({ ...form, key_memories: e.target.value })
                }
                placeholder={`- The user saved Luna's life during the Battle of Ashenvale
- Luna secretly cares about the user but will never admit it
- Luna's favorite spell is "Stellar Cascade"
- The user's nickname is "Starfall"`}
                className="input-field"
                rows={5}
              />
            </div>

            {/* Scenario */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Current Scenario
                <span
                  className="ml-2 text-xs font-normal"
                  style={{ color: "var(--text-muted)" }}
                >
                  (optional)
                </span>
              </label>
              <p
                className="text-xs mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                The current setting, situation, or scene. Where are you? What
                is happening?
              </p>
              <textarea
                value={form.scenario}
                onChange={(e) =>
                  setForm({ ...form, scenario: e.target.value })
                }
                placeholder={`Inside Luna's tower library, late at night. Rain is pouring outside. Candles flicker casting long shadows across walls lined with ancient books. A mysterious artifact glows faintly on the desk.`}
                className="input-field"
                rows={4}
              />
            </div>

            {/* Response Directives */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Response Directives
                <span
                  className="ml-2 text-xs font-normal"
                  style={{ color: "var(--text-muted)" }}
                >
                  (optional)
                </span>
              </label>
              <p
                className="text-xs mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Rules for HOW the AI should write responses. Format, style,
                restrictions.
              </p>
              <textarea
                value={form.response_directives}
                onChange={(e) =>
                  setForm({ ...form, response_directives: e.target.value })
                }
                placeholder={`- Write in first person as Luna
- Use *asterisks* for actions and descriptions
- Never break character
- Never write dialogue or actions for the user
- Use eloquent, poetic language
- Include environmental descriptions in responses`}
                className="input-field"
                rows={5}
              />
            </div>

            {/* Example Dialogue */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Example Dialogue
                <span
                  className="ml-2 text-xs font-normal"
                  style={{ color: "var(--text-muted)" }}
                >
                  (optional)
                </span>
              </label>
              <p
                className="text-xs mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Sample conversations showing the character&apos;s tone and speech
                patterns. This teaches the AI how to &quot;sound&quot; like this character.
              </p>
              <textarea
                value={form.example_dialogue}
                onChange={(e) =>
                  setForm({ ...form, example_dialogue: e.target.value })
                }
                placeholder={`User: "Can you teach me magic?"
Luna: *raises an eyebrow, a smirk playing at the corner of her lips* Teach you? *She chuckles softly* Magic isn't taught, dear. It's awakened. The question is... *she leans closer, her violet eyes searching yours* ...do you have anything worth awakening?

User: "I brought you a gift."
Luna: *her composure cracks for just a moment, genuine surprise flickering across her face before she masks it* A gift? How... unnecessary. *She takes it carefully, her fingers lingering* Don't think this changes anything between us.`}
                className="input-field"
                rows={8}
              />
            </div>
          </>
        )}

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
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="Avatar Preview" className="avatar object-cover" />
              ) : (
                <div className="avatar">{form.name.charAt(0).toUpperCase()}</div>
              )}
              <div>
                <p className="font-semibold">{form.name}</p>
                <p
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {form.gender !== "Not specified"
                    ? form.gender + " · "
                    : ""}
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
