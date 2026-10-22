import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { brl, effectivePrice } from "@/lib/format";
import { cart } from "@/lib/cart";
import type { Product } from "@/lib/queries";

export function StockBadge({ stock, threshold = 5 }: { stock: number; threshold?: number }) {
  if (stock <= 0) return <Badge variant="destructive">Indisponível</Badge>;
  if (stock <= threshold) return <Badge variant="warning">Últimas {stock} un.</Badge>;
  return <Badge variant="success">Em estoque</Badge>;
}

export function addToCart(p: Product, qty = 1) {
  const ok = cart.add(
    { product_id: p.id, name: p.name, price: effectivePrice(p), image_url: p.image_url, stock: p.stock },
    qty,
  );
  if (ok) toast.success(`${p.name} adicionado ao carrinho`);
  else toast.error("Produto indisponível no momento");
}

export function ProductCard({ p }: { p: Product }) {
  const out = p.stock <= 0;
  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border bg-card card-lift">
      <Link to="/produto/$id" params={{ id: p.id }} className="relative block aspect-square overflow-hidden bg-muted">
        {p.image_url && (
          <img
            src={p.image_url}
            alt={p.name}
            loading="lazy"
            width={600}
            height={600}
            className={`size-full object-cover transition-transform duration-500 group-hover:scale-105 ${out ? "opacity-40 grayscale" : ""}`}
          />
        )}
        {p.promo_price != null && !out && (
          <span className="absolute left-3 top-3 rounded bg-ember px-2 py-0.5 text-xs font-bold text-primary-foreground">
            -{Math.round((1 - Number(p.promo_price) / Number(p.price)) * 100)}%
          </span>
        )}
        <span className="absolute right-3 top-3">
          <StockBadge stock={p.stock} threshold={p.low_stock_threshold} />
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{p.categories?.name ?? "—"}</p>
          <h3 className="mt-1 line-clamp-2 font-display text-base font-semibold">{p.name}</h3>
        </div>
        <div className="mt-auto flex items-baseline gap-2">
          <span className="text-lg font-bold">{brl(effectivePrice(p))}</span>
          {p.promo_price != null && (
            <span className="text-sm text-muted-foreground line-through">{brl(p.price)}</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/produto/$id" params={{ id: p.id }}>Ver detalhes</Link>
          </Button>
          <Button size="sm" disabled={out} onClick={() => addToCart(p)} aria-label={`Adicionar ${p.name} ao carrinho`}>
            <ShoppingCart /> {out ? "Esgotado" : "Adicionar"}
          </Button>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

export function ProductGrid({ products, loading, count = 4 }: { products?: Product[]; loading?: boolean; count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {loading
        ? Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)
        : products?.map((p) => <ProductCard key={p.id} p={p} />)}
    </div>
  );
}
