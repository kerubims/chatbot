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
  const [showGenerator, setShowGenerator] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<{ prompt_tokens: number, completion_tokens: number, total_tokens: number } | null>(null);

  // Field-specific generation state
  const [generatingFields, setGeneratingFields] = useState<Record<string, boolean>>({});
  const [fieldTokens, setFieldTokens] = useState<Record<string, { prompt_tokens: number, completion_tokens: number, total_tokens: number }>>({});
  
  const [genForm, setGenForm] = useState({
    role: "",
    age: "",
    background: "",
    personality: "",
  });

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
    if (!form.name || !form.greeting) {
      alert("Please provide at least a Name and a Greeting Message.");
      return;
    }

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
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to create character: ${errData.error || "Unknown error"}`);
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

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/characters/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(genForm),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.characterData) {
          setForm((prev) => ({
            ...prev,
            ...data.characterData,
          }));
          if (data.usage) {
            setTokenUsage(data.usage);
          }
          setShowGenerator(false); // Hide generator after success
        } else {
          alert(`Failed to parse character: ${data.error || "Unknown Error"}`);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to generate character: ${errData.error || res.statusText}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error generating character: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateField = async (field: keyof typeof form) => {
    setGeneratingFields((prev) => ({ ...prev, [field]: true }));
    try {
      const res = await fetch("/api/characters/generate-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, context: form }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.content) {
          setForm((prev) => ({ ...prev, [field]: data.content }));
        }
        if (data.usage) {
          setFieldTokens((prev) => ({ ...prev, [field]: data.usage }));
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to generate ${field}: ${errData.error || res.statusText}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error generating ${field}: ${err.message}`);
    } finally {
      setGeneratingFields((prev) => ({ ...prev, [field]: false }));
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

      {/* AI Generator Toggle */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setShowGenerator(!showGenerator)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all w-full md:w-auto justify-center"
          style={{
            background: showGenerator ? "var(--bg-card)" : "linear-gradient(135deg, rgba(167, 139, 250, 0.15), rgba(236, 72, 153, 0.15))",
            color: "var(--text-primary)",
            border: showGenerator ? "1px solid var(--border-subtle)" : "1px solid rgba(167, 139, 250, 0.3)",
          }}
        >
          <span>🪄</span> {showGenerator ? "Hide Character Generator" : "AI Character Generator"}
        </button>
      </div>

      {/* AI Generator Form */}
      {showGenerator && (
        <div className="mb-8 p-5 rounded-2xl animate-fade-in border border-[#a78bfa]/20 shadow-[0_0_15px_rgba(167,139,250,0.05)]" style={{ background: "rgba(167, 139, 250, 0.03)" }}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-semibold text-[var(--accent-primary)] flex items-center gap-2">
                🪄 Magic Generator
              </h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Fill in what you want, leave the rest blank. The AI will create a complete character suitable for deep/NSFW roleplay.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-[var(--text-secondary)]">Role / Concept</label>
              <input
                type="text"
                value={genForm.role}
                onChange={(e) => setGenForm({ ...genForm, role: e.target.value })}
                placeholder="e.g. Strict librarian, Space Pirate"
                className="input-field text-sm py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-[var(--text-secondary)]">Age / Appearance</label>
              <input
                type="text"
                value={genForm.age}
                onChange={(e) => setGenForm({ ...genForm, age: e.target.value })}
                placeholder="e.g. 20s, tall and imposing"
                className="input-field text-sm py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1.5 text-[var(--text-secondary)]">Background Story</label>
              <textarea
                value={genForm.background}
                onChange={(e) => setGenForm({ ...genForm, background: e.target.value })}
                placeholder="e.g. Exiled from her kingdom after a forbidden ritual..."
                className="input-field text-sm py-2"
                rows={2}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1.5 text-[var(--text-secondary)]">Personality Traits</label>
              <input
                type="text"
                value={genForm.personality}
                onChange={(e) => setGenForm({ ...genForm, personality: e.target.value })}
                placeholder="e.g. Cold exterior but secretly needy, dominant, intelligent"
                className="input-field text-sm py-2"
              />
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-2.5 rounded-xl font-semibold transition-all flex justify-center items-center gap-2"
            style={{
              background: "linear-gradient(135deg, var(--accent-primary), var(--accent-pink))",
              color: "white",
              opacity: isGenerating ? 0.7 : 1,
            }}
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Details...
              </>
            ) : (
              "Generate Character Details"
            )}
          </button>
        </div>
      )}

      {/* Token Usage Display */}
      {tokenUsage && !showGenerator && (
        <div className="mb-6 p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] flex items-center justify-between text-sm animate-fade-in">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span>🪙</span>
            <span>AI Generation Cost:</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[var(--text-muted)]">
            <span title="Prompt Tokens">P: {tokenUsage.prompt_tokens}</span>
            <span title="Completion Tokens">C: {tokenUsage.completion_tokens}</span>
            <span className="text-[var(--accent-primary)] font-semibold" title="Total Tokens">
              Total: {tokenUsage.total_tokens}
            </span>
          </div>
        </div>
      )}

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
              <div className="flex items-center justify-between mb-2">
                <label
                  className="block text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Backstory *
                </label>
                <button
                  type="button"
                  onClick={() => handleGenerateField("backstory")}
                  disabled={generatingFields["backstory"]}
                  className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors"
                  style={{ 
                    background: "rgba(167, 139, 250, 0.1)", 
                    color: "var(--accent-primary)",
                    opacity: generatingFields["backstory"] ? 0.5 : 1
                  }}
                  title="Auto-generate this field based on other inputs"
                >
                  {generatingFields["backstory"] ? (
                    <span className="animate-pulse">Generating...</span>
                  ) : (
                    <>🪄 <span className="hidden sm:inline">AI Assist</span></>
                  )}
                </button>
              </div>
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
              />
              {fieldTokens["backstory"] && (
                <div className="text-[10px] text-right mt-1 font-mono animate-fade-in" style={{ color: "var(--text-muted)" }}>
                  Token Usage: {fieldTokens["backstory"].total_tokens} (P:{fieldTokens["backstory"].prompt_tokens} C:{fieldTokens["backstory"].completion_tokens})
                </div>
              )}
            </div>

            {/* Greeting */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  className="block text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Greeting Message *
                </label>
                <button
                  type="button"
                  onClick={() => handleGenerateField("greeting")}
                  disabled={generatingFields["greeting"]}
                  className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors"
                  style={{ 
                    background: "rgba(167, 139, 250, 0.1)", 
                    color: "var(--accent-primary)",
                    opacity: generatingFields["greeting"] ? 0.5 : 1
                  }}
                  title="Auto-generate this field based on other inputs"
                >
                  {generatingFields["greeting"] ? (
                    <span className="animate-pulse">Generating...</span>
                  ) : (
                    <>🪄 <span className="hidden sm:inline">AI Assist</span></>
                  )}
                </button>
              </div>
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
              {fieldTokens["greeting"] && (
                <div className="text-[10px] text-right mt-1 font-mono animate-fade-in" style={{ color: "var(--text-muted)" }}>
                  Token Usage: {fieldTokens["greeting"].total_tokens} (P:{fieldTokens["greeting"].prompt_tokens} C:{fieldTokens["greeting"].completion_tokens})
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── ADVANCED TAB ─── */}
        {activeTab === "advanced" && (
          <>
            {/* Key Memories */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  className="block text-sm font-medium"
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
                <button
                  type="button"
                  onClick={() => handleGenerateField("key_memories")}
                  disabled={generatingFields["key_memories"]}
                  className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors"
                  style={{ 
                    background: "rgba(167, 139, 250, 0.1)", 
                    color: "var(--accent-primary)",
                    opacity: generatingFields["key_memories"] ? 0.5 : 1
                  }}
                  title="Auto-generate this field based on other inputs"
                >
                  {generatingFields["key_memories"] ? (
                    <span className="animate-pulse">Generating...</span>
                  ) : (
                    <>🪄 <span className="hidden sm:inline">AI Assist</span></>
                  )}
                </button>
              </div>
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
              {fieldTokens["key_memories"] && (
                <div className="text-[10px] text-right mt-1 font-mono animate-fade-in" style={{ color: "var(--text-muted)" }}>
                  Token Usage: {fieldTokens["key_memories"].total_tokens} (P:{fieldTokens["key_memories"].prompt_tokens} C:{fieldTokens["key_memories"].completion_tokens})
                </div>
              )}
            </div>

            {/* Scenario */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  className="block text-sm font-medium"
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
                <button
                  type="button"
                  onClick={() => handleGenerateField("scenario")}
                  disabled={generatingFields["scenario"]}
                  className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors"
                  style={{ 
                    background: "rgba(167, 139, 250, 0.1)", 
                    color: "var(--accent-primary)",
                    opacity: generatingFields["scenario"] ? 0.5 : 1
                  }}
                  title="Auto-generate this field based on other inputs"
                >
                  {generatingFields["scenario"] ? (
                    <span className="animate-pulse">Generating...</span>
                  ) : (
                    <>🪄 <span className="hidden sm:inline">AI Assist</span></>
                  )}
                </button>
              </div>
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
              {fieldTokens["scenario"] && (
                <div className="text-[10px] text-right mt-1 font-mono animate-fade-in" style={{ color: "var(--text-muted)" }}>
                  Token Usage: {fieldTokens["scenario"].total_tokens} (P:{fieldTokens["scenario"].prompt_tokens} C:{fieldTokens["scenario"].completion_tokens})
                </div>
              )}
            </div>

            {/* Response Directives */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  className="block text-sm font-medium"
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
                <button
                  type="button"
                  onClick={() => handleGenerateField("response_directives")}
                  disabled={generatingFields["response_directives"]}
                  className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors"
                  style={{ 
                    background: "rgba(167, 139, 250, 0.1)", 
                    color: "var(--accent-primary)",
                    opacity: generatingFields["response_directives"] ? 0.5 : 1
                  }}
                  title="Auto-generate this field based on other inputs"
                >
                  {generatingFields["response_directives"] ? (
                    <span className="animate-pulse">Generating...</span>
                  ) : (
                    <>🪄 <span className="hidden sm:inline">AI Assist</span></>
                  )}
                </button>
              </div>
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
              {fieldTokens["response_directives"] && (
                <div className="text-[10px] text-right mt-1 font-mono animate-fade-in" style={{ color: "var(--text-muted)" }}>
                  Token Usage: {fieldTokens["response_directives"].total_tokens} (P:{fieldTokens["response_directives"].prompt_tokens} C:{fieldTokens["response_directives"].completion_tokens})
                </div>
              )}
            </div>

            {/* Example Dialogue */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  className="block text-sm font-medium"
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
                <button
                  type="button"
                  onClick={() => handleGenerateField("example_dialogue")}
                  disabled={generatingFields["example_dialogue"]}
                  className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors"
                  style={{ 
                    background: "rgba(167, 139, 250, 0.1)", 
                    color: "var(--accent-primary)",
                    opacity: generatingFields["example_dialogue"] ? 0.5 : 1
                  }}
                  title="Auto-generate this field based on other inputs"
                >
                  {generatingFields["example_dialogue"] ? (
                    <span className="animate-pulse">Generating...</span>
                  ) : (
                    <>🪄 <span className="hidden sm:inline">AI Assist</span></>
                  )}
                </button>
              </div>
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
              {fieldTokens["example_dialogue"] && (
                <div className="text-[10px] text-right mt-1 font-mono animate-fade-in" style={{ color: "var(--text-muted)" }}>
                  Token Usage: {fieldTokens["example_dialogue"].total_tokens} (P:{fieldTokens["example_dialogue"].prompt_tokens} C:{fieldTokens["example_dialogue"].completion_tokens})
                </div>
              )}
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
