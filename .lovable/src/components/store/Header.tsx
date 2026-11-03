import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, LayoutDashboard, LogOut, Menu, Package, Search, ShoppingCart, User, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/lib/cart";
import { productsQuery } from "@/lib/queries";
import { brl, effectivePrice, dateTimeBR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Logo } from "./Logo";

const NAV = [
  { label: "Início", to: "/" as const, search: {} },
  { label: "Produtos", to: "/produtos" as const, search: {} },
  { label: "Novidades", to: "/produtos" as const, search: { sort: "recentes" as const } },
  { label: "Promoções", to: "/produtos" as const, search: { promo: true } },
];

function SearchBox({ onDone }: { onDone?: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ ...productsQuery(), enabled: q.length > 1 });
  const suggestions = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2 || !data) return [];
    return data
      .filter((p) => `${p.name} ${p.description} ${p.categories?.name ?? ""}`.toLowerCase().includes(t))
      .slice(0, 5);
  }, [q, data]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    navigate({ to: "/produtos", search: q.trim() ? { q: q.trim() } : {} });
    onDone?.();
  };

  return (
    <form onSubmit={submit} className="relative w-full" role="search">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar fones, smartwatches, teclados…"
        aria-label="Buscar produtos"
        className="h-10 bg-secondary pl-9 pr-9"
      />
      {q && (
        <button type="button" onClick={() => setQ("")} aria-label="Limpar busca" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      )}
      {open && suggestions.length > 0 && (
        <div className="absolute inset-x-0 top-12 z-50 overflow-hidden rounded-md border bg-popover shadow-card animate-rise">
          {suggestions.map((p) => (
            <Link
              key={p.id}
              to="/produto/$id"
              params={{ id: p.id }}
              onClick={() => {
                setOpen(false);
                onDone?.();
              }}
              className="flex items-center gap-3 px-3 py-2 hover:bg-accent"
            >
              {p.image_url && <img src={p.image_url} alt="" className="size-10 rounded object-cover" />}
              <span className="flex-1 truncate text-sm">{p.name}</span>
              <span className="text-sm font-semibold">{brl(effectivePrice(p))}</span>
            </Link>
          ))}
        </div>
      )}
    </form>
  );
}

function NotificationsBell({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications", "mine", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data;
    },
  });
  const unread = data?.filter((n) => !n.read).length ?? 0;
  const markAll = async () => {
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications", "mine", userId] });
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notificações (${unread} não lidas)`}>
          <Bell />
          {unread > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-semibold">Notificações</span>
          {unread > 0 && (
            <button onClick={markAll} className="text-xs text-primary hover:underline">
              Marcar como lidas
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {!data?.length && <p className="p-4 text-sm text-muted-foreground">Nenhuma notificação.</p>}
          {data?.map((n) => (
            <a key={n.id} href={n.link ?? "#"} className={`block border-b px-4 py-3 text-sm hover:bg-accent ${n.read ? "opacity-60" : ""}`}>
              <p className="font-medium">{n.title}</p>
              <p className="text-muted-foreground">{n.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{dateTimeBR(n.created_at)}</p>
            </a>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };
}

export function Header() {
  const { user, isAdmin, loading } = useAuth();
  const { count } = useCart();
  const signOut = useSignOut();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="h-1 w-full pattern-ichimatsu" aria-hidden />
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center gap-4 px-4">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="mt-6 space-y-6">
              <SearchBox onDone={() => setMobileOpen(false)} />
              <nav className="flex flex-col gap-1">
                {NAV.map((n) => (
                  <Link key={n.label} to={n.to} search={n.search} onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 hover:bg-accent">
                    {n.label}
                  </Link>
                ))}
              </nav>
              {!user && (
                <div className="grid gap-2">
                  <Button asChild variant="outline"><Link to="/auth" search={{ mode: "login" }} onClick={() => setMobileOpen(false)}>Entrar</Link></Button>
                  <Button asChild><Link to="/auth" search={{ mode: "signup" }} onClick={() => setMobileOpen(false)}>Criar conta</Link></Button>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <Logo />

        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              search={n.search}
              activeOptions={{ exact: true, includeSearch: true }}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden w-full max-w-sm md:block">
          <SearchBox />
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-2">
          {user && <NotificationsBell userId={user.id} />}
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link to="/carrinho" aria-label={`Carrinho com ${count} itens`}>
              <ShoppingCart />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
          </Button>
          {!loading && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Minha conta">
                  <User />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/conta"><User /> Minha conta</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/conta/pedidos"><Package /> Meus pedidos</Link></DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild><Link to="/admin"><LayoutDashboard /> Painel admin</Link></DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}><LogOut /> Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            !loading && (
              <div className="hidden items-center gap-2 lg:flex">
                <Button variant="ghost" size="sm" asChild><Link to="/auth" search={{ mode: "login" }}>Entrar</Link></Button>
                <Button size="sm" asChild><Link to="/auth" search={{ mode: "signup" }}>Cadastrar</Link></Button>
              </div>
            )
          )}
        </div>
      </div>
    </header>
  );
}
