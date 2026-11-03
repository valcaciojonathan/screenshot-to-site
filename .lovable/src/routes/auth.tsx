import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { safeRedirect } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/store/Logo";

type Search = { redirect?: string; mode?: "login" | "signup" };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    mode: s.mode === "signup" ? "signup" : s.mode === "login" ? "login" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — Tanjiro Puffs" },
      { name: "description", content: "Acesse sua conta Tanjiro Puffs ou cadastre-se para finalizar sua compra." },
      { property: "og:title", content: "Entrar — Tanjiro Puffs" },
      { property: "og:description", content: "Acesse sua conta Tanjiro Puffs." },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z
  .object({
    full_name: z.string().trim().min(3, "Informe seu nome completo").max(100),
    email: z.string().trim().email("E-mail inválido").max(255),
    phone: z.string().trim().regex(/^[\d\s()+-]{10,20}$/, "Telefone inválido"),
    cpf: z.string().trim().regex(/^(\d{3}\.?\d{3}\.?\d{3}-?\d{2})?$/, "CPF inválido").optional(),
    password: z.string().min(8, "A senha precisa de ao menos 8 caracteres").regex(/[A-Za-z]/, "Inclua letras").regex(/\d/, "Inclua números"),
    confirm: z.string(),
    terms: z.literal(true, { errorMap: () => ({ message: "Aceite os termos para continuar" }) }),
  })
  .refine((d) => d.password === d.confirm, { message: "As senhas não conferem", path: ["confirm"] });

function AuthPage() {
  const { redirect, mode } = Route.useSearch();
  const target = safeRedirect(redirect);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<string>(mode ?? "login");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [terms, setTerms] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: target, replace: true });
  }, [user, target, navigate]);

  const oauth = async (provider: "google" | "lovable") => {
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/auth?redirect=${encodeURIComponent(target)}`,
    });
    if (result.error) toast.error("Não foi possível entrar. Tente novamente.");
  };

  const login = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: String(f.get("email")), password: String(f.get("password")) });
    setBusy(false);
    if (error) toast.error(error.message.includes("Invalid") ? "E-mail ou senha incorretos" : error.message.includes("not confirmed") ? "Confirme seu e-mail antes de entrar" : error.message);
  };

  const signup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const parsed = signupSchema.safeParse({ ...f, cpf: f.cpf || undefined, terms });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    const d = parsed.data;
    const { data, error } = await supabase.auth.signUp({
      email: d.email,
      password: d.password,
      options: {
        emailRedirectTo: `${window.location.origin}${target}`,
        data: { full_name: d.full_name, phone: d.phone, cpf: d.cpf ?? null },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message.includes("registered") ? "Este e-mail já está cadastrado" : error.message);
    if (data.user && data.user.identities?.length === 0) return setErrors({ email: "Este e-mail já está cadastrado" });
    setSent(d.email);
  };

  const Err = ({ k }: { k: string }) => (errors[k] ? <p className="text-xs text-destructive">{errors[k]}</p> : null);

  return (
    <div className="relative min-h-[80vh] px-4 py-14">
      <div className="absolute inset-0 -z-10 pattern-ichimatsu-faint" />
      <div className="mx-auto max-w-md rounded-xl border bg-card p-8 shadow-card animate-rise">
        <div className="mb-6 flex justify-center"><Logo size="md" /></div>
        {redirect && <p className="mb-4 rounded-md bg-accent p-3 text-center text-sm">Entre ou crie sua conta para finalizar a compra. Seu carrinho será mantido.</p>}
        {sent ? (
          <div className="text-center">
            <MailCheck className="mx-auto size-12 text-primary" />
            <h2 className="mt-4 text-xl font-bold">Confirme seu e-mail</h2>
            <p className="mt-2 text-sm text-muted-foreground">Enviamos um link de confirmação para <b>{sent}</b>. Depois de confirmar, você volta direto para a compra.</p>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>
            <div className="mt-6 grid gap-2">
              <Button variant="outline" onClick={() => oauth("google")}>Continuar com Google</Button>
              <button type="button" className="lovable-auth-button" onClick={() => oauth("lovable")}>Continuar com Lovable</button>
            </div>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />ou com e-mail<span className="h-px flex-1 bg-border" /></div>
            <TabsContent value="login">
              <form onSubmit={login} className="space-y-4">
                <div className="space-y-1.5"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div>
                <div className="space-y-1.5">
                  <div className="flex justify-between"><Label htmlFor="password">Senha</Label><Link to="/recuperar-senha" className="text-xs text-primary hover:underline">Esqueci minha senha</Link></div>
                  <Input id="password" name="password" type="password" required autoComplete="current-password" />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signup} className="space-y-3" noValidate>
                <div className="space-y-1.5"><Label htmlFor="full_name">Nome completo</Label><Input id="full_name" name="full_name" autoComplete="name" /><Err k="full_name" /></div>
                <div className="space-y-1.5"><Label htmlFor="s-email">E-mail</Label><Input id="s-email" name="email" type="email" autoComplete="email" /><Err k="email" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label htmlFor="phone">Telefone</Label><Input id="phone" name="phone" placeholder="(11) 90000-0000" autoComplete="tel" /><Err k="phone" /></div>
                  <div className="space-y-1.5"><Label htmlFor="cpf">CPF (opcional)</Label><Input id="cpf" name="cpf" placeholder="000.000.000-00" /><Err k="cpf" /></div>
                </div>
                <div className="space-y-1.5"><Label htmlFor="s-password">Senha</Label><Input id="s-password" name="password" type="password" autoComplete="new-password" /><Err k="password" /></div>
                <div className="space-y-1.5"><Label htmlFor="confirm">Confirmar senha</Label><Input id="confirm" name="confirm" type="password" autoComplete="new-password" /><Err k="confirm" /></div>
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox checked={terms} onCheckedChange={(c) => setTerms(!!c)} className="mt-0.5" />
                  <span>Li e aceito os <Link to="/termos" className="text-primary underline">termos de uso</Link> e a <Link to="/privacidade" className="text-primary underline">política de privacidade</Link>.</span>
                </label>
                <Err k="terms" />
                <Button type="submit" className="w-full" disabled={busy}>{busy ? "Criando conta…" : "Criar conta"}</Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
