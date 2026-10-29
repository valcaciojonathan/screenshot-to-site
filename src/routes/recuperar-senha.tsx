import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — Tanjiro Puffs" },
      { name: "description", content: "Receba um link para redefinir a senha da sua conta Tanjiro Puffs." },
      { property: "og:title", content: "Recuperar senha — Tanjiro Puffs" },
      { property: "og:description", content: "Redefina sua senha." },
    ],
  }),
  component: Page,
});

function Page() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const email = String(new FormData(e.currentTarget).get("email"));
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
  };
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-xl border bg-card p-8">
        <h1 className="text-2xl font-bold">Recuperar senha</h1>
        {sent ? (
          <p className="mt-4 text-muted-foreground">Se houver uma conta com esse e-mail, você receberá um link para criar uma nova senha.</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" required /></div>
            <Button type="submit" className="w-full" disabled={busy}>Enviar link</Button>
          </form>
        )}
        <Link to="/auth" className="mt-6 block text-sm text-primary hover:underline">Voltar para o login</Link>
      </div>
    </div>
  );
}
