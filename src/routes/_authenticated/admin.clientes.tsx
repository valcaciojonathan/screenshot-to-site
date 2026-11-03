import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/store/OrderDetail";
import { brl, dateBR } from "@/lib/format";
import { PageTitle } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/clientes")({ component: Customers });

function Customers() {
  const { data: profiles } = useQuery({ queryKey: ["admin", "profiles"], queryFn: async () => (await supabase.from("profiles").select("*").order("created_at", { ascending: false })).data ?? [] });
  const { data: orders } = useQuery({ queryKey: ["admin", "orders-cust"], queryFn: async () => (await supabase.from("orders").select("id, number, user_id, total, status, payment_status, created_at").order("created_at", { ascending: false })).data ?? [] });
  const [q, setQ] = useState("");
  const [since, setSince] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => (profiles ?? []).filter((p) => `${p.full_name} ${p.email}`.toLowerCase().includes(q.toLowerCase()) && (!since || new Date(p.created_at) >= new Date(since))), [profiles, q, since]);
  const ordersOf = (id: string) => orders?.filter((o) => o.user_id === id) ?? [];
  const paidTotal = (id: string) => ordersOf(id).filter((o) => o.payment_status === "aprovado" && o.status !== "cancelado").reduce((s, o) => s + Number(o.total), 0);
  const sel = profiles?.find((p) => p.id === open);

  return (
    <div>
      <PageTitle title="Clientes" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input placeholder="Nome ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <span className="text-sm text-muted-foreground">Cadastrados desde</span>
        <Input type="date" value={since} onChange={(e) => setSince(e.target.value)} className="w-44" />
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Telefone</TableHead><TableHead>Cadastro</TableHead><TableHead>Pedidos</TableHead><TableHead>Total pago</TableHead><TableHead>Conta</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map((p) => (
              <TableRow key={p.id} className="cursor-pointer" onClick={() => setOpen(p.id)}>
                <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                <TableCell>{p.email}</TableCell>
                <TableCell>{p.phone ?? "—"}</TableCell>
                <TableCell>{dateBR(p.created_at)}</TableCell>
                <TableCell>{ordersOf(p.id).length}</TableCell>
                <TableCell>{brl(paidTotal(p.id))}</TableCell>
                <TableCell>{p.active ? <Badge variant="success">Ativa</Badge> : <Badge variant="muted">Inativa</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{sel?.full_name || sel?.email}</DialogTitle></DialogHeader>
          {sel && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <p><span className="text-muted-foreground">E-mail:</span> {sel.email}</p>
                <p><span className="text-muted-foreground">Telefone:</span> {sel.phone ?? "—"}</p>
                <p><span className="text-muted-foreground">CPF:</span> {sel.cpf ? `***.***.${sel.cpf.replace(/\D/g, "").slice(6, 9)}-**` : "—"}</p>
                <p><span className="text-muted-foreground">Cliente desde:</span> {dateBR(sel.created_at)}</p>
              </div>
              <h3 className="font-semibold">Histórico de pedidos</h3>
              <ul className="divide-y rounded-md border">
                {ordersOf(sel.id).map((o) => (
                  <li key={o.id} className="flex items-center gap-3 p-3"><span className="font-semibold">#{o.number}</span><span className="text-muted-foreground">{dateBR(o.created_at)}</span><StatusBadge status={o.status} /><span className="ml-auto font-semibold">{brl(o.total)}</span></li>
                ))}
                {!ordersOf(sel.id).length && <li className="p-3 text-muted-foreground">Sem pedidos.</li>}
              </ul>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
