import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderDetail } from "@/components/store/OrderDetail";

export const Route = createFileRoute("/_authenticated/pedido-confirmado/$id")({
  head: () => ({
    meta: [
      { title: "Pedido recebido — Tanjiro Puffs" },
      { name: "description", content: "Seu pedido foi registrado na Tanjiro Puffs." },
      { property: "og:title", content: "Pedido recebido — Tanjiro Puffs" },
      { property: "og:description", content: "Confirmação do seu pedido." },
    ],
  }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-10 text-center animate-rise">
        <CheckCircle2 className="mx-auto size-16 text-success" />
        <h1 className="mt-4 text-3xl font-bold">Pedido recebido!</h1>
        <p className="mt-2 text-muted-foreground">Seu pedido foi registrado e está aguardando a confirmação do pagamento (modo demonstração).</p>
      </div>
      <OrderDetail id={id} />
      <div className="mt-8 flex justify-center gap-3">
        <Button variant="outline" asChild><Link to="/conta/pedidos">Meus pedidos</Link></Button>
        <Button asChild><Link to="/produtos">Continuar comprando</Link></Button>
      </div>
    </div>
  );
}
