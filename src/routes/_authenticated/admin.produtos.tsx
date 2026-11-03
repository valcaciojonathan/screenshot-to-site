import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmButton } from "@/components/ConfirmButton";
import { StockBadge } from "@/components/store/ProductCard";
import { brl, dateBR } from "@/lib/format";
import { errorMessage } from "@/lib/queries";
import { PageTitle } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/produtos")({ component: Products });

const schema = z.object({
  name: z.string().trim().min(2, "Nome obrigatório").max(120),
  description: z.string().trim().max(3000),
  category_id: z.string().uuid("Escolha uma categoria"),
  price: z.number({ invalid_type_error: "Preço inválido" }).positive("Preço deve ser maior que zero"),
  promo_price: z.number().positive().nullable(),
  stock: z.number().int().min(0, "Estoque não pode ser negativo"),
  low_stock_threshold: z.number().int().min(0),
  featured: z.boolean(),
  active: z.boolean(),
});

type Form = { id?: string; name: string; description: string; category_id: string; price: string; promo_price: string; stock: string; low_stock_threshold: string; featured: boolean; active: boolean; image_url: string | null; gallery: string[] };
const EMPTY: Form = { name: "", description: "", category_id: "", price: "", promo_price: "", stock: "0", low_stock_threshold: "5", featured: false, active: true, image_url: null, gallery: [] };
const PER = 10;

async function uploadImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Envie apenas imagens");
  if (file.size > 5 * 1024 * 1024) throw new Error("Imagem acima de 5MB");
  const path = `${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase() ?? "jpg"}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (e2) throw e2;
  return data.signedUrl;
}

function Products() {
  const qc = useQueryClient();
  const { data: products } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => (await supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [] });
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [avail, setAvail] = useState("all");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => (products ?? []).filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase()) &&
    (cat === "all" || p.category_id === cat) &&
    (avail === "all" || (avail === "in" ? p.stock > 0 : avail === "out" ? p.stock === 0 : !p.active))), [products, q, cat, avail]);
  const pages = Math.max(1, Math.ceil(list.length / PER));
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["products"] }); };

  const save = async () => {
    if (!form || busy) return;
    const r = schema.safeParse({
      ...form,
      price: Number(form.price.replace(",", ".")),
      promo_price: form.promo_price ? Number(form.promo_price.replace(",", ".")) : null,
      stock: Number(form.stock),
      low_stock_threshold: Number(form.low_stock_threshold),
    });
    if (!r.success) return toast.error(r.error.issues[0].message);
    if (r.data.promo_price != null && r.data.promo_price >= r.data.price) return toast.error("Preço promocional deve ser menor que o preço");
    setBusy(true);
    try {
      const { stock, ...rest } = r.data;
      const row = { ...rest, image_url: form.image_url, gallery: form.gallery };
      if (form.id) {
        const { error } = await supabase.from("products").update(row).eq("id", form.id);
        if (error) throw error;
        const current = products?.find((p) => p.id === form.id)?.stock ?? stock;
        if (stock !== current) {
          const { error: e } = await supabase.rpc("admin_adjust_stock", { _product_id: form.id, _delta: stock - current, _reason: "edição do produto" });
          if (e) throw e;
        }
      } else {
        const { data, error } = await supabase.from("products").insert({ ...row, stock: 0 }).select("id").single();
        if (error) throw error;
        if (stock > 0) await supabase.rpc("admin_adjust_stock", { _product_id: data.id, _delta: stock, _reason: "estoque inicial" });
      }
      toast.success("Produto salvo");
      setForm(null);
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    const { count } = await supabase.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", id);
    if (count) {
      await supabase.from("products").update({ active: false }).eq("id", id);
      toast.info("Produto possui vendas — foi desativado para preservar o histórico");
    } else {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) return toast.error(error.message);
      toast.success("Produto excluído");
    }
    refresh();
  };

  const onUpload = async (files: FileList | null, main: boolean) => {
    if (!files?.length || !form) return;
    try {
      setBusy(true);
      const urls = await Promise.all(Array.from(files).map(uploadImage));
      setForm((f) => f && (main ? { ...f, image_url: urls[0] } : { ...f, gallery: [...f.gallery, ...urls] }));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageTitle title="Produtos"><Button onClick={() => setForm(EMPTY)}><Plus /> Novo produto</Button></PageTitle>
      <div className="mb-4 flex flex-wrap gap-2">
        <Input placeholder="Pesquisar produto…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" />
        <Select value={cat} onValueChange={(v) => { setCat(v); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas categorias</SelectItem>{categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={avail} onValueChange={(v) => { setAvail(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="in">Com estoque</SelectItem><SelectItem value="out">Sem estoque</SelectItem><SelectItem value="inactive">Desativados</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Categoria</TableHead><TableHead>Preço</TableHead><TableHead>Estoque</TableHead><TableHead>Status</TableHead><TableHead>Cadastro</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {list.slice((page - 1) * PER, page * PER).map((p) => (
              <TableRow key={p.id}>
                <TableCell><div className="flex items-center gap-3">{p.image_url && <img src={p.image_url} alt="" className="size-10 rounded object-cover" />}<span className="font-medium">{p.name}</span></div></TableCell>
                <TableCell>{p.categories?.name ?? "—"}</TableCell>
                <TableCell>{p.promo_price != null ? <><span className="font-semibold">{brl(p.promo_price)}</span> <span className="text-xs text-muted-foreground line-through">{brl(p.price)}</span></> : brl(p.price)}</TableCell>
                <TableCell><StockBadge stock={p.stock} threshold={p.low_stock_threshold} /> <span className="ml-1 text-xs">{p.stock}</span></TableCell>
                <TableCell>{p.active ? <Badge variant="success">Ativo</Badge> : <Badge variant="muted">Desativado</Badge>}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{dateBR(p.created_at)}</TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setForm({ id: p.id, name: p.name, description: p.description, category_id: p.category_id ?? "", price: String(p.price), promo_price: p.promo_price != null ? String(p.promo_price) : "", stock: String(p.stock), low_stock_threshold: String(p.low_stock_threshold), featured: p.featured, active: p.active, image_url: p.image_url, gallery: p.gallery ?? [] })}><Pencil /></Button>
                  <ConfirmButton title={`Excluir ${p.name}?`} description="Se o produto já tiver vendas, ele será apenas desativado para preservar o histórico." onConfirm={() => remove(p.id)}><Trash2 /></ConfirmButton>
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Nenhum produto encontrado.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      {pages > 1 && <div className="mt-4 flex items-center justify-end gap-2 text-sm"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>{page}/{pages}<Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Próxima</Button></div>}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Descrição</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Categoria</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1.5"><Label>Estoque</Label><Input type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Preço (R$)</Label><Input inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Preço promocional (opcional)</Label><Input inputMode="decimal" value={form.promo_price} onChange={(e) => setForm({ ...form, promo_price: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Alerta de estoque baixo</Label><Input type="number" min={0} value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} /></div>
              <div className="flex items-end gap-6 pb-2">
                <label className="flex items-center gap-2 text-sm"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /> Ativo</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} /> Destaque</label>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Imagem principal</Label>
                <div className="flex items-center gap-3">
                  {form.image_url && <img src={form.image_url} alt="" className="size-20 rounded object-cover" />}
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"><Upload className="size-4" /> Enviar<input type="file" accept="image/*" hidden onChange={(e) => onUpload(e.target.files, true)} /></label>
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Galeria</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {form.gallery.map((g) => (
                    <div key={g} className="relative"><img src={g} alt="" className="size-16 rounded object-cover" /><button onClick={() => setForm({ ...form, gallery: form.gallery.filter((x) => x !== g) })} className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5" aria-label="Remover"><X className="size-3" /></button></div>
                  ))}
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"><Upload className="size-4" /> Adicionar<input type="file" accept="image/*" multiple hidden onChange={(e) => onUpload(e.target.files, false)} /></label>
                </div>
              </div>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button variant="ghost" onClick={() => setForm(null)}>Cancelar</Button>
                <Button onClick={save} disabled={busy}>{busy ? "Salvando…" : "Salvar"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
