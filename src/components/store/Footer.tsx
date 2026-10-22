import { Link } from "@tanstack/react-router";
import { Instagram, Mail, MessageCircle, Phone, Youtube } from "lucide-react";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t bg-card">
      <div className="h-1 w-full pattern-ichimatsu" aria-hidden />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4">
        <div className="space-y-4 md:col-span-2">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">
            Eletrônicos selecionados com a determinação de quem nunca desiste. Áudio, wearables e periféricos para o seu dia a dia.
          </p>
          <div className="flex gap-2">
            {[Instagram, Youtube, MessageCircle].map((Icon, i) => (
              <a key={i} href="#" aria-label="Rede social" className="grid size-9 place-items-center rounded-md border hover:border-primary hover:text-primary">
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-widest">Loja</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/produtos" className="hover:text-foreground">Catálogo</Link></li>
            <li><Link to="/carrinho" className="hover:text-foreground">Carrinho</Link></li>
            <li><Link to="/conta/pedidos" className="hover:text-foreground">Meus pedidos</Link></li>
            <li><Link to="/privacidade" className="hover:text-foreground">Política de privacidade</Link></li>
            <li><Link to="/termos" className="hover:text-foreground">Termos de uso</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-widest">Contato</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Mail className="size-4" /> contato@tanjiropuffs.com.br</li>
            <li className="flex items-center gap-2"><Phone className="size-4" /> (11) 90000-0000</li>
            <li>Seg a Sex, 9h às 18h</li>
          </ul>
        </div>
      </div>
      <div className="border-t py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Tanjiro Puffs. Todos os direitos reservados.
      </div>
    </footer>
  );
}
