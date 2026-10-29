import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddressFields, addressSchema, type AddressInput } from "@/components/store/AddressFields";
import { ConfirmButton } from "@/components/ConfirmButton";

export const Route = createFileRoute("/_authenticated/conta/enderecos")({
  component: Addresses,
});

const EMPTY: AddressInput = { label: "Casa", recipient: "", zip: "", street: "", number: "", complement: "", district: "", city: "", state: "" };

function Addresses() {
  const { userId } = Route.useRouteContext();
  const qc = useQueryClient();
  const key = ["addresses", userId];
  const { data } = useQuery({ queryKey: key, queryFn: async () => (await supabase.from("addresses").select("*").order("created_at")).data ?? [] });
  const [form, setForm] = useState<AddressInput | null>(null);

  const add = async () => {
    const r = addressSchema.safeParse(form);
    if (!r.success) return toast.error(r.error.issues[0].message);
    const { error } = await supabase.from("addresses").insert({ ...r.data, user_id: userId, is_default: !data?.length });
    if (error) return toast.error(error.message);
    setForm(null);
    qc.invalidateQueries({ queryKey: key });
  };
  const remove = async (id: string) => {
    await supabase.from("addresses").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: key });
  };
  const makeDefault = async (id: string) => {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: key });
  };

  return (
    <div className="space-y-4">
      {data?.map((a) => (
        <div key={a.id} className="flex items-start gap-4 rounded-lg border bg-card p-4">
          <div className="flex-1 text-sm">
            <p className="font-semibold">{a.label} {a.is_default && <Badge variant="muted" className="ml-2">Padrão</Badge>}</p>
            <p className="text-muted-foreground">{a.recipient} · {a.street}, {a.number} {a.complement} · {a.district} · {a.city}/{a.state} · CEP {a.zip}</p>
          </div>
          {!a.is_default && <Button variant="ghost" size="sm" onClick={() => makeDefault(a.id)}>Tornar padrão</Button>}
          <ConfirmButton title="Excluir endereço?" onConfirm={() => remove(a.id)}><Trash2 /></ConfirmButton>
        </div>
      ))}
      {form ? (
        <div className="space-y-4 rounded-lg border bg-card p-6">
          <AddressFields value={form} onChange={setForm} />
          <div className="flex gap-2"><Button onClick={add}>Salvar</Button><Button variant="ghost" onClick={() => setForm(null)}>Cancelar</Button></div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setForm(EMPTY)}><Plus /> Novo endereço</Button>
      )}
    </div>
  );
}
