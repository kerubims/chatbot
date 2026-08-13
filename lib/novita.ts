import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const novita = createOpenAICompatible({
  name: "novita",
  apiKey: process.env.NOVITA_API_KEY,
  baseURL: "https://api.novita.ai/openai/v1",
});

// Novita Serverless API config
export const NOVITA_SERVERLESS_BASE_URL = "https://api.novita.ai/openai/v1";

// Default model — L3 8B Stheno V3.2 via Novita Serverless ($0.05/1M tokens)
export const DEFAULT_MODEL = "Sao10K/L3-8B-Stheno-v3.2";
