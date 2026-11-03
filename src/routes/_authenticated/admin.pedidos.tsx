import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmButton } from "@/components/ConfirmButton";
import { OrderDetail, StatusBadge } from "@/components/store/OrderDetail";
import { brl, dateTimeBR, ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from "@/lib/format";
import { PageTitle } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({ component: Orders });
const PER = 15;

function Orders() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "orders"], queryFn: async () => (await supabase.from("orders").select("*").order("created_at", { ascending: false })).data ?? [] });
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ status: string; payment: string }>({ status: "", payment: "" });

  const list = useMemo(() => (data ?? []).filter((o) => (status === "all" || o.status === status) && `${o.number} ${o.customer_name} ${o.customer_email}`.toLowerCase().includes(q.toLowerCase())), [data, status, q]);
  const pages = Math.max(1, Math.ceil(list.length / PER));
  const current = data?.find((o) => o.id === open);

  const openOrder = (id: string) => {
    const o = data!.find((x) => x.id === id)!;
    setEdit({ status: o.status, payment: o.payment_status });
    setOpen(id);
  };
  const update = async () => {
    if (!open) return;
    const { error } = await supabase.rpc("admin_update_order", { _order_id: open, _status: edit.status as never, _payment: edit.payment as never });
    if (error) return toast.error(error.message);
    toast.success("Pedido atualizado");
    qc.invalidateQueries({ queryKey: ["admin"] });
    qc.invalidateQueries({ queryKey: ["order", open] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  return (
    <div>
      <PageTitle title="Pedidos" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input placeholder="Nº, cliente ou e-mail" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos os status</SelectItem>{Object.entries(ORDER_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Nº</TableHead><TableHead>Cliente</TableHead><TableHead>Data</TableHead><TableHead>Pagamento</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.slice((page - 1) * PER, page * PER).map((o) => (
              <TableRow key={o.id} className="cursor-pointer" onClick={() => openOrder(o.id)}>
                <TableCell className="font-semibold">#{o.number}</TableCell>
                <TableCell><p>{o.customer_name || "—"}</p><p className="text-xs text-muted-foreground">{o.customer_email}</p></TableCell>
                <TableCell className="text-sm">{dateTimeBR(o.created_at)}</TableCell>
                <TableCell className="text-sm">{PAYMENT_METHOD[o.payment_method]} · {PAYMENT_STATUS[o.payment_status]}</TableCell>
                <TableCell><StatusBadge status={o.status} /></TableCell>
                <TableCell className="text-right font-semibold">{brl(o.total)}</TableCell>
              </TableRow>
            ))}
            {list.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Nenhum pedido.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      {pages > 1 && <div className="mt-4 flex items-center justify-end gap-2 text-sm"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>{page}/{pages}<Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Próxima</Button></div>}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Detalhes do pedido</DialogTitle></DialogHeader>
          {open && <OrderDetail id={open} />}
          {current && (
            <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="space-y-1.5"><Label>Status do pedido</Label>
                <Select value={edit.status} onValueChange={(v) => setEdit({ ...edit, status: v })} disabled={current.status === "cancelado"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ORDER_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1.5"><Label>Status do pagamento</Label>
                <Select value={edit.payment} onValueChange={(v) => setEdit({ ...edit, payment: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PAYMENT_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
              </div>
              {edit.status === "cancelado" && current.status !== "cancelado" ? (
                <ConfirmButton title="Cancelar pedido?" description="Os itens voltarão ao estoque e o pedido não poderá ser reaberto." onConfirm={update} variant="destructive" size="default">Salvar</ConfirmButton>
              ) : (
                <Button onClick={update}>Salvar</Button>
              )}
              <p className="text-xs text-muted-foreground sm:col-span-3">Modo demonstração: aprove pagamentos manualmente apenas após confirmar o recebimento.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
