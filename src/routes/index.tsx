import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Flame, ShieldCheck, Truck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/store/ProductCard";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import hero from "/images/hero.jpg?url";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tanjiro Puffs — Seu próximo favorito está aqui" },
      { name: "description", content: "Fones, smartwatches, periféricos gamer e acessórios com estilo e garantia. Compre na Tanjiro Puffs." },
      { property: "og:title", content: "Tanjiro Puffs — Loja de eletrônicos" },
      { property: "og:description", content: "Fones, smartwatches, periféricos gamer e acessórios com estilo e garantia." },
    ],
  }),
  component: Index,
});

function Section({ title, kicker, to, children }: { title: string; kicker: string; to?: { sort?: "recentes" | "vendidos" }; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-20">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">{kicker}</p>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">{title}</h2>
        </div>
        <Link to="/produtos" search={to ?? {}} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          Ver todos <ArrowRight className="size-4" />
        </Link>
      </div>
      {children}
    </section>
  );
}

function Index() {
  const { data: products, isLoading } = useQuery(productsQuery());
  const { data: categories } = useQuery(categoriesQuery());
  const featured = products?.filter((p) => p.featured).slice(0, 4);
  const best = products && [...products].sort((a, b) => b.sold_count - a.sold_count).slice(0, 4);
  const news = products?.slice(0, 4);

  return (
    <>
      <section className="relative isolate overflow-hidden border-b">
        <img src={hero} alt="" width={1920} height={1088} className="absolute inset-0 -z-20 size-full object-cover object-right" />
        <div className="absolute inset-0 -z-10 bg-hero-fade" />
        <div className="mx-auto flex min-h-[78vh] max-w-7xl items-center px-4 py-20">
          <div className="max-w-xl animate-rise">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/50 bg-background/60 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-primary">
              <Flame className="size-3.5" /> Respiração da tecnologia
            </p>
            <h1 className="text-5xl font-bold leading-[1.05] md:text-7xl">
              Seu próximo <span className="text-ember">favorito</span> está aqui.
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground">
              Áudio, wearables e periféricos escolhidos a dedo — com entrega para todo o Brasil.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="ember" size="lg" asChild>
                <Link to="/produtos">Explorar produtos <ArrowRight /></Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/produtos" search={{ promo: true }}>Ver promoções</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-card">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 text-sm sm:grid-cols-3">
          {[
            { icon: Truck, t: "Frete grátis acima de R$ 299" },
            { icon: ShieldCheck, t: "Compra protegida e garantia" },
            { icon: Zap, t: "Envio rápido após aprovação" },
          ].map(({ icon: Icon, t }) => (
            <div key={t} className="flex items-center gap-3 text-muted-foreground">
              <Icon className="size-5 text-primary" /> {t}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16">
        <div className="flex flex-wrap gap-3">
          {categories?.map((c) => (
            <Link key={c.id} to="/produtos" search={{ cat: c.slug }} className="rounded-full border bg-card px-5 py-2.5 text-sm transition-colors hover:border-primary hover:text-primary">
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <Section title="Em destaque" kicker="Escolhidos" >
        <ProductGrid products={featured} loading={isLoading} />
      </Section>
      <Section title="Mais vendidos" kicker="Favoritos da galera" to={{ sort: "vendidos" }}>
        <ProductGrid products={best} loading={isLoading} />
      </Section>
      <Section title="Novidades" kicker="Acabou de chegar" to={{ sort: "recentes" }}>
        <ProductGrid products={news} loading={isLoading} />
      </Section>
    </>
  );
}
