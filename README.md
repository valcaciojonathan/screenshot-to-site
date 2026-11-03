# Screenshot to Site

Workspace para transformar referências visuais em interfaces HTML com Tailwind CSS, streaming e refinamento por linguagem natural.

## Requisitos
- Node.js 20+
- npm
- Uma chave OpenAI, Anthropic ou Google Gemini (ou chave configurada no servidor)

## Instalação
```bash
git clone https://github.com/valcaciojonathan/screenshot-to-site.git
cd screenshot-to-site
npm install
cp .env.example .env
npm run dev
```
Abra a URL informada pelo Vite e acesse `/studio`.

## Chaves de API
Informe sua chave no painel API Key do Studio ou configure `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` ou `GEMINI_API_KEY` no servidor. As chaves de usuário são guardadas no localStorage e enviadas ao backend para a chamada ao provedor. Nunca use prefixo VITE_ para segredos.

## Recursos
- Upload por seletor, drag-and-drop e Ctrl+V/Cmd+V.
- Streaming SSE.
- Editor HTML e preview em iframe sandbox.
- Viewports 375px, 768px e 1280px.
- Refinamento do código por chat.
- OpenAI GPT-4o, Claude 3.5 Sonnet e Gemini.

## Segurança
O preview usa `sandbox="allow-scripts"` sem `allow-same-origin`. Código gerado é conteúdo não confiável. Em produção, configure autenticação, rate limiting, limites de custo, HTTPS e política de retenção. A chave enviada pelo usuário trafega pelo backend; evite registrar corpos de requisição nos logs.

## Capturas
Adicione capturas reais em `docs/screenshots/` e uma demonstração em `docs/demo.gif` após executar a aplicação. Não há imagens fictícias incluídas.

## Scripts
`npm run dev`, `npm run build`, `npm run lint`, `npm test`.