import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StockBadge } from "@/components/store/ProductCard";
import { dateTimeBR } from "@/lib/format";
import { PageTitle } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/estoque")({ component: Stock });

function Stock() {
  const qc = useQueryClient();
  const { data: products } = useQuery({ queryKey: ["admin", "stock"], queryFn: async () => (await supabase.from("products").select("id, name, stock, low_stock_threshold, active").order("stock")).data ?? [] });
  const { data: moves } = useQuery({ queryKey: ["admin", "moves"], queryFn: async () => (await supabase.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [] });
  const [adj, setAdj] = useState<{ id: string; name: string; delta: string; reason: string } | null>(null);
  const alerts = products?.filter((p) => p.active && p.stock <= p.low_stock_threshold) ?? [];

  const apply = async () => {
    if (!adj) return;
    const delta = parseInt(adj.delta, 10);
    if (!delta) return toast.error("Informe uma quantidade diferente de zero (use negativo para baixa)");
    const { error } = await supabase.rpc("admin_adjust_stock", { _product_id: adj.id, _delta: delta, _reason: adj.reason });
    if (error) return toast.error(error.message);
    toast.success("Estoque ajustado");
    setAdj(null);
    qc.invalidateQueries({ queryKey: ["admin"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  return (
    <div>
      <PageTitle title="Controle de estoque" />
      {alerts.length > 0 && (
        <div className="mb-6 flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="size-5 shrink-0 text-warning" />
          <p>{alerts.length} produto(s) com estoque baixo ou zerado: {alerts.map((a) => a.name).join(", ")}.</p>
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Qtd.</TableHead><TableHead>Situação</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {products?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.stock}</TableCell>
                  <TableCell><StockBadge stock={p.stock} threshold={p.low_stock_threshold} /></TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => setAdj({ id: p.id, name: p.name, delta: "", reason: "" })}>Ajustar</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 font-semibold">Movimentações recentes</h2>
          <ul className="max-h-[600px] space-y-2 overflow-y-auto text-sm">
            {moves?.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 border-b pb-2">
                <div><p>{m.product_name}</p><p className="text-xs text-muted-foreground">{m.reason} · {dateTimeBR(m.created_at)}</p></div>
                <span className={m.delta > 0 ? "font-bold text-success" : "font-bold text-destructive"}>{m.delta > 0 ? "+" : ""}{m.delta}</span>
              </li>
            ))}
            {!moves?.length && <p className="text-muted-foreground">Nenhuma movimentação.</p>}
          </ul>
        </div>
      </div>
      <Dialog open={!!adj} onOpenChange={(o) => !o && setAdj(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajustar estoque — {adj?.name}</DialogTitle></DialogHeader>
          {adj && (
            <div className="space-y-4">
              <div className="space-y-1.5"><Label>Quantidade (+ entrada / − saída)</Label><Input type="number" value={adj.delta} onChange={(e) => setAdj({ ...adj, delta: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Motivo</Label><Input value={adj.reason} placeholder="Ex.: reposição de fornecedor" onChange={(e) => setAdj({ ...adj, reason: e.target.value })} /></div>
              <div className="flex justify-end"><Button onClick={apply}>Aplicar</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
