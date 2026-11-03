import { createFileRoute } from "@tanstack/react-router";
import { streamProvider, extractText } from "@/services/ai/providers";
import { isProvider, type GenerateInput } from "@/services/ai/types";

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let input: GenerateInput;
        try {
          input = await request.json() as GenerateInput;
        } catch {
          return new Response("JSON inválido.", { status: 400 });
        }
        if (!isProvider(input.provider)) return new Response("Provedor inválido.", { status: 400 });
        if (!input.image && !input.prompt) return new Response("Envie uma imagem ou instrução.", { status: 400 });
        if ((input.image?.length || 0) > 8_000_000) return new Response("Imagem excede o limite de 6 MB.", { status: 413 });

        const encoder = new TextEncoder();
        const abort = new AbortController();
        request.signal.addEventListener("abort", () => abort.abort(), { once: true });
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            try {
              const upstream = await streamProvider(input, abort.signal);
              const reader = upstream.body?.getReader();
              if (!reader) throw new Error("O provedor não retornou um stream.");
              const decoder = new TextDecoder();
              let buffer = "";
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";
                for (const line of lines) {
                  if (!line.startsWith("data:")) continue;
                  const raw = line.slice(5).trim();
                  if (!raw || raw === "[DONE]") continue;
                  try {
                    const delta = extractText(input.provider, JSON.parse(raw));
                    if (delta) send("token", { text: delta });
                  } catch { /* Ignore non-content provider events. */ }
                }
              }
              send("done", {});
            } catch (error) {
              send("error", { message: error instanceof Error ? error.message : "Falha na geração." });
            } finally {
              controller.close();
            }
          },
          cancel() { abort.abort(); },
        });
        return new Response(stream, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" } });
      },
    },
  },
});