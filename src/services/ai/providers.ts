import { SYSTEM_PROMPT } from "./prompts";
import type { AIProvider, GenerateInput } from "./types";
const models = { openai: "gpt-4o", anthropic: "claude-3-5-sonnet-20241022", gemini: "gemini-2.0-flash" };
export async function requestProvider(input: GenerateInput, signal: AbortSignal) {
 const key = input.apiKey || (input.provider === "openai" ? process.env.OPENAI_API_KEY : input.provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : process.env.GEMINI_API_KEY);
 if (!key) throw new Error("Configure uma API key.");
 const instruction = input.code ? `HTML atual:\n${input.code}\n\nAlterações solicitadas:\n${input.prompt}\nRetorne o HTML completo atualizado.` : input.prompt || "Recrie a imagem enviada.";
 const headers: Record<string,string> = { "content-type":"application/json" }; let url = ""; let body: unknown;
 if(input.provider==="openai") {
  url="https://api.openai.com/v1/chat/completions"; headers.authorization=`Bearer ${key}`;
  const content: unknown[]=[{type:"text",text:instruction}]; if(input.image) content.push({type:"image_url",image_url:{url:input.image}});
  body={model:models.openai,stream:true,messages:[{role:"system",content:SYSTEM_PROMPT},{role:"user",content}]};
 } else if(input.provider==="anthropic") {
  url="https://api.anthropic.com/v1/messages"; headers["x-api-key"]=key; headers["anthropic-version"]="2023-06-01";
  const content: unknown[]=[]; if(input.image){const m=input.image.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/);if(!m)throw new Error("Imagem inválida.");content.push({type:"image",source:{type:"base64",media_type:m[1],data:m[2]}});}
  content.push({type:"text",text:instruction}); body={model:models.anthropic,max_tokens:8192,stream:true,system:SYSTEM_PROMPT,messages:[{role:"user",content}]};
 } else {
  url=`https://generativelanguage.googleapis.com/v1beta/models/${models.gemini}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`;
  const parts: unknown[]=[{text:SYSTEM_PROMPT+"\n"+instruction}]; if(input.image){const m=input.image.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/);if(!m)throw new Error("Imagem inválida.");parts.push({inline_data:{mime_type:m[1],data:m[2]}});}
  body={contents:[{parts}],generationConfig:{temperature:.2}};
 }
 const response=await fetch(url,{method:"POST",headers,body:JSON.stringify(body),signal}); if(!response.ok)throw new Error(`Erro ${response.status}: ${(await response.text()).slice(0,300)}`); return response;
}
export function readDelta(provider:AIProvider,p:Record<string,any>):string {
 if(provider==="openai")return p.choices?.[0]?.delta?.content||"";
 if(provider==="anthropic")return p.type==="content_block_delta"?p.delta?.text||"":"";
 return p.candidates?.[0]?.content?.parts?.map((x:{text?:string})=>x.text||"").join("")||"";
}