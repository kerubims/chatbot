// ── Sliding Window Rate Limiter (in-memory) ──────────────────
// Limits requests per IP address using a sliding window algorithm.
// Suitable for single-instance deployments (e.g. Vercel serverless).

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitConfig {
  windowMs: number;   // Time window in milliseconds
  maxRequests: number; // Max requests allowed in window
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp when the window resets
}

const store = new Map<string, RateLimitEntry>();

// Auto-cleanup expired entries every 60 seconds
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanup(windowMs: number) {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      // Remove timestamps older than the window
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 60_000);
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig = { windowMs: 60_000, maxRequests: 10 }
): RateLimitResult {
  const { windowMs, maxRequests } = config;
  const now = Date.now();

  startCleanup(windowMs);

  let entry = store.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(identifier, entry);
  }

  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    // Rate limited — calculate when earliest request expires
    const oldestInWindow = entry.timestamps[0];
    const resetAt = oldestInWindow + windowMs;
    return {
      success: false,
      remaining: 0,
      resetAt,
    };
  }

  // Allow request
  entry.timestamps.push(now);
  return {
    success: true,
    remaining: maxRequests - entry.timestamps.length,
    resetAt: now + windowMs,
  };
}
