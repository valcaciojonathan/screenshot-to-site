import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cart, useCart } from "@/lib/cart";
import { productsQuery, errorMessage } from "@/lib/queries";
import { brl, effectivePrice, shippingFor, PAYMENT_METHOD } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressFields, type AddressInput, addressSchema } from "@/components/store/AddressFields";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Tanjiro Puffs" },
      { name: "description", content: "Confirme entrega e pagamento para concluir seu pedido na Tanjiro Puffs." },
      { property: "og:title", content: "Checkout — Tanjiro Puffs" },
      { property: "og:description", content: "Finalize seu pedido." },
    ],
  }),
  component: Checkout,
});

const EMPTY_ADDR: AddressInput = { label: "Casa", recipient: "", zip: "", street: "", number: "", complement: "", district: "", city: "", state: "" };

function Checkout() {
  const { userId } = Route.useRouteContext();
  const navigate = useNavigate();
  const { items } = useCart();
  const { data: products } = useQuery(productsQuery());
  const { data: addresses } = useQuery({
    queryKey: ["addresses", userId],
    queryFn: async () => (await supabase.from("addresses").select("*").order("is_default", { ascending: false })).data ?? [],
  });
  const [addrId, setAddrId] = useState<string>("");
  const [newAddr, setNewAddr] = useState<AddressInput>(EMPTY_ADDR);
  const [save, setSave] = useState(true);
  const [method, setMethod] = useState("pix");
  const [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID());

  const selected = addrId || addresses?.[0]?.id || "new";

  // Refresh prices/stock from the live catalog for display
  const lines = useMemo(
    () =>
      items.map((i) => {
        const p = products?.find((x) => x.id === i.product_id);
        const price = p ? effectivePrice(p) : i.price;
        return { ...i, price, stock: p?.stock ?? i.stock, missing: products ? !p : false };
      }),
    [items, products],
  );
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const shipping = shippingFor(subtotal);
  const problems = lines.filter((l) => l.missing || l.stock < l.quantity);

  const place = async () => {
    if (busy) return;
    let address: AddressInput;
    if (selected === "new") {
      const r = addressSchema.safeParse(newAddr);
      if (!r.success) return toast.error(r.error.issues[0].message);
      address = r.data;
    } else {
      const a = addresses!.find((x) => x.id === selected)!;
      address = { ...a, complement: a.complement ?? "" };
    }
    setBusy(true);
    try {
      if (selected === "new" && save) {
        await supabase.from("addresses").insert({ ...address, user_id: userId, is_default: !addresses?.length });
      }
      const { data, error } = await supabase.rpc("place_order", {
        _items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        _address: address,
        _payment_method: method,
        _idempotency_key: key.current,
      });
      if (error) throw error;
      cart.clear();
      navigate({ to: "/pedido-confirmado/$id", params: { id: data as string }, replace: true });
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(false);
    }
  };

  if (items.length === 0)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Seu carrinho está vazio</h1>
        <Button className="mt-6" asChild><Link to="/produtos">Ver produtos</Link></Button>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 text-4xl font-bold">Checkout</h1>
      <p className="mb-8 flex items-center gap-2 text-sm text-muted-foreground"><Lock className="size-4" /> Ambiente seguro</p>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-lg font-bold">1. Endereço de entrega</h2>
            <RadioGroup value={selected} onValueChange={setAddrId} className="space-y-2">
              {addresses?.map((a) => (
                <Label key={a.id} className="flex cursor-pointer items-start gap-3 rounded-md border p-3 font-normal has-[[data-state=checked]]:border-primary">
                  <RadioGroupItem value={a.id} className="mt-1" />
                  <span className="text-sm"><b>{a.label}</b> — {a.recipient}<br /><span className="text-muted-foreground">{a.street}, {a.number} {a.complement} · {a.district} · {a.city}/{a.state} · CEP {a.zip}</span></span>
                </Label>
              ))}
              <Label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 font-normal has-[[data-state=checked]]:border-primary">
                <RadioGroupItem value="new" /> Novo endereço
              </Label>
            </RadioGroup>
            {selected === "new" && (
              <div className="mt-4 space-y-4">
                <AddressFields value={newAddr} onChange={setNewAddr} />
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={save} onCheckedChange={(c) => setSave(!!c)} /> Salvar endereço na minha conta</label>
              </div>
            )}
          </section>
          <section className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-lg font-bold">2. Pagamento</h2>
            <div className="mb-4 flex gap-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
              <AlertTriangle className="size-5 shrink-0 text-warning" />
              <p><b>Modo demonstração:</b> nenhuma cobrança real é feita. O pedido fica como “Aguardando pagamento” até a confirmação pela loja. A integração com um provedor de pagamento (ex.: Mercado Pago) será adicionada depois.</p>
            </div>
            <RadioGroup value={method} onValueChange={setMethod} className="grid gap-2 sm:grid-cols-3">
              {Object.entries(PAYMENT_METHOD).map(([k, v]) => (
                <Label key={k} className="flex cursor-pointer items-center gap-3 rounded-md border p-3 font-normal has-[[data-state=checked]]:border-primary">
                  <RadioGroupItem value={k} /> {v}
                </Label>
              ))}
            </RadioGroup>
          </section>
        </div>
        <aside className="h-fit space-y-4 rounded-lg border bg-card p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Resumo do pedido</h2>
          <ul className="space-y-3">
            {lines.map((l) => (
              <li key={l.product_id} className="flex gap-3 text-sm">
                {l.image_url && <img src={l.image_url} alt="" className="size-12 rounded object-cover" />}
                <div className="flex-1">
                  <p className="font-medium">{l.name}</p>
                  <p className="text-muted-foreground">{l.quantity} × {brl(l.price)}</p>
                  {(l.missing || l.stock < l.quantity) && <p className="text-xs text-destructive">{l.missing ? "Indisponível" : `Apenas ${l.stock} em estoque`}</p>}
                </div>
                <span className="font-semibold">{brl(l.price * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{brl(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span>{shipping === 0 ? "Grátis" : brl(shipping)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Descontos</span><span>{brl(0)}</span></div>
          </div>
          <div className="flex justify-between border-t pt-4 text-xl font-bold"><span>Total</span><span>{brl(subtotal + shipping)}</span></div>
          {problems.length > 0 && <p className="text-sm text-destructive">Ajuste os itens indisponíveis no carrinho antes de continuar.</p>}
          <Button variant="ember" size="lg" className="w-full" disabled={busy || problems.length > 0} onClick={place}>
            {busy ? "Confirmando…" : "Confirmar pedido"}
          </Button>
          <p className="text-xs text-muted-foreground">Valores, frete e estoque são recalculados pelo servidor ao confirmar.</p>
        </aside>
      </div>
    </div>
  );
}
