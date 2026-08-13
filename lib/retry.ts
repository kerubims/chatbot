// ── Fetch with Retry (Exponential Backoff) ───────────────────
// Retries failed requests with exponential backoff.
// Only retries on specific status codes (429, 500, 502, 503, 504).

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;    // Base delay before first retry
  maxDelayMs: number;     // Maximum delay cap
  timeoutMs: number;      // Per-request timeout
  retryableStatuses: number[];
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  timeoutMs: 30_000,
  retryableStatuses: [429, 500, 502, 503, 504],
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config: Partial<RetryConfig> = {}
): Promise<Response> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), cfg.timeoutMs);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // If response is OK or not retryable, return immediately
      if (response.ok || !cfg.retryableStatuses.includes(response.status)) {
        return response;
      }

      // Retryable error — check if we have retries left
      if (attempt < cfg.maxRetries) {
        const delay = Math.min(
          cfg.baseDelayMs * Math.pow(2, attempt), // Exponential: 1s, 2s, 4s
          cfg.maxDelayMs
        );

        // If 429, respect Retry-After header if present
        const retryAfter = response.headers.get("Retry-After");
        const waitMs = retryAfter
          ? Math.min(parseInt(retryAfter, 10) * 1000, cfg.maxDelayMs)
          : delay;

        console.warn(
          `[Retry] Attempt ${attempt + 1}/${cfg.maxRetries} — Status ${response.status}, waiting ${waitMs}ms...`
        );
        await sleep(waitMs);
        continue;
      }

      // No retries left — return the error response
      return response;
    } catch (error: any) {
      lastError = error;

      // Don't retry on abort (timeout) if no retries left
      if (attempt < cfg.maxRetries) {
        const delay = Math.min(
          cfg.baseDelayMs * Math.pow(2, attempt),
          cfg.maxDelayMs
        );
        console.warn(
          `[Retry] Attempt ${attempt + 1}/${cfg.maxRetries} — ${error.name}: ${error.message}, waiting ${delay}ms...`
        );
        await sleep(delay);
        continue;
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error("All retry attempts failed");
}
