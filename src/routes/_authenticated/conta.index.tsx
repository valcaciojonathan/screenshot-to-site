import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/conta/")({
  component: Profile,
});

function Profile() {
  const { userId } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data: p } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()).data,
  });
  const [form, setForm] = useState({ full_name: "", phone: "", cpf: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (p) setForm({ full_name: p.full_name, phone: p.phone ?? "", cpf: p.cpf ?? "" });
  }, [p]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.full_name.trim().length < 3) return toast.error("Informe seu nome completo");
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: form.full_name.trim(), phone: form.phone.trim() || null, cpf: form.cpf.trim() || null }).eq("id", userId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Dados atualizados");
    qc.invalidateQueries({ queryKey: ["profile", userId] });
  };

  const changePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("new"));
    if (password.length < 8) return toast.error("A nova senha precisa de ao menos 8 caracteres");
    const { error } = await supabase.auth.updateUser({ password, current_password: String(f.get("current")) } as { password: string });
    if (error) return toast.error(error.message);
    toast.success("Senha alterada");
    e.currentTarget.reset();
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form onSubmit={save} className="space-y-4 rounded-lg border bg-card p-6">
        <h2 className="text-lg font-bold">Dados pessoais</h2>
        <div className="space-y-1.5"><Label>E-mail</Label><Input value={p?.email ?? ""} disabled /></div>
        <div className="space-y-1.5"><Label htmlFor="n">Nome completo</Label><Input id="n" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="ph">Telefone</Label><Input id="ph" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="cpf">CPF</Label><Input id="cpf" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></div>
        <Button type="submit" disabled={busy}>Salvar</Button>
      </form>
      <form onSubmit={changePassword} className="h-fit space-y-4 rounded-lg border bg-card p-6">
        <h2 className="text-lg font-bold">Alterar senha</h2>
        <div className="space-y-1.5"><Label htmlFor="cur">Senha atual</Label><Input id="cur" name="current" type="password" required /></div>
        <div className="space-y-1.5"><Label htmlFor="new">Nova senha</Label><Input id="new" name="new" type="password" required /></div>
        <Button type="submit" variant="outline">Alterar senha</Button>
      </form>
    </div>
  );
}
