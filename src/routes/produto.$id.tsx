import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Minus, PackageX, Plus, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductGrid, StockBadge, addToCart } from "@/components/store/ProductCard";
import { productQuery, productsQuery } from "@/lib/queries";
import { brl, effectivePrice, FREE_SHIPPING_FROM } from "@/lib/format";

export const Route = createFileRoute("/produto/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do produto — Tanjiro Puffs" },
      { name: "description", content: "Veja fotos, preço, disponibilidade e detalhes deste produto na Tanjiro Puffs." },
      { property: "og:title", content: "Produto — Tanjiro Puffs" },
      { property: "og:description", content: "Detalhes do produto na Tanjiro Puffs." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const { data: p, isLoading } = useQuery(productQuery(id));
  const { data: all } = useQuery(productsQuery());
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState<string | null>(null);

  if (isLoading)
    return (
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:grid-cols-2">
        <Skeleton className="aspect-square w-full" />
        <div className="space-y-4"><Skeleton className="h-10 w-3/4" /><Skeleton className="h-6 w-1/3" /><Skeleton className="h-32 w-full" /></div>
      </div>
    );

  if (!p || !p.active)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <PackageX className="mx-auto size-14 text-primary" />
        <h1 className="mt-6 text-2xl font-bold">Produto indisponível</h1>
        <p className="mt-2 text-muted-foreground">Este produto não está mais disponível ou não existe.</p>
        <Button className="mt-6" asChild><Link to="/produtos">Ver catálogo</Link></Button>
      </div>
    );

  const price = effectivePrice(p);
  const out = p.stock <= 0;
  const images = [p.image_url, ...(p.gallery ?? [])].filter(Boolean) as string[];
  const related = all?.filter((x) => x.id !== p.id && x.category_id === p.category_id).slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/produtos" className="hover:text-foreground">Produtos</Link> /{" "}
        {p.categories && <Link to="/produtos" search={{ cat: p.categories.slug }} className="hover:text-foreground">{p.categories.name}</Link>}
      </nav>
      <div className="grid gap-10 md:grid-cols-2">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border bg-card">
            {images[0] && <img src={img ?? images[0]} alt={p.name} width={800} height={800} className={`aspect-square w-full object-cover ${out ? "opacity-50 grayscale" : ""}`} />}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((src) => (
                <button key={src} onClick={() => setImg(src)} className="size-20 overflow-hidden rounded border hover:border-primary">
                  <img src={src} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="animate-rise">
          <p className="text-xs uppercase tracking-widest text-primary">{p.categories?.name}</p>
          <h1 className="mt-2 text-4xl font-bold">{p.name}</h1>
          <div className="mt-4"><StockBadge stock={p.stock} threshold={p.low_stock_threshold} /></div>
          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-4xl font-bold">{brl(price)}</span>
            {p.promo_price != null && <span className="text-lg text-muted-foreground line-through">{brl(p.price)}</span>}
          </div>
          <p className="mt-6 whitespace-pre-line leading-relaxed text-muted-foreground">{p.description}</p>

          {!out && (
            <div className="mt-8 space-y-4 rounded-lg border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Quantidade ({p.stock} disponíveis)</span>
                <div className="flex items-center rounded-md border">
                  <Button variant="ghost" size="icon" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuir"><Minus /></Button>
                  <span className="w-10 text-center font-semibold">{qty}</span>
                  <Button variant="ghost" size="icon" disabled={qty >= p.stock} onClick={() => setQty((q) => Math.min(p.stock, q + 1))} aria-label="Aumentar"><Plus /></Button>
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-xl font-bold">{brl(price * qty)}</span>
              </div>
              <Button variant="ember" size="lg" className="w-full" onClick={() => addToCart(p, qty)}>
                <ShoppingCart /> Adicionar ao carrinho
              </Button>
            </div>
          )}
          {out && <p className="mt-8 rounded-lg border border-destructive/50 p-4 text-sm">Produto esgotado no momento. Volte em breve!</p>}
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><Truck className="size-4 text-primary" /> Frete grátis em compras acima de {brl(FREE_SHIPPING_FROM)}. Envio após aprovação do pagamento.</li>
            <li className="flex gap-2"><ShieldCheck className="size-4 text-primary" /> Garantia de 12 meses contra defeitos de fabricação.</li>
          </ul>
        </div>
      </div>
      {related && related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 text-2xl font-bold">Produtos relacionados</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
