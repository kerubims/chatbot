"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const GENDER_OPTIONS = [
  "Not specified",
  "Male",
  "Female",
  "Non-binary",
  "Other",
];

export default function EditCharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        const res = await fetch(`/api/characters/${id}`);
        if (res.ok) {
          const data = await res.json();
          setForm({
            name: data.name || "",
            avatar_url: data.avatar_url || "",
            gender: data.gender || "Not specified",
            backstory: data.backstory || data.persona || "",
            key_memories: data.key_memories || "",
            scenario: data.scenario || "",
            response_directives: data.response_directives || "",
            example_dialogue: data.example_dialogue || "",
            greeting: data.greeting || "",
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

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </main>
    );
  }

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
        ✏️ Edit Character
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
                Core personality, history, motivations, and behavioral traits.
              </p>
              <textarea
                value={form.backstory}
                onChange={(e) =>
                  setForm({ ...form, backstory: e.target.value })
                }
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
              <textarea
                value={form.greeting}
                onChange={(e) =>
                  setForm({ ...form, greeting: e.target.value })
                }
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
                Important facts that must always be remembered.
              </p>
              <textarea
                value={form.key_memories}
                onChange={(e) =>
                  setForm({ ...form, key_memories: e.target.value })
                }
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
                The current setting, situation, or scene.
              </p>
              <textarea
                value={form.scenario}
                onChange={(e) =>
                  setForm({ ...form, scenario: e.target.value })
                }
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
                Rules for HOW the AI should write responses.
              </p>
              <textarea
                value={form.response_directives}
                onChange={(e) =>
                  setForm({ ...form, response_directives: e.target.value })
                }
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
                Sample conversations showing tone and speech patterns.
              </p>
              <textarea
                value={form.example_dialogue}
                onChange={(e) =>
                  setForm({ ...form, example_dialogue: e.target.value })
                }
                className="input-field"
                rows={8}
              />
            </div>
          </>
        )}

        {/* Submit */}
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
