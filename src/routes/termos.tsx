import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de uso — Tanjiro Puffs" },
      { name: "description", content: "Condições de uso da loja Tanjiro Puffs: compras, pagamentos, entregas e trocas." },
      { property: "og:title", content: "Termos de uso — Tanjiro Puffs" },
      { property: "og:description", content: "Condições de compra na Tanjiro Puffs." },
    ],
  }),
  component: () => (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-14 text-muted-foreground">
      <h1 className="text-4xl font-bold text-foreground">Termos de uso</h1>
      <p>Ao comprar na Tanjiro Puffs, você concorda que preços e disponibilidade são confirmados no momento da finalização do pedido.</p>
      <p>Pedidos são enviados após a confirmação do pagamento. Você pode desistir da compra em até 7 dias após o recebimento, conforme o Código de Defesa do Consumidor.</p>
      <p className="text-xs">Texto de exemplo — revise com sua assessoria jurídica antes de publicar.</p>
    </article>
  ),
});
