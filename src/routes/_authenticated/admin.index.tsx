import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { brl, ORDER_STATUS } from "@/lib/format";
import { PageTitle } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/")({ component: Dashboard });

const PERIODS = { "7d": 7, "30d": 30, "90d": 90, "12m": 365 } as const;
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--primary-glow)"];
const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" };

function Card({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Dashboard() {
  const [period, setPeriod] = useState<keyof typeof PERIODS | "custom">("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: products } = useQuery({
    queryKey: ["admin", "products-lite"],
    queryFn: async () => (await supabase.from("products").select("id, stock, low_stock_threshold, active, category_id")).data ?? [],
  });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: async () => (await supabase.from("categories").select("*")).data ?? [] });
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin", "orders-fin"],
    queryFn: async () => (await supabase.from("orders").select("id, created_at, total, status, payment_status, order_items(product_id, product_name, quantity, subtotal)").order("created_at")).data ?? [],
  });

  const range = useMemo(() => {
    const end = period === "custom" && to ? new Date(to + "T23:59:59") : new Date();
    const start = period === "custom" ? (from ? new Date(from) : new Date(0)) : new Date(end.getTime() - PERIODS[period] * 864e5);
    return { start, end, prevStart: new Date(start.getTime() - (end.getTime() - start.getTime())) };
  }, [period, from, to]);

  const stats = useMemo(() => {
    const all = orders ?? [];
    const inRange = all.filter((o) => { const d = new Date(o.created_at); return d >= range.start && d <= range.end; });
    const prev = all.filter((o) => { const d = new Date(o.created_at); return d >= range.prevStart && d < range.start; });
    const sum = (l: typeof all) => l.reduce((s, o) => s + Number(o.total), 0);
    const approvedOf = (l: typeof all) => l.filter((o) => o.payment_status === "aprovado" && o.status !== "cancelado");
    const approved = approvedOf(inRange);
    const refunds = inRange.filter((o) => o.payment_status === "reembolsado");
    const cancelled = inRange.filter((o) => o.status === "cancelado");
    const approvedTotal = sum(approved);
    const prevApproved = sum(approvedOf(prev));

    const byMonth: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    approved.forEach((o) => {
      const d = new Date(o.created_at);
      const m = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const day = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      byMonth[m] = (byMonth[m] ?? 0) + Number(o.total);
      byDay[day] = (byDay[day] ?? 0) + Number(o.total);
    });
    const byStatus: Record<string, number> = {};
    inRange.forEach((o) => (byStatus[o.status] = (byStatus[o.status] ?? 0) + 1));
    const top: Record<string, number> = {};
    const byCat: Record<string, number> = {};
    inRange.filter((o) => o.status !== "cancelado").forEach((o) =>
      o.order_items.forEach((i) => {
        top[i.product_name] = (top[i.product_name] ?? 0) + i.quantity;
        const cat = products?.find((p) => p.id === i.product_id)?.category_id;
        const name = categories?.find((c) => c.id === cat)?.name ?? "Outros";
        byCat[name] = (byCat[name] ?? 0) + Number(i.subtotal);
      }),
    );
    return {
      count: inRange.length,
      gross: sum(inRange),
      approvedTotal,
      refunds: sum(refunds),
      cancelled: sum(cancelled),
      net: approvedTotal,
      ticket: approved.length ? approvedTotal / approved.length : 0,
      change: prevApproved ? ((approvedTotal - prevApproved) / prevApproved) * 100 : null,
      months: Object.entries(byMonth).map(([name, value]) => ({ name, value })),
      days: Object.entries(byDay).map(([name, value]) => ({ name, value })),
      status: Object.entries(byStatus).map(([k, value]) => ({ name: ORDER_STATUS[k], value })),
      top: Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name: name.split(" ").slice(0, 2).join(" "), value })),
      cats: Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value })),
    };
  }, [orders, range, products, categories]);

  const p = products ?? [];
  return (
    <div>
      <PageTitle title="Dashboard">
        {(Object.keys(PERIODS) as (keyof typeof PERIODS)[]).map((k) => (
          <Button key={k} size="sm" variant={period === k ? "default" : "outline"} onClick={() => setPeriod(k)}>{k}</Button>
        ))}
        <Button size="sm" variant={period === "custom" ? "default" : "outline"} onClick={() => setPeriod("custom")}>Personalizado</Button>
      </PageTitle>
      {period === "custom" && (
        <div className="mb-6 flex gap-2"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" /><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" /></div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Produtos cadastrados" value={p.length} />
        <Card label="Disponíveis" value={p.filter((x) => x.active && x.stock > 0).length} />
        <Card label="Sem estoque" value={p.filter((x) => x.stock === 0).length} />
        <Card label="Estoque baixo" value={p.filter((x) => x.stock > 0 && x.stock <= x.low_stock_threshold).length} />
      </div>
      <h2 className="mb-4 mt-10 text-xl font-bold">Financeiro</h2>
      {isLoading ? <Skeleton className="h-28 w-full" /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="Valor bruto dos pedidos" value={brl(stats.gross)} hint="Todos os pedidos, inclusive não pagos" />
          <Card label="Pagamentos aprovados" value={brl(stats.approvedTotal)} hint={stats.change == null ? "Sem período anterior" : `${stats.change >= 0 ? "+" : ""}${stats.change.toFixed(1)}% vs período anterior`} />
          <Card label="Cancelamentos" value={brl(stats.cancelled)} />
          <Card label="Reembolsos" value={brl(stats.refunds)} />
          <Card label="Receita líquida" value={brl(stats.net)} hint="Aprovados, sem cancelados/reembolsos e sem taxas" />
          <Card label="Pedidos" value={stats.count} />
          <Card label="Ticket médio" value={brl(stats.ticket)} hint="Sobre pedidos aprovados" />
        </div>
      )}
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Chart title="Vendas por mês (aprovadas)">
          <BarChart data={stats.months}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} /><YAxis stroke="var(--muted-foreground)" fontSize={12} /><Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(v)} /><Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} /></BarChart>
        </Chart>
        <Chart title="Evolução das vendas">
          <LineChart data={stats.days}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} /><YAxis stroke="var(--muted-foreground)" fontSize={12} /><Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(v)} /><Line type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2} dot={false} /></LineChart>
        </Chart>
        <Chart title="Pedidos por status">
          <PieChart><Pie data={stats.status} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95}>{stats.status.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} /><Legend /></PieChart>
        </Chart>
        <Chart title="Produtos mais vendidos (unidades)">
          <BarChart data={stats.top}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} /><YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="value" fill="var(--chart-2)" radius={[4, 4, 0, 0]} /></BarChart>
        </Chart>
      </div>
      <div className="mt-6 rounded-lg border bg-card p-5">
        <h3 className="mb-4 font-semibold">Categorias com maior volume</h3>
        {stats.cats.length === 0 ? <p className="text-sm text-muted-foreground">Sem vendas no período.</p> : (
          <ul className="space-y-2 text-sm">{stats.cats.map((c) => <li key={c.name} className="flex justify-between"><span>{c.name}</span><span className="font-semibold">{brl(c.value)}</span></li>)}</ul>
        )}
      </div>
    </div>
  );
}

function Chart({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="mb-4 font-semibold">{title}</h3>
      <div className="h-64"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
    </div>
  );
}
