import { SYSTEM_PROMPT } from "./prompts";
import type { AIProvider, GenerateInput } from "./types";

type ProviderConfig = { endpoint: string; model: string };
const config: Record<AIProvider, ProviderConfig> = {
  openai: { endpoint: "https://api.openai.com/v1/chat/completions", model: "gpt-4o" },
  anthropic: { endpoint: "https://api.anthropic.com/v1/messages", model: "claude-3-5-sonnet-20241022" },
  gemini: { endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse", model: "gemini-2.0-flash" },
};

export async function streamProvider(input: GenerateInput, signal: AbortSignal): Promise<Response> {
  const key = input.apiKey || (input.provider === "openai" ? process.env.OPENAI_API_KEY : input.provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : process.env.GEMINI_API_KEY);
  if (!key) throw new Error("Configure uma API key nas configurações ou no servidor.");
  const instruction = input.code
    ? `Current HTML:\n${input.code}\n\nRequested changes:\n${input.prompt || "Improve the page"}\nReturn the complete updated HTML.`
    : input.prompt || "Recreate the uploaded screenshot.";
  const imageUrl = input.image;
  const headers: Record<string, string> = { "content-type": "application/json" };
  let url = config[input.provider].endpoint;
  let body: unknown;

  if (input.provider === "openai") {
    headers.authorization = `Bearer ${key}`;
    const content: unknown[] = [{ type: "text", text: instruction }];
    if (imageUrl) content.push({ type: "image_url", image_url: { url: imageUrl } });
    body = { model: config.openai.model, stream: true, messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content }] };
  } else if (input.provider === "anthropic") {
    headers["x-api-key"] = key;
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-dangerous-direct-browser-access"] = "false";
    const content: unknown[] = [];
    if (imageUrl) {
      const match = imageUrl.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/);
      if (!match) throw new Error("Imagem inválida.");
      content.push({ type: "image", source: { type: "base64", media_type: match[1], data: match[2] } });
    }
    content.push({ type: "text", text: instruction });
    body = { model: config.anthropic.model, max_tokens: 8192, stream: true, system: SYSTEM_PROMPT, messages: [{ role: "user", content }] };
  } else {
    url += `&key=${encodeURIComponent(key)}`;
    const parts: unknown[] = [{ text: `${SYSTEM_PROMPT}\n\n${instruction}` }];
    if (imageUrl) {
      const match = imageUrl.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/);
      if (!match) throw new Error("Imagem inválida.");
      parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
    }
    body = { contents: [{ parts }], generationConfig: { temperature: 0.2 } };
  }

  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Provedor ${input.provider} retornou ${response.status}: ${detail.slice(0, 400)}`);
  }
  return response;
}

export function extractText(provider: AIProvider, payload: unknown): string {
  const data = payload as Record<string, any>;
  if (provider === "openai") return data.choices?.[0]?.delta?.content || "";
  if (provider === "anthropic") return data.type === "content_block_delta" ? data.delta?.text || "" : "";
  return data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || "";
}