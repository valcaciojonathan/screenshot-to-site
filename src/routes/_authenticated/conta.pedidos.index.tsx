import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/store/OrderDetail";
import { brl, dateBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/conta/pedidos/")({
  component: Orders,
});

function Orders() {
  const { userId } = Route.useRouteContext();
  const { data, isLoading } = useQuery({
    queryKey: ["orders", "mine", userId],
    queryFn: async () => (await supabase.from("orders").select("id, number, created_at, total, status").eq("user_id", userId).order("created_at", { ascending: false })).data ?? [],
  });
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data?.length)
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <Package className="mx-auto size-10 text-muted-foreground" />
        <p className="mt-4">Você ainda não fez pedidos.</p>
        <Button className="mt-4" asChild><Link to="/produtos">Explorar produtos</Link></Button>
      </div>
    );
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {data.map((o) => (
        <li key={o.id}>
          <Link to="/conta/pedidos/$id" params={{ id: o.id }} className="flex flex-wrap items-center gap-4 p-4 hover:bg-accent">
            <span className="font-semibold">#{o.number}</span>
            <span className="text-sm text-muted-foreground">{dateBR(o.created_at)}</span>
            <StatusBadge status={o.status} />
            <span className="ml-auto font-bold">{brl(o.total)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
