import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const novita = createOpenAICompatible({
  name: "novita",
  apiKey: process.env.NOVITA_API_KEY,
  baseURL: "https://api.novita.ai/openai/v1",
});

// Default model — L3 8B Lunaris (uncensored, cheapest at $0.05/1M tokens)
export const DEFAULT_MODEL = "sao10k/l3-8b-lunaris";
