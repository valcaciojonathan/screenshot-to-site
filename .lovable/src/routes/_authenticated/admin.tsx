import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, Boxes, FolderTree, LayoutDashboard, LogOut, Package, ShoppingBag, Store, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/store/Logo";
import { useSignOut } from "@/components/store/Header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!data) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Painel administrativo — Tanjiro Puffs" },
      { name: "description", content: "Gestão de produtos, estoque, pedidos, clientes e finanças da Tanjiro Puffs." },
      { property: "og:title", content: "Admin — Tanjiro Puffs" },
      { property: "og:description", content: "Painel administrativo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin" as const, label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/produtos" as const, label: "Produtos", icon: Package },
  { to: "/admin/categorias" as const, label: "Categorias", icon: FolderTree },
  { to: "/admin/estoque" as const, label: "Estoque", icon: Boxes },
  { to: "/admin/pedidos" as const, label: "Pedidos", icon: ShoppingBag },
  { to: "/admin/clientes" as const, label: "Clientes", icon: Users },
  { to: "/admin/notificacoes" as const, label: "Notificações", icon: Bell },
];

function AdminLayout() {
  const signOut = useSignOut();
  const { data: unread } = useQuery({
    queryKey: ["notifications", "admin", "unread"],
    queryFn: async () => (await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("for_admin", true).eq("read", false)).count ?? 0,
  });
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="h-1 pattern-ichimatsu" />
        <div className="flex justify-center p-5"><Logo size="md" /></div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ to, label, icon: Icon, exact }) => (
            <Link key={to} to={to} activeOptions={{ exact: !!exact }} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-foreground">
              <Icon className="size-4" /> {label}
              {label === "Notificações" && !!unread && <span className="ml-auto rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{unread}</span>}
            </Link>
          ))}
        </nav>
        <div className="space-y-1 border-t p-3">
          <Link to="/" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent"><Store className="size-4" /> Ver loja</Link>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent"><LogOut className="size-4" /> Sair</button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 overflow-x-auto border-b bg-card px-4 py-2 md:hidden">
          {NAV.map(({ to, label, exact }) => (
            <Button key={to} variant="ghost" size="sm" asChild><Link to={to} activeOptions={{ exact: !!exact }} className="data-[status=active]:text-primary">{label}</Link></Button>
          ))}
        </header>
        <main className="flex-1 p-4 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-bold">{title}</h1>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}
