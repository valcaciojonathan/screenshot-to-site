import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — Tanjiro Puffs" },
      { name: "description", content: "Defina uma nova senha para sua conta Tanjiro Puffs." },
      { property: "og:title", content: "Nova senha — Tanjiro Puffs" },
      { property: "og:description", content: "Defina sua nova senha." },
    ],
  }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (password.length < 8) return toast.error("A senha precisa de ao menos 8 caracteres");
    if (password !== f.get("confirm")) return toast.error("As senhas não conferem");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada!");
    navigate({ to: "/" });
  };
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-8">
        <h1 className="text-2xl font-bold">Criar nova senha</h1>
        <div className="space-y-1.5"><Label htmlFor="password">Nova senha</Label><Input id="password" name="password" type="password" required /></div>
        <div className="space-y-1.5"><Label htmlFor="confirm">Confirmar senha</Label><Input id="confirm" name="confirm" type="password" required /></div>
        <Button type="submit" className="w-full" disabled={busy}>Salvar senha</Button>
      </form>
    </div>
  );
}
