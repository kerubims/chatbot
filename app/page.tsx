import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center max-w-lg animate-fade-in">
        <div
          className="text-6xl mb-6"
          style={{ filter: "drop-shadow(0 0 20px var(--accent-glow))" }}
        >
          🎭
        </div>
        <h1
          className="text-4xl font-bold mb-3"
          style={{
            background: "linear-gradient(135deg, var(--accent-primary), var(--accent-pink))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Roleplay AI
        </h1>
        <p className="text-lg mb-8" style={{ color: "var(--text-secondary)" }}>
          Create custom AI characters with unique personalities.
          <br />
          Immersive conversations with contextual memory.
        </p>
        <Link
          href="/characters"
          className="btn-primary inline-block text-lg px-8 py-3"
          style={{ textDecoration: "none" }}
        >
          <span>Enter Character Hub →</span>
        </Link>
        <div className="mt-4">
          <Link
            href="/profile"
            className="text-sm"
            style={{
              color: "var(--text-muted)",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
          >
            👤 Edit Your Profile
          </Link>
        </div>
      </div>
    </main>
  );
}
