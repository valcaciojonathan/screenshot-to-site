import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cart, useCart } from "@/lib/cart";
import { brl, shippingFor, FREE_SHIPPING_FROM } from "@/lib/format";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho — Tanjiro Puffs" },
      { name: "description", content: "Revise os itens do seu carrinho e finalize sua compra na Tanjiro Puffs." },
      { property: "og:title", content: "Carrinho — Tanjiro Puffs" },
      { property: "og:description", content: "Seu carrinho de compras." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, subtotal, count } = useCart();
  const shipping = shippingFor(subtotal);

  if (items.length === 0)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <ShoppingBag className="mx-auto size-14 text-primary" />
        <h1 className="mt-6 text-2xl font-bold">Seu carrinho está vazio</h1>
        <p className="mt-2 text-muted-foreground">Explore o catálogo e encontre seu próximo favorito.</p>
        <Button className="mt-6" asChild><Link to="/produtos">Explorar produtos</Link></Button>
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-8 text-4xl font-bold">Carrinho <span className="text-muted-foreground">({count})</span></h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y rounded-lg border bg-card">
          {items.map((i) => (
            <li key={i.product_id} className="flex gap-4 p-4">
              <Link to="/produto/$id" params={{ id: i.product_id }} className="shrink-0">
                {i.image_url && <img src={i.image_url} alt={i.name} className="size-24 rounded object-cover" />}
              </Link>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex justify-between gap-2">
                  <Link to="/produto/$id" params={{ id: i.product_id }} className="font-semibold hover:text-primary">{i.name}</Link>
                  <Button variant="ghost" size="icon" onClick={() => cart.remove(i.product_id)} aria-label={`Remover ${i.name}`}><Trash2 /></Button>
                </div>
                <span className="text-sm text-muted-foreground">{brl(i.price)} / un.</span>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center rounded-md border">
                    <Button variant="ghost" size="icon" disabled={i.quantity <= 1} onClick={() => cart.setQty(i.product_id, i.quantity - 1)} aria-label="Diminuir"><Minus /></Button>
                    <span className="w-8 text-center">{i.quantity}</span>
                    <Button variant="ghost" size="icon" disabled={i.quantity >= i.stock} onClick={() => cart.setQty(i.product_id, i.quantity + 1)} aria-label="Aumentar"><Plus /></Button>
                  </div>
                  <span className="font-bold">{brl(i.price * i.quantity)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <aside className="h-fit space-y-4 rounded-lg border bg-card p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Resumo</h2>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{brl(subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Frete (estimado)</span><span>{shipping === 0 ? "Grátis" : brl(shipping)}</span></div>
          {shipping > 0 && <p className="text-xs text-muted-foreground">Faltam {brl(FREE_SHIPPING_FROM - subtotal)} para frete grátis.</p>}
          <div className="flex justify-between border-t pt-4 text-lg font-bold"><span>Total</span><span>{brl(subtotal + shipping)}</span></div>
          <p className="text-xs text-muted-foreground">Preços e estoque são confirmados novamente ao finalizar.</p>
          <Button variant="ember" size="lg" className="w-full" asChild><Link to="/checkout">Finalizar compra</Link></Button>
          <Button variant="outline" className="w-full" asChild><Link to="/produtos">Continuar comprando</Link></Button>
        </aside>
      </div>
    </div>
  );
}
