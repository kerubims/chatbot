"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface UserProfile {
  id: string;
  display_name: string;
  gender: string;
  persona: string;
  response_style: string;
}

const GENDER_OPTIONS = [
  "Not specified",
  "Male",
  "Female",
  "Non-binary",
  "Other",
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
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
        <p style={{ color: "var(--text-muted)" }}>Loading profile...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p style={{ color: "var(--text-muted)" }}>
          Failed to load profile.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 md:p-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <Link
          href="/characters"
          className="text-sm mb-2 inline-block"
          style={{ color: "var(--text-muted)", textDecoration: "none" }}
        >
          ← Back to Characters
        </Link>
        <h1
          className="text-3xl font-bold"
          style={{
            background:
              "linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          👤 Your Profile
        </h1>
        <p className="mt-1" style={{ color: "var(--text-secondary)" }}>
          Tell the AI who you are. This information is sent with every
          conversation so characters can address you properly.
        </p>
      </div>

      {/* Form */}
      <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="flex flex-col gap-6">
          {/* Display Name */}
          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              Display Name
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="What should AI characters call you?"
              value={profile.display_name}
              onChange={(e) =>
                setProfile({ ...profile, display_name: e.target.value })
              }
            />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Characters will use this name to address you in conversations.
            </p>
          </div>

          {/* Gender */}
          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              Gender
            </label>
            <div className="flex flex-wrap gap-2">
              {GENDER_OPTIONS.map((g) => (
                <button
                  key={g}
                  onClick={() => setProfile({ ...profile, gender: g })}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
                  style={{
                    background:
                      profile.gender === g
                        ? "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))"
                        : "var(--bg-card)",
                    color:
                      profile.gender === g
                        ? "white"
                        : "var(--text-secondary)",
                    border:
                      profile.gender === g
                        ? "1px solid var(--accent-primary)"
                        : "1px solid var(--border-subtle)",
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Helps AI use correct pronouns when referring to you.
            </p>
          </div>

          {/* Persona */}
          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              Your Persona
              <span
                className="ml-2 text-xs font-normal"
                style={{ color: "var(--text-muted)" }}
              >
                (optional)
              </span>
            </label>
            <textarea
              className="input-field"
              rows={5}
              placeholder={"Describe who you are in the roleplay world.\nExample: \"A lone wanderer traveling through ancient lands, seeking forgotten knowledge. Quiet and observant, but fiercely protective of allies.\""}
              value={profile.persona}
              onChange={(e) =>
                setProfile({ ...profile, persona: e.target.value })
              }
            />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Your character identity in the RP world. Leave blank to be
              &quot;yourself&quot;.
            </p>
          </div>

          {/* Response Style */}
          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              Response Style Preference
              <span
                className="ml-2 text-xs font-normal"
                style={{ color: "var(--text-muted)" }}
              >
                (optional)
              </span>
            </label>
            <textarea
              className="input-field"
              rows={4}
              placeholder={"How do you want AI to respond?\nExample: \"Write long, descriptive paragraphs. Use *asterisks* for actions. Never break character. Always stay in first person.\""}
              value={profile.response_style}
              onChange={(e) =>
                setProfile({ ...profile, response_style: e.target.value })
              }
            />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Global instructions that apply to ALL characters. For
              character-specific rules, use the character&apos;s &quot;Response
              Directives&quot; field.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary px-8"
              style={{ opacity: saving ? 0.6 : 1 }}
            >
              <span>{saving ? "Saving..." : "💾 Save Profile"}</span>
            </button>
            {saved && (
              <span
                className="text-sm font-medium animate-fade-in"
                style={{ color: "#22c55e" }}
              >
                ✓ Profile saved successfully!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div
        className="mt-6 p-4 rounded-xl animate-fade-in"
        style={{
          animationDelay: "0.2s",
          background: "rgba(139, 92, 246, 0.08)",
          border: "1px solid rgba(139, 92, 246, 0.2)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--accent-primary)" }}>💡 Pro Tip:</strong>{" "}
          The more detailed your persona, the more immersive the roleplay. AI
          characters will react to your described traits, background, and
          preferences — making every conversation feel unique and personal.
        </p>
      </div>
    </main>
  );
}
