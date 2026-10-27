import { useMemo, useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SearchX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductGrid } from "@/components/store/ProductCard";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import { effectivePrice } from "@/lib/format";

type Sort = "recentes" | "menor" | "maior" | "nome" | "vendidos";
type Search = { q?: string; cat?: string; sort?: Sort; promo?: boolean; disp?: boolean; min?: number; max?: number; page?: number };
const SORTS: Sort[] = ["recentes", "menor", "maior", "nome", "vendidos"];
const PER_PAGE = 12;

export const Route = createFileRoute("/produtos")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" && s.q ? s.q : undefined,
    cat: typeof s.cat === "string" && s.cat ? s.cat : undefined,
    sort: SORTS.includes(s.sort as Sort) ? (s.sort as Sort) : undefined,
    promo: s.promo === true || s.promo === "true" ? true : undefined,
    disp: s.disp === true || s.disp === "true" ? true : undefined,
    min: Number(s.min) > 0 ? Number(s.min) : undefined,
    max: Number(s.max) > 0 ? Number(s.max) : undefined,
    page: Number(s.page) > 1 ? Number(s.page) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Catálogo de produtos — Tanjiro Puffs" },
      { name: "description", content: "Explore fones, smartwatches, periféricos e acessórios. Filtre por categoria, preço e promoções." },
      { property: "og:title", content: "Catálogo — Tanjiro Puffs" },
      { property: "og:description", content: "Todos os eletrônicos da Tanjiro Puffs em um só lugar." },
    ],
  }),
  component: Catalog,
});

function Catalog() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/produtos" });
  const set = (patch: Partial<Search>) => navigate({ search: (prev) => ({ ...prev, page: undefined, ...patch }) });
  const { data: products, isLoading, isError, refetch } = useQuery(productsQuery());
  const { data: categories } = useQuery(categoriesQuery());
  const [q, setQ] = useState(s.q ?? "");
  useEffect(() => setQ(s.q ?? ""), [s.q]);

  const filtered = useMemo(() => {
    if (!products) return [];
    const t = s.q?.toLowerCase();
    let list = products.filter((p) => {
      const price = effectivePrice(p);
      if (t && !`${p.name} ${p.description} ${p.categories?.name ?? ""}`.toLowerCase().includes(t)) return false;
      if (s.cat && p.categories?.slug !== s.cat) return false;
      if (s.promo && p.promo_price == null) return false;
      if (s.disp && p.stock <= 0) return false;
      if (s.min && price < s.min) return false;
      if (s.max && price > s.max) return false;
      return true;
    });
    const sort = s.sort ?? "recentes";
    list = [...list].sort((a, b) =>
      sort === "menor" ? effectivePrice(a) - effectivePrice(b)
      : sort === "maior" ? effectivePrice(b) - effectivePrice(a)
      : sort === "nome" ? a.name.localeCompare(b.name)
      : sort === "vendidos" ? b.sold_count - a.sold_count
      : +new Date(b.created_at) - +new Date(a.created_at),
    );
    return list;
  }, [products, s]);

  const page = s.page ?? 1;
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const hasFilters = !!(s.q || s.cat || s.promo || s.disp || s.min || s.max);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">{s.q ? <>Resultados para “{s.q}”</> : "Catálogo"}</h1>
        <p className="mt-2 text-muted-foreground">{isLoading ? "Carregando…" : `${filtered.length} produto(s)`}</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-6 rounded-lg border bg-card p-5 lg:sticky lg:top-24 lg:self-start">
          <form onSubmit={(e) => { e.preventDefault(); set({ q: q.trim() || undefined }); }} className="space-y-2">
            <Label>Buscar</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome ou palavra-chave" />
          </form>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={s.cat ?? "all"} onValueChange={(v) => set({ cat: v === "all" ? undefined : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories?.map((c) => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Faixa de preço (R$)</Label>
            <div className="flex gap-2">
              <Input type="number" min={0} placeholder="Mín" defaultValue={s.min} onBlur={(e) => set({ min: Number(e.target.value) || undefined })} />
              <Input type="number" min={0} placeholder="Máx" defaultValue={s.max} onBlur={(e) => set({ max: Number(e.target.value) || undefined })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!s.disp} onCheckedChange={(c) => set({ disp: c ? true : undefined })} /> Somente disponíveis</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!s.promo} onCheckedChange={(c) => set({ promo: c ? true : undefined })} /> Em promoção</label>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate({ search: { sort: s.sort } })}>
              <X /> Limpar filtros
            </Button>
          )}
        </aside>
        <div>
          <div className="mb-5 flex justify-end">
            <Select value={s.sort ?? "recentes"} onValueChange={(v) => set({ sort: v as Sort })}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recentes">Mais recentes</SelectItem>
                <SelectItem value="vendidos">Mais vendidos</SelectItem>
                <SelectItem value="menor">Menor preço</SelectItem>
                <SelectItem value="maior">Maior preço</SelectItem>
                <SelectItem value="nome">Nome (A–Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isError ? (
            <div className="rounded-lg border p-10 text-center">
              <p>Não foi possível carregar os produtos.</p>
              <Button className="mt-4" onClick={() => refetch()}>Tentar novamente</Button>
            </div>
          ) : !isLoading && filtered.length === 0 ? (
            <div className="rounded-lg border bg-card p-14 text-center">
              <SearchX className="mx-auto size-10 text-muted-foreground" />
              <p className="mt-4 font-semibold">Nenhum produto encontrado</p>
              <p className="text-sm text-muted-foreground">Tente outros termos ou limpe os filtros.</p>
            </div>
          ) : (
            <ProductGrid products={visible} loading={isLoading} count={8} />
          )}
          {pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => navigate({ search: (p) => ({ ...p, page: page - 1 }) })}>Anterior</Button>
              <span className="text-sm text-muted-foreground">Página {page} de {pages}</span>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => navigate({ search: (p) => ({ ...p, page: page + 1 }) })}>Próxima</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
