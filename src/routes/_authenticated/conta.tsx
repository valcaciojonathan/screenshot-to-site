import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/conta")({
  head: () => ({
    meta: [
      { title: "Minha conta — Tanjiro Puffs" },
      { name: "description", content: "Gerencie seus dados, pedidos e endereços na Tanjiro Puffs." },
      { property: "og:title", content: "Minha conta — Tanjiro Puffs" },
      { property: "og:description", content: "Sua área de cliente." },
    ],
  }),
  component: Layout,
});

const TABS = [
  { to: "/conta" as const, label: "Perfil", exact: true },
  { to: "/conta/pedidos" as const, label: "Pedidos", exact: false },
  { to: "/conta/enderecos" as const, label: "Endereços", exact: true },
];

function Layout() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-4xl font-bold">Minha conta</h1>
      <nav className="mb-8 flex gap-1 border-b">
        {TABS.map((t) => (
          <Link key={t.to} to={t.to} activeOptions={{ exact: t.exact }} className="-mb-px border-b-2 border-transparent px-4 py-2 text-sm text-muted-foreground hover:text-foreground data-[status=active]:border-primary data-[status=active]:text-foreground">
            {t.label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
