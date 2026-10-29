import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { OrderDetail } from "@/components/store/OrderDetail";

export const Route = createFileRoute("/_authenticated/conta/pedidos/$id")({
  component: () => {
    const { id } = Route.useParams();
    return (
      <div>
        <Link to="/conta/pedidos" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Voltar</Link>
        <OrderDetail id={id} />
      </div>
    );
  },
});
