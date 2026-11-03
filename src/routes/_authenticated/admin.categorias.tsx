import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PageTitle } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/categorias")({ component: Categories });

const slugify = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function Categories() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["categories"], queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [] });
  const { data: counts } = useQuery({ queryKey: ["admin", "cat-counts"], queryFn: async () => (await supabase.from("products").select("category_id")).data ?? [] });
  const [form, setForm] = useState<{ id?: string; name: string; description: string } | null>(null);

  const save = async () => {
    if (!form || form.name.trim().length < 2) return toast.error("Informe o nome");
    const row = { name: form.name.trim(), slug: slugify(form.name), description: form.description.trim() || null };
    const { error } = form.id ? await supabase.from("categories").update(row).eq("id", form.id) : await supabase.from("categories").insert(row);
    if (error) return toast.error(error.code === "23505" ? "Já existe uma categoria com esse nome" : error.message);
    setForm(null);
    qc.invalidateQueries({ queryKey: ["categories"] });
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  return (
    <div>
      <PageTitle title="Categorias"><Button onClick={() => setForm({ name: "", description: "" })}><Plus /> Nova categoria</Button></PageTitle>
      <ul className="divide-y rounded-lg border bg-card">
        {data?.map((c) => (
          <li key={c.id} className="flex items-center gap-4 p-4">
            <div className="flex-1"><p className="font-medium">{c.name}</p><p className="text-sm text-muted-foreground">{c.description}</p></div>
            <span className="text-sm text-muted-foreground">{counts?.filter((p) => p.category_id === c.id).length ?? 0} produtos</span>
            <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setForm({ id: c.id, name: c.name, description: c.description ?? "" })}><Pencil /></Button>
            <ConfirmButton title={`Excluir ${c.name}?`} description="Os produtos desta categoria ficarão sem categoria." onConfirm={() => remove(c.id)}><Trash2 /></ConfirmButton>
          </li>
        ))}
      </ul>
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form?.id ? "Editar categoria" : "Nova categoria"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-1.5"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="flex justify-end"><Button onClick={save}>Salvar</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
