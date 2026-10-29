import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { brl, dateTimeBR, ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from "@/lib/format";

export const orderQuery = (id: string) => ({
  queryKey: ["order", id],
  queryFn: async () => {
    const { data, error } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  },
});

export function StatusBadge({ status }: { status: string }) {
  const v = status === "cancelado" ? "destructive" : status === "entregue" || status === "pagamento_aprovado" ? "success" : status === "aguardando_pagamento" ? "warning" : "secondary";
  return <Badge variant={v}>{ORDER_STATUS[status] ?? status}</Badge>;
}

export function OrderDetail({ id }: { id: string }) {
  const { data: o, isLoading } = useQuery(orderQuery(id));
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!o) return <p className="text-muted-foreground">Pedido não encontrado.</p>;
  const a = o.shipping_address as Record<string, string>;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold">Pedido #{o.number}</h2>
        <StatusBadge status={o.status} />
      </div>
      <div className="grid gap-4 text-sm sm:grid-cols-3">
        <div className="rounded-md border bg-card p-4"><p className="text-muted-foreground">Data</p><p className="font-medium">{dateTimeBR(o.created_at)}</p></div>
        <div className="rounded-md border bg-card p-4"><p className="text-muted-foreground">Pagamento</p><p className="font-medium">{PAYMENT_METHOD[o.payment_method]} · {PAYMENT_STATUS[o.payment_status]}</p></div>
        <div className="rounded-md border bg-card p-4"><p className="text-muted-foreground">Entrega</p><p className="font-medium">{a.street}, {a.number} {a.complement} — {a.city}/{a.state}</p></div>
      </div>
      <ul className="divide-y rounded-md border bg-card">
        {o.order_items.map((i) => (
          <li key={i.id} className="flex items-center gap-3 p-3 text-sm">
            {i.image_url && <img src={i.image_url} alt="" className="size-12 rounded object-cover" />}
            <span className="flex-1">{i.product_name}</span>
            <span className="text-muted-foreground">{i.quantity} × {brl(i.unit_price)}</span>
            <span className="w-24 text-right font-semibold">{brl(i.subtotal)}</span>
          </li>
        ))}
      </ul>
      <div className="ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{brl(o.subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span>{Number(o.shipping) === 0 ? "Grátis" : brl(o.shipping)}</span></div>
        <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Total</span><span>{brl(o.total)}</span></div>
      </div>
    </div>
  );
}
