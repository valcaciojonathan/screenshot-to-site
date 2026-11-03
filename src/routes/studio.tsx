import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Code2, ImagePlus, Monitor, Smartphone, Tablet, Send, KeyRound, LoaderCircle, X, Sparkles, Copy, Check } from "lucide-react";
import type { AIProvider } from "@/services/ai/types";

export const Route = createFileRoute("/studio")({ component: Studio, head: () => ({ meta: [{ title: "Screenshot to Site — Studio" }] }) });

type Device = "mobile" | "tablet" | "desktop";
const widths: Record<Device, number> = { mobile: 375, tablet: 768, desktop: 1280 };
const initialCode = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <title>Seu projeto</title>
</head>
<body class="min-h-screen bg-slate-950 text-white">
  <main class="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
    <span class="mb-4 rounded-full border border-cyan-400/30 px-4 py-2 text-xs uppercase tracking-widest text-cyan-300">Seu próximo projeto</span>
    <h1 class="text-5xl font-bold tracking-tight md:text-7xl">Transforme imagens em código.</h1>
    <p class="mt-6 max-w-xl text-lg text-slate-400">Envie uma referência visual e deixe a IA construir a primeira versão da sua interface.</p>
  </main>
</body>
</html>`;

function Studio() {
  const [image, setImage] = useState<string>();
  const [code, setCode] = useState(initialCode);
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [device, setDevice] = useState<Device>("desktop");
  const [apiKey, setApiKey] = useState(() => typeof window === "undefined" ? "" : localStorage.getItem("s2s-api-key") || "");
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Pronto para criar");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [dragging, setDragging] = useState(false);

  const loadFile = useCallback((file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setStatus("Selecione um arquivo de imagem."); return; }
    if (file.size > 6 * 1024 * 1024) { setStatus("A imagem deve ter até 6 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => { setImage(String(reader.result)); setStatus("Imagem carregada"); };
    reader.readAsDataURL(file);
  }, []);

  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.items || []).find(item => item.type.startsWith("image/"))?.getAsFile();
      if (file) { event.preventDefault(); loadFile(file); }
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, [loadFile]);

  const generate = async (refinement?: string) => {
    if (busy) return;
    if (!image && !refinement) { setStatus("Envie uma imagem para começar."); return; }
    setBusy(true);
    setStatus("Conectando ao provedor...");
    const controller = new AbortController();
    try {
      const response = await fetch("/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image: refinement ? undefined : image, prompt: refinement || prompt || undefined, code: refinement ? code : undefined, provider, apiKey: apiKey || undefined }), signal: controller.signal });
      if (!response.ok || !response.body) throw new Error(await response.text() || "Não foi possível iniciar a geração.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let generated = refinement ? "" : "";
      setStatus("Gerando código em tempo real...");
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        for (const event of events) {
          const dataLine = event.split("\n").find(line => line.startsWith("data:"));
          if (!dataLine) continue;
          const data = JSON.parse(dataLine.slice(5)) as { text?: string; message?: string };
          if (event.includes("event: error")) throw new Error(data.message || "Erro do provedor.");
          if (data.text) { generated += data.text; setCode(generated); }
          if (event.includes("event: done")) setStatus("Geração concluída");
        }
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro inesperado");
    } finally { setBusy(false); }
  };

  const saveKey = () => { localStorage.setItem("s2s-api-key", apiKey.trim()); setShowKey(false); setStatus("Chave salva neste navegador"); };
  const copyCode = async () => { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1500); };

  return (
    <main className="min-h-screen bg-[#090b10] text-slate-100">
      <header className="flex h-16 items-center justify-between border-b border-white/10 px-4 md:px-7">
        <a href="/" className="flex items-center gap-3 font-semibold tracking-tight"><span className="grid size-9 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><Code2 size={19}/></span> Screenshot<span className="text-cyan-300">to</span>Site <span className="ml-1 rounded-md border border-white/10 px-2 py-1 text-[10px] uppercase tracking-widest text-slate-500">Studio</span></a>
        <div className="flex items-center gap-2">
          <select value={provider} onChange={e => setProvider(e.target.value as AIProvider)} className="h-9 rounded-lg border border-white/10 bg-[#11151e] px-3 text-xs outline-none"><option value="openai">OpenAI · GPT-4o</option><option value="anthropic">Anthropic · Claude 3.5</option><option value="gemini">Google · Gemini</option></select>
          <button onClick={() => setShowKey(v => !v)} className="flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-slate-300 hover:bg-white/5"><KeyRound size={14}/> API Key</button>
        </div>
      </header>

      {showKey && <div className="border-b border-cyan-400/20 bg-cyan-400/5 px-4 py-3"><div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3"><KeyRound size={16} className="text-cyan-300"/><input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Cole sua API key (armazenada apenas neste navegador)" className="min-w-[220px] flex-1 bg-transparent text-sm outline-none placeholder:text-slate-600"/><button onClick={saveKey} className="rounded-lg bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950">Salvar localmente</button><button onClick={() => {localStorage.removeItem("s2s-api-key");setApiKey("");setShowKey(false);}} className="text-xs text-slate-500">Remover</button></div></div>}

      <div className="mx-auto max-w-[1800px] p-4 md:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.25em] text-cyan-300">Workspace / 01</p><h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Image to interface</h1><p className="mt-1 text-sm text-slate-500">Envie uma referência, gere o HTML e refine o resultado.</p></div><span className="text-xs text-slate-500">{status}</span></div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0e121a]">
            <div className="flex h-12 items-center justify-between border-b border-white/10 px-4"><div className="flex items-center gap-2 text-sm font-medium"><Code2 size={15} className="text-cyan-300"/> Código HTML</div><button onClick={copyCode} className="flex items-center gap-2 text-xs text-slate-400 hover:text-white">{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? "Copiado" : "Copiar"}</button></div>
            <div className="relative h-[560px] bg-[#090c12]"><div className="pointer-events-none absolute left-0 top-0 h-full w-12 border-r border-white/5 bg-[#0c1017] pt-4 text-right font-mono text-[11px] leading-6 text-slate-600">{Array.from({length:Math.max(30,code.split("\n").length)},(_,i)=><div key={i} className="pr-3">{i+1}</div>)}</div><textarea ref={editorRef} value={code} onChange={e=>setCode(e.target.value)} spellCheck={false} className="relative h-full w-full resize-none bg-transparent py-4 pl-16 pr-4 font-mono text-[12px] leading-6 text-cyan-50 outline-none selection:bg-cyan-500/30" /></div>
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-[11px] text-slate-500"><span>HTML · {code.split("\n").length} linhas</span><span>Editor ao vivo</span></div>
          </section>

          <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0e121a]">
            <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2"><div className="flex items-center gap-2 text-sm font-medium"><Monitor size={15} className="text-cyan-300"/> Preview</div><div className="flex gap-1 rounded-lg bg-black/30 p-1">{([["mobile",Smartphone],["tablet",Tablet],["desktop",Monitor]] as const).map(([key,Icon])=><button key={key} onClick={()=>setDevice(key)} title={key} className={`rounded-md p-2 ${device===key?"bg-cyan-400 text-slate-950":"text-slate-400 hover:bg-white/5"}`}><Icon size={15}/></button>)}</div></div>
            <div className="flex min-h-[560px] items-start justify-center overflow-auto bg-[radial-gradient(#283244_1px,transparent_1px)] [background-size:18px_18px] p-4"><div className="h-[520px] max-w-full overflow-hidden rounded-xl bg-white shadow-2xl transition-[width] duration-300" style={{width:widths[device]}}><iframe title="Preview da página gerada" sandbox="allow-scripts" srcDoc={code} className="h-full w-full border-0"/></div></div>
            <div className="border-t border-white/10 p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold text-slate-300">Refinar com IA</span><span className="text-[10px] text-slate-600">O código atual será enviado como contexto</span></div><form onSubmit={e=>{e.preventDefault();const value=prompt.trim();if(value){setPrompt("");void generate(value);}}} className="flex gap-2"><input value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Ex.: adicione um rodapé escuro..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#090c12] px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan-400/50"/><button disabled={busy||!prompt.trim()} className="grid size-11 shrink-0 place-items-center rounded-xl bg-cyan-400 text-slate-950 transition hover:bg-cyan-300 disabled:opacity-40">{busy?<LoaderCircle className="animate-spin" size={17}/>:<Send size={17}/>}</button></form></div>
          </section>
        </div>

        <section onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);loadFile(e.dataTransfer.files[0]);}} className={`mt-4 rounded-2xl border border-dashed p-5 transition ${dragging?"border-cyan-300 bg-cyan-300/10":"border-white/15 bg-[#0e121a]"}`}>
          <div className="flex flex-wrap items-center gap-4"><div className="grid size-11 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><ImagePlus size={20}/></div><div className="min-w-[180px] flex-1"><p className="text-sm font-medium">{image?"Imagem de referência carregada":"Adicione uma imagem de referência"}</p><p className="mt-1 text-xs text-slate-500">Arraste, selecione um arquivo ou cole com Ctrl+V / Cmd+V · PNG, JPG, WEBP · até 6 MB</p></div>{image&&<button onClick={()=>setImage(undefined)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"><X size={14}/> Remover</button>}<input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e=>loadFile(e.target.files?.[0])}/><button onClick={()=>inputRef.current?.click()} className="rounded-lg border border-white/15 px-4 py-2.5 text-xs font-semibold hover:bg-white/5">Escolher arquivo</button><button onClick={()=>void generate()} disabled={busy||!image} className="flex items-center gap-2 rounded-lg bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-40">{busy?<LoaderCircle size={15} className="animate-spin"/>:<Sparkles size={15}/>} Gerar interface</button></div>
          {image&&<img src={image} alt="Referência enviada" className="mt-4 max-h-40 rounded-lg border border-white/10 object-contain"/>}
        </section>
      </div>
    </main>
  );
}