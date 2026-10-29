import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de privacidade — Tanjiro Puffs" },
      { name: "description", content: "Como a Tanjiro Puffs coleta, usa e protege seus dados pessoais conforme a LGPD." },
      { property: "og:title", content: "Política de privacidade — Tanjiro Puffs" },
      { property: "og:description", content: "Seus dados protegidos conforme a LGPD." },
    ],
  }),
  component: () => (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-14 text-muted-foreground">
      <h1 className="text-4xl font-bold text-foreground">Política de privacidade</h1>
      <p>Coletamos apenas os dados necessários para processar seus pedidos: nome, e-mail, telefone, CPF (quando exigido para emissão fiscal) e endereço de entrega.</p>
      <p>Seus dados são usados exclusivamente para atendimento, entrega e comunicação sobre pedidos, e ficam acessíveis apenas à equipe autorizada da loja.</p>
      <p>Conforme a LGPD, você pode solicitar acesso, correção ou exclusão dos seus dados pelo e-mail contato@tanjiropuffs.com.br.</p>
      <p className="text-xs">Texto de exemplo — revise com sua assessoria jurídica antes de publicar.</p>
    </article>
  ),
});
