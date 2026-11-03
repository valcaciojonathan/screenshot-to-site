export type AIProvider = "openai" | "anthropic" | "gemini";
export type GenerateInput = { image?: string; prompt?: string; code?: string; provider: AIProvider; apiKey?: string };
export function isProvider(value: unknown): value is AIProvider {
  return value === "openai" || value === "anthropic" || value === "gemini";
}