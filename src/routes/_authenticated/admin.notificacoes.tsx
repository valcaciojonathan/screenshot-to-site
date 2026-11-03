import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { dateTimeBR } from "@/lib/format";
import { PageTitle } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/notificacoes")({ component: Notifications });

function Notifications() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "notifications"], queryFn: async () => (await supabase.from("notifications").select("*").eq("for_admin", true).order("created_at", { ascending: false }).limit(100)).data ?? [] });
  const markAll = async () => {
    await supabase.from("notifications").update({ read: true }).eq("for_admin", true).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
  };
  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
      <div>
        <PageTitle title="Notificações"><Button variant="outline" onClick={markAll}>Marcar todas como lidas</Button></PageTitle>
        <ul className="divide-y rounded-lg border bg-card">
          {data?.map((n) => (
            <li key={n.id} className={`flex gap-3 p-4 ${n.read ? "opacity-60" : ""}`}>
              <Bell className={`mt-0.5 size-4 ${n.read ? "text-muted-foreground" : "text-primary"}`} />
              <div className="flex-1"><p className="font-medium">{n.title}</p><p className="text-sm text-muted-foreground">{n.body}</p></div>
              <span className="text-xs text-muted-foreground">{dateTimeBR(n.created_at)}</span>
            </li>
          ))}
          {!data?.length && <li className="p-6 text-muted-foreground">Nenhuma notificação.</li>}
        </ul>
      </div>
      <aside className="space-y-4">
        <h2 className="text-xl font-bold">Configurações</h2>
        <div className="space-y-2 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Avisos dentro do site</p>
          <p>Ativos: novos pedidos, estoque baixo e sem estoque (para a loja); pedido realizado e mudanças de status (para o cliente).</p>
        </div>
        <div className="space-y-2 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Em breve</p>
          <p>E-mail, WhatsApp, pagamentos online (ex.: Mercado Pago), cupons de desconto e favoritos ainda não estão ativos.</p>
        </div>
      </aside>
    </div>
  );
}
