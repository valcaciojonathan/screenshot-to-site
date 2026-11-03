export type AIProvider = "openai" | "anthropic" | "gemini";
export type GenerateInput = { provider: AIProvider; image?: string; prompt?: string; code?: string; apiKey?: string };
export const isProvider = (v: unknown): v is AIProvider => v === "openai" || v === "anthropic" || v === "gemini";